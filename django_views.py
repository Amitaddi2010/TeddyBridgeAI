from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.utils import timezone
from groq import Groq
from django.conf import settings
import qrcode
import io
import base64
import secrets
from datetime import timedelta

# Initialize Groq client
def get_groq_client():
    if settings.GROQ_API_KEY:
        return Groq(api_key=settings.GROQ_API_KEY)
    return None

# AUTH VIEWS
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    email = request.data.get('email')
    password = request.data.get('password')
    name = request.data.get('name')
    role = request.data.get('role')
    
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)
    
    user = User.objects.create_user(email=email, password=password, name=name, role=role)
    
    if role == 'doctor':
        Doctor.objects.create(user=user)
    else:
        Patient.objects.create(user=user)
    
    login(request, user)
    return Response({'success': True})

@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    user = authenticate(request, email=email, password=password)
    if user:
        login(request, user)
        return Response({'success': True})
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_logout(request):
    logout(request)
    return Response({'success': True})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    user = request.user
    data = {
        'id': str(user.id),
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'avatar_url': user.avatar_url,
    }
    
    if user.role == 'doctor':
        doctor = user.doctor_profile
        data['doctor'] = {
            'id': str(doctor.id),
            'specialty': doctor.specialty,
            'license_number': doctor.license_number,
            'bio': doctor.bio,
        }
    else:
        patient = user.patient_profile
        data['patient'] = {
            'id': str(patient.id),
            'phone': patient.phone,
            'address': patient.address,
        }
    
    return Response(data)

# QR CODE VIEWS
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_qr(request):
    if request.user.role != 'doctor':
        return Response({'error': 'Only doctors can generate QR codes'}, status=status.HTTP_403_FORBIDDEN)
    
    doctor = request.user.doctor_profile
    token = secrets.token_urlsafe(32)
    expires_at = timezone.now() + timedelta(hours=24)
    
    QRToken.objects.create(doctor=doctor, token=token, expires_at=expires_at)
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    link_url = f"{request.scheme}://{request.get_host()}/link/{token}"
    qr.add_data(link_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_data_url = f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"
    
    return Response({'token': token, 'qrDataUrl': qr_data_url})

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
@permission_classes([IsAuthenticated])
def link_patient(request):
    if request.user.role != 'patient':
        return Response({'error': 'Only patients can link'}, status=status.HTTP_403_FORBIDDEN)
    
    token = request.data.get('token')
    try:
        qr_token = QRToken.objects.get(token=token)
        
        if qr_token.used or qr_token.expires_at < timezone.now():
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
        
        patient = request.user.patient_profile
        
        if DoctorPatientLink.objects.filter(doctor=qr_token.doctor, patient=patient).exists():
            return Response({'error': 'Already linked'}, status=status.HTTP_400_BAD_REQUEST)
        
        DoctorPatientLink.objects.create(doctor=qr_token.doctor, patient=patient, source='qr')
        qr_token.used = True
        qr_token.save()
        
        return Response({'success': True})
    except QRToken.DoesNotExist:
        return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)

# GROQ AI VIEWS
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_call_notes(request):
    if request.user.role != 'doctor':
        return Response({'error': 'Only doctors can generate notes'}, status=status.HTTP_403_FORBIDDEN)
    
    meeting_id = request.data.get('meeting_id')
    transcript = request.data.get('transcript')
    
    try:
        meeting = Meeting.objects.get(id=meeting_id, doctor=request.user.doctor_profile)
    except Meeting.DoesNotExist:
        return Response({'error': 'Meeting not found'}, status=status.HTTP_404_NOT_FOUND)
    
    groq_client = get_groq_client()
    if not groq_client:
        return Response({'error': 'AI service not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    prompt = f"""Analyze this medical consultation transcript and extract structured clinical notes:

Transcript:
{transcript}

Please provide:
1. Chief Complaint
2. History of Present Illness (HPI)
3. Past Medical History
4. Current Medications
5. Allergies
6. Exam Observations
7. Assessment
8. Plan
9. Urgent Flags (if any)
10. Follow-up Questions

Format as JSON."""
    
    try:
        response = groq_client.chat.completions.create(
            model="mixtral-8x7b-32768",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000
        )
        
        ai_response = response.choices[0].message.content
        
        # Parse and save call notes
        CallNote.objects.create(
            meeting=meeting,
            chief_complaint=ai_response,  # Parse JSON properly in production
            ai_metadata={'raw_response': ai_response}
        )
        
        return Response({'success': True, 'notes': ai_response})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# DOCTOR STATS
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def doctor_stats(request):
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    doctor = request.user.doctor_profile
    
    total_patients = DoctorPatientLink.objects.filter(doctor=doctor).count()
    upcoming = Meeting.objects.filter(doctor=doctor, status__in=['scheduled', 'in_progress']).count()
    completed = Meeting.objects.filter(doctor=doctor, status='completed').count()
    pending_notes = Meeting.objects.filter(doctor=doctor, status='completed', transcript_text__isnull=False).exclude(call_notes__isnull=False).count()
    
    return Response({
        'totalPatients': total_patients,
        'upcomingAppointments': upcoming,
        'completedMeetings': completed,
        'pendingNotes': pending_notes,
    })

# PATIENT STATS
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_stats(request):
    if request.user.role != 'patient':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    patient = request.user.patient_profile
    
    total_doctors = DoctorPatientLink.objects.filter(patient=patient).count()
    upcoming = Meeting.objects.filter(patient=patient, status__in=['scheduled', 'in_progress']).count()
    pending_surveys = Survey.objects.filter(doctor__patient_links__patient=patient, is_active=True).exclude(responses__patient=patient).count()
    completed_surveys = SurveyResponse.objects.filter(patient=patient).count()
    
    return Response({
        'totalDoctors': total_doctors,
        'upcomingAppointments': upcoming,
        'pendingSurveys': pending_surveys,
        'completedSurveys': completed_surveys,
    })
