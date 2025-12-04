from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from .models import User, Doctor, Patient, QRToken, DoctorPatientLink, Notification

# Firebase imports (optional)
try:
    from .firebase_auth import verify_firebase_token, get_user_from_token
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    import logging
    logger = logging.getLogger(__name__)
    logger.warning("Firebase authentication not available. Install firebase-admin package.")

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def register(request):
    # Check if Firebase token is provided
    auth_header = request.headers.get('Authorization', '')
    firebase_token = None
    firebase_uid = None
    
    if auth_header.startswith('Bearer '):
        firebase_token = auth_header.split('Bearer ')[1]
        if FIREBASE_AVAILABLE:
            firebase_user = get_user_from_token(firebase_token)
            if firebase_user:
                firebase_uid = firebase_user.get('firebase_uid')
                # Use Firebase email and name if available
                email = request.data.get('email') or firebase_user.get('email')
                name = request.data.get('name') or firebase_user.get('name')
                password = request.data.get('password') or 'firebase_auth'  # Dummy password for Firebase users
    
    email = request.data.get('email')
    password = request.data.get('password')
    name = request.data.get('name')
    role = request.data.get('role')
    username = request.data.get('username', '').strip() or None
    
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create user with username if provided
    user = User.objects.create_user(email=email, password=password, name=name, role=role, username=username)
    
    # Store Firebase UID if provided (for Google-signup users)
    if firebase_uid:
        user.firebase_uid = firebase_uid
        # Google-signup users have unusable password by default
        if not password or password == 'firebase_auth':
            user.set_unusable_password()
        user.save()
    
    if role == 'doctor':
        # Doctor-specific fields
        specialty = request.data.get('specialty', '').strip() or None
        city = request.data.get('city', '').strip() or None
        Doctor.objects.create(
            user=user,
            specialty=specialty,
            city=city
        )
    else:
        # Patient-specific fields
        gender = request.data.get('gender', '').strip() or None
        age_str = request.data.get('age', '').strip()
        age = int(age_str) if age_str and age_str.isdigit() else None
        procedure = request.data.get('procedure', '').strip() or None
        connect_to_peers = request.data.get('connectToPeers', False) or request.data.get('connect_to_peers', False)
        
        Patient.objects.create(
            user=user,
            gender=gender,
            age=age,
            procedure=procedure,
            connect_to_peers=bool(connect_to_peers)
        )
    
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    request.session.save()
    
    return Response({
        'success': True,
        'user': {
            'id': str(user.id),
            'email': user.email,
            'name': user.name,
            'username': user.username,
            'role': user.role,
        }
    })

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def user_login(request):
    import logging
    logger = logging.getLogger(__name__)
    
    # Check if Firebase token is provided (for Firebase authentication)
    auth_header = request.headers.get('Authorization', '')
    firebase_token = None
    
    if auth_header.startswith('Bearer '):
        firebase_token = auth_header.split('Bearer ')[1]
        if FIREBASE_AVAILABLE:
            firebase_user = get_user_from_token(firebase_token)
            if firebase_user:
                email = firebase_user.get('email')
                try:
                    user = User.objects.get(email=email)
                    # Login the user with Django session
                    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                    request.session.save()
                    return Response({
                        'success': True,
                        'user': {
                            'id': str(user.id),
                            'email': user.email,
                            'name': user.name,
                            'role': user.role,
                        }
                    })
                except User.DoesNotExist:
                    return Response({'error': 'User not found. Please register first.'}, status=status.HTTP_404_NOT_FOUND)
    
    # Email/password authentication
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
        
        # Check if user was created with Google (has firebase_uid)
        # Google users have firebase_uid set and typically don't have a usable password
        if user.firebase_uid:
            # Check if password is valid
            if not user.has_usable_password() or not user.check_password(password):
                return Response({
                    'error': 'GOOGLE_SIGNUP_REQUIRED',
                    'message': 'This account was created using Google Sign-In. Please continue with Google or create a password using Forgot Password.'
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Verify password for all users
        if not user.check_password(password):
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if user is active
        if not user.is_active:
            return Response({'error': 'Account is disabled'}, status=status.HTTP_403_FORBIDDEN)
        
        # Login the user with Django session
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        request.session.save()
        
        return Response({
            'success': True,
            'user': {
                'id': str(user.id),
                'email': user.email,
                'name': user.name,
                'role': user.role,
            }
        })
    except User.DoesNotExist:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def google_auth(request):
    """Handle Google Sign-In via Firebase"""
    import logging
    logger = logging.getLogger(__name__)
    
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        logger.warning("Google auth called without Bearer token")
        return Response({'error': 'Firebase token required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not FIREBASE_AVAILABLE:
        logger.error("Firebase authentication not available - module not imported")
        return Response({
            'error': 'Firebase authentication not configured',
            'message': 'Firebase Admin SDK is not installed. Please install firebase-admin package.'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    # Check if Firebase is actually initialized
    try:
        from .firebase_auth import initialize_firebase
        firebase_app = initialize_firebase()
        if not firebase_app or firebase_app is False:
            logger.error("Firebase Admin SDK initialization failed - credentials not configured")
            return Response({
                'error': 'Firebase authentication not configured',
                'message': 'Firebase credentials not found. Please set FIREBASE_CREDENTIALS_JSON environment variable.'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        logger.error(f"Error checking Firebase initialization: {str(e)}")
        return Response({
            'error': 'Firebase authentication error',
            'message': f'Firebase initialization error: {str(e)}'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    firebase_token = auth_header.split('Bearer ')[1]
    logger.info(f"Attempting to verify Firebase token (length: {len(firebase_token)})")
    
    firebase_user = get_user_from_token(firebase_token)
    
    if not firebase_user:
        logger.error("Firebase token verification failed - user data is None")
        return Response({
            'error': 'Invalid Firebase token',
            'message': 'Token verification failed. Please try signing in again.'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    logger.info(f"Firebase user verified: {firebase_user.get('email', 'unknown')}")
    
    email = firebase_user.get('email')
    name = request.data.get('name') or firebase_user.get('name')
    role = request.data.get('role', 'patient')
    firebase_uid = firebase_user.get('firebase_uid') or firebase_user.get('uid')
    photo_url = request.data.get('photoUrl') or firebase_user.get('picture')
    
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user exists
    try:
        user = User.objects.get(email=email)
        # Update user info if needed
        if name and not user.name:
            user.name = name
        # Update Firebase UID if not set
        if firebase_uid and not user.firebase_uid:
            user.firebase_uid = firebase_uid
            # If password is unusable, keep it that way
            if not user.has_usable_password():
                user.set_unusable_password()
        if name or firebase_uid:
            user.save()
        
        # User exists, login them
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        request.session.save()
        
        return Response({
            'success': True,
            'isNewUser': False,
            'user': {
                'id': str(user.id),
                'email': user.email,
                'name': user.name,
                'role': user.role,
            }
        })
    except User.DoesNotExist:
        # New user - check if role is provided
        if not role:
            # Return error indicating user needs to select role
            return Response({
                'success': False,
                'isNewUser': True,
                'requiresRoleSelection': True,
                'email': email,
                'name': name,
                'photoUrl': photo_url,
                'message': 'Please select your role (Patient or Doctor) to continue'
            }, status=status.HTTP_200_OK)  # Use 200 to allow frontend to handle gracefully
        
        # Create new user with provided role
        username = request.data.get('username', '').strip() or None
        user = User.objects.create_user(
            email=email,
            password='firebase_auth',  # Dummy password, won't be used
            name=name,
            role=role,
            username=username
        )
        
        # Create profile based on role
        if role == 'doctor':
            specialty = request.data.get('specialty', '').strip() or None
            city = request.data.get('city', '').strip() or None
            Doctor.objects.create(user=user, specialty=specialty, city=city)
        else:
            gender = request.data.get('gender', '').strip() or None
            age_str = request.data.get('age', '').strip()
            age = int(age_str) if age_str and age_str.isdigit() else None
            procedure = request.data.get('procedure', '').strip() or None
            connect_to_peers = request.data.get('connectToPeers', False)
            Patient.objects.create(
                user=user,
                gender=gender,
                age=age,
                procedure=procedure,
                connect_to_peers=bool(connect_to_peers)
            )
        
        # Login the user
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        request.session.save()
        
        return Response({
            'success': True,
            'isNewUser': True,
            'user': {
                'id': str(user.id),
                'email': user.email,
                'name': user.name,
                'role': user.role,
            }
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_logout(request):
    logout(request)
    return Response({'success': True})

@api_view(['GET'])
@permission_classes([AllowAny])
def get_current_user(request):
    import logging
    logger = logging.getLogger(__name__)
    
    # Check if Firebase token is provided (for Firebase authentication)
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        firebase_token = auth_header.split('Bearer ')[1]
        if FIREBASE_AVAILABLE:
            firebase_user = get_user_from_token(firebase_token)
            if firebase_user:
                email = firebase_user.get('email')
                try:
                    user = User.objects.get(email=email)
                    # Create session for the user
                    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                    request.session.save()
                    # Continue to return user data below
                except User.DoesNotExist:
                    # User doesn't exist in Django yet - return 401 to trigger registration
                    return Response({'error': 'User not found. Please register first.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Check Django session authentication
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        user = request.user
        
        # Basic user data - ensure all fields are safely accessed
        try:
            data = {
                'id': str(user.id),
                'email': user.email or '',
                'name': getattr(user, 'name', '') or '',
                'username': getattr(user, 'username', None) or None,
                'role': getattr(user, 'role', '') or '',
                'avatarUrl': getattr(user, 'avatar_url', None) or None,
            }
            
            # Check profile completeness
            is_profile_complete = True
            missing_fields = []
            
            if user.role == 'doctor':
                try:
                    doctor = user.doctor_profile
                    if not doctor.specialty:
                        is_profile_complete = False
                        missing_fields.append('specialty')
                    if not doctor.city:
                        is_profile_complete = False
                        missing_fields.append('city')
                except Doctor.DoesNotExist:
                    is_profile_complete = False
                    missing_fields.extend(['specialty', 'city'])
            elif user.role == 'patient':
                try:
                    patient = user.patient_profile
                    if not patient.gender:
                        is_profile_complete = False
                        missing_fields.append('gender')
                    if not patient.age:
                        is_profile_complete = False
                        missing_fields.append('age')
                except Patient.DoesNotExist:
                    is_profile_complete = False
                    missing_fields.extend(['gender', 'age'])
            
            data['isProfileComplete'] = is_profile_complete
            data['missingFields'] = missing_fields if not is_profile_complete else []
        except Exception as e:
            logger.error(f"Error accessing basic user fields for user {user.id}: {str(e)}")
            return Response({
                'error': 'Error accessing user data',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Safely get doctor or patient profile
        # OneToOneField raises DoesNotExist when accessed and doesn't exist
        if user.role == 'doctor':
            try:
                doctor = user.doctor_profile
                data['doctor'] = {
                    'id': str(doctor.id),
                    'specialty': getattr(doctor, 'specialty', None) or None,
                    'city': getattr(doctor, 'city', None) or None,
                    'licenseNumber': getattr(doctor, 'license_number', None) or None,
                    'bio': getattr(doctor, 'bio', None) or None,
                }
            except Doctor.DoesNotExist:
                # Create doctor profile if it doesn't exist
                try:
                    doctor = Doctor.objects.create(user=user)
                    data['doctor'] = {
                        'id': str(doctor.id),
                        'specialty': None,
                        'licenseNumber': None,
                        'bio': None,
                    }
                except Exception as create_error:
                    # If creation fails, log and continue without profile data
                    logger.error(f"Failed to create doctor profile for user {user.id}: {str(create_error)}")
                    # Return data without doctor profile
            except Exception as e:
                # Log other errors but don't fail the request
                logger.warning(f"Error fetching doctor profile for user {user.id}: {str(e)}")
                # Return data without doctor profile
        elif user.role == 'patient':
            try:
                patient = user.patient_profile
                # Safely get medical_conditions - handle both list and None
                medical_conditions = getattr(patient, 'medical_conditions', None)
                if medical_conditions is None:
                    medical_conditions = []
                elif not isinstance(medical_conditions, list):
                    medical_conditions = list(medical_conditions) if medical_conditions else []
                
                data['patient'] = {
                    'id': str(patient.id),
                    'gender': getattr(patient, 'gender', None) or None,
                    'age': getattr(patient, 'age', None),
                    'procedure': getattr(patient, 'procedure', None) or None,
                    'connectToPeers': getattr(patient, 'connect_to_peers', False),
                    'phone': getattr(patient, 'phone', None) or None,
                    'address': getattr(patient, 'address', None) or None,
                    'medicalConditions': medical_conditions,
                }
            except Patient.DoesNotExist:
                # Create patient profile if it doesn't exist
                try:
                    patient = Patient.objects.create(user=user)
                    data['patient'] = {
                        'id': str(patient.id),
                        'phone': None,
                        'address': None,
                        'medicalConditions': [],
                    }
                except Exception as create_error:
                    # If creation fails, log and continue without profile data
                    logger.error(f"Failed to create patient profile for user {user.id}: {str(create_error)}")
                    # Return data without patient profile
            except Exception as e:
                # Log other errors but don't fail the request
                logger.warning(f"Error fetching patient profile for user {user.id}: {str(e)}")
                # Return data without patient profile
        
        return Response(data)
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        error_msg = str(e)
        error_trace = traceback.format_exc()
        logger.error(f"Error in get_current_user for user {getattr(request.user, 'id', 'unknown')}: {error_msg}\n{error_trace}")
        
        # Return minimal user data even on error to prevent frontend crashes
        try:
            user = request.user
            minimal_data = {
                'id': str(user.id),
                'email': getattr(user, 'email', '') or '',
                'name': getattr(user, 'name', '') or '',
                'role': getattr(user, 'role', '') or '',
                'avatarUrl': None,
                'error': 'Profile data unavailable'
            }
            return Response(minimal_data)
        except Exception as fallback_error:
            logger.error(f"Failed to return minimal user data: {str(fallback_error)}")
            return Response({
                'error': 'Failed to get user data',
                'details': error_msg
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def verify_qr_token(request, token):
    try:
        qr_token = QRToken.objects.select_related('doctor__user').get(token=token)
        
        if qr_token.used or qr_token.expires_at < timezone.now():
            return Response({
                'valid': False,
                'expired': qr_token.expires_at < timezone.now(),
                'used': qr_token.used
            })
        
        return Response({
            'valid': True,
            'expired': False,
            'used': False,
            'doctor': {
                'id': str(qr_token.doctor.id),
                'name': qr_token.doctor.user.name,
                'specialty': qr_token.doctor.specialty,
                'avatar': qr_token.doctor.user.avatar_url,
            }
        })
    except QRToken.DoesNotExist:
        return Response({'valid': False, 'expired': False, 'used': False})

@api_view(['POST'])
def link_patient(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'patient':
        return Response({'error': 'Only patients can link'}, status=status.HTTP_403_FORBIDDEN)
    
    token = request.data.get('token')
    try:
        qr_token = QRToken.objects.get(token=token)
        
        if qr_token.used or qr_token.expires_at < timezone.now():
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create patient profile (ensure it exists)
        try:
            patient = request.user.patient_profile
        except Patient.DoesNotExist:
            patient = Patient.objects.create(user=request.user)
        
        if DoctorPatientLink.objects.filter(doctor=qr_token.doctor, patient=patient).exists():
            return Response({'error': 'Already linked'}, status=status.HTTP_400_BAD_REQUEST)
        
        DoctorPatientLink.objects.create(doctor=qr_token.doctor, patient=patient, source='qr')
        qr_token.used = True
        qr_token.save()
        
        return Response({'success': True})
    except QRToken.DoesNotExist:
        return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in link_patient: {str(e)}", exc_info=True)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def upload_avatar(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if 'avatar' not in request.FILES:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    avatar_file = request.FILES['avatar']
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if avatar_file.content_type not in allowed_types:
        return Response({'error': 'Invalid file type'}, status=status.HTTP_400_BAD_REQUEST)
    
    if avatar_file.size > 5 * 1024 * 1024:
        return Response({'error': 'File too large'}, status=status.HTTP_400_BAD_REQUEST)
    
    import os
    from django.conf import settings
    
    avatars_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
    os.makedirs(avatars_dir, exist_ok=True)
    
    ext = os.path.splitext(avatar_file.name)[1]
    filename = f"{request.user.id}{ext}"
    filepath = os.path.join(avatars_dir, filename)
    
    if request.user.avatar_url:
        old_path = request.user.avatar_url.replace(settings.MEDIA_URL, '').replace('http://localhost:5173/', '')
        old_file = os.path.join(settings.MEDIA_ROOT, old_path)
        if os.path.exists(old_file):
            os.remove(old_file)
    
    with open(filepath, 'wb+') as destination:
        for chunk in avatar_file.chunks():
            destination.write(chunk)
    
    # Use environment variable for API base URL, fallback to request host
    api_base_url = os.getenv('API_BASE_URL', '')
    if not api_base_url:
        # Try to get from request
        scheme = 'https' if request.is_secure() else 'http'
        host = request.get_host()
        api_base_url = f"{scheme}://{host}"
    
    avatar_url = f"{api_base_url}{settings.MEDIA_URL}avatars/{filename}"
    request.user.avatar_url = avatar_url
    request.user.save()
    
    return Response({'success': True, 'avatarUrl': avatar_url})

@api_view(['PATCH'])
def update_profile(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    import logging
    logger = logging.getLogger(__name__)
    
    user = request.user
    
    # Update user fields
    if 'name' in request.data:
        user.name = request.data['name']
    if 'username' in request.data:
        user.username = request.data['username'] or None
    if 'avatar_url' in request.data:
        user.avatar_url = request.data['avatar_url']
    user.save()
    
    try:
        if user.role == 'doctor':
            doctor = user.doctor_profile
            if 'specialty' in request.data:
                doctor.specialty = request.data['specialty'] or None
            if 'city' in request.data:
                doctor.city = request.data['city'] or None
            if 'licenseNumber' in request.data:
                doctor.license_number = request.data['licenseNumber'] or None
            if 'bio' in request.data:
                doctor.bio = request.data['bio'] or None
            doctor.save()
        elif user.role == 'patient':
            patient = user.patient_profile
            if 'gender' in request.data:
                patient.gender = request.data['gender'] or None
            if 'age' in request.data:
                age_str = request.data['age']
                if age_str:
                    try:
                        patient.age = int(age_str) if age_str else None
                    except (ValueError, TypeError):
                        patient.age = None
                else:
                    patient.age = None
            if 'procedure' in request.data:
                patient.procedure = request.data['procedure'] or None
            if 'connectToPeers' in request.data:
                patient.connect_to_peers = bool(request.data['connectToPeers'])
            if 'phone' in request.data:
                patient.phone = request.data['phone'] or None
            if 'address' in request.data:
                patient.address = request.data['address'] or None
            if 'medicalConditions' in request.data:
                patient.medical_conditions = request.data['medicalConditions']
            patient.save()
    except Exception as e:
        logger.error(f"Error updating profile for user {user.id}: {str(e)}")
        return Response({'error': f'Failed to update profile: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({'success': True})

@api_view(['GET', 'PATCH'])
def notifications_settings(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    user = request.user
    
    if request.method == 'GET':
        return Response({
            'emailAppointments': user.email_appointments,
            'emailNotes': user.email_notes,
            'emailSurveys': user.email_surveys,
        })
    
    if 'emailAppointments' in request.data:
        user.email_appointments = request.data['emailAppointments']
    if 'emailNotes' in request.data:
        user.email_notes = request.data['emailNotes']
    if 'emailSurveys' in request.data:
        user.email_surveys = request.data['emailSurveys']
    user.save()
    
    return Response({'success': True})

@api_view(['POST'])
def change_password(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    current_password = request.data.get('currentPassword')
    new_password = request.data.get('newPassword')
    
    if not request.user.check_password(current_password):
        return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
    
    request.user.set_password(new_password)
    request.user.save()
    
    return Response({'success': True})

@api_view(['DELETE'])
def delete_account(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    password = request.data.get('password')
    
    if not request.user.check_password(password):
        return Response({'error': 'Password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
    
    request.user.delete()
    logout(request)
    
    return Response({'success': True})

@api_view(['GET'])
def get_notifications(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    notifications = Notification.objects.filter(user=request.user)[:20]
    unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
    
    # Fix old notification links that point to /peer-network incorrectly
    # For "New Message" notifications, set correct link based on user role
    result_notifications = []
    for n in notifications:
        notification_link = n.link
        
        # Fix old "New Message" notifications that incorrectly link to /peer-network
        # This handles notifications created before the fix was implemented
        if (n.type == 'general' and 
            n.title == 'New Message' and 
            notification_link == '/peer-network' and
            request.user.role in ['patient', 'doctor']):
            # Determine correct link based on user's role
            if request.user.role == 'patient':
                notification_link = '/patient/doctors'
            elif request.user.role == 'doctor':
                notification_link = '/doctor/patients'
            
            # Update the database record to fix it permanently
            if notification_link != n.link:
                n.link = notification_link
                n.save(update_fields=['link'])
        
        result_notifications.append({
            'id': str(n.id),
            'type': n.type,
            'title': n.title,
            'message': n.message,
            'link': notification_link,
            'isRead': n.is_read,
            'createdAt': n.created_at.isoformat(),
        })
    
    return Response({
        'notifications': result_notifications,
        'unreadCount': unread_count,
    })

@api_view(['POST'])
def mark_notification_read(request, notification_id):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        notification = Notification.objects.get(id=notification_id, user=request.user)
        notification.is_read = True
        notification.save()
        return Response({'success': True})
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def mark_all_notifications_read(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'success': True})

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint for monitoring"""
    return Response({
        'status': 'healthy',
        'service': 'TeddyBridge API',
        'version': '1.0.0'
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def api_info(request):
    """Root endpoint that provides API information"""
    return Response({
        'name': 'TeddyBridge API',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': {
            'auth': '/api/auth/',
            'admin': '/admin/',
            'health': '/api/health',
            'docs': 'See /api/auth/ for authentication endpoints'
        },
        'message': 'Welcome to TeddyBridge API. Use /api/auth/ endpoints for authentication.'
    })
