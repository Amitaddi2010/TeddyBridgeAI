from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Avg, Count, Q
from groq import Groq
from django.conf import settings
from .models import User, Doctor, Patient, DoctorReview, DoctorPatientLink
import json

def get_groq_client():
    if settings.GROQ_API_KEY:
        return Groq(api_key=settings.GROQ_API_KEY)
    return None

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def teddy_ai_chat(request):
    """Teddy AI Assistant chat endpoint with full context about TeddyBridge"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Wrap entire function in try-except for better error handling
    try:
        # Allow unauthenticated users (for landing page)
        try:
            is_authenticated = hasattr(request, 'user') and hasattr(request.user, 'is_authenticated') and request.user.is_authenticated
        except Exception as e:
            logger.warning(f"Error checking authentication: {str(e)}")
            is_authenticated = False
        
        # Get message from request body
        try:
            if hasattr(request, 'data'):
                message = request.data.get('message')
            else:
                import json
                body = json.loads(request.body) if request.body else {}
                message = body.get('message')
        except Exception as e:
            logger.error(f"Error parsing request data: {str(e)}")
            return Response({'error': 'Invalid request format'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        groq_client = get_groq_client()
        if not groq_client:
            return Response({'error': 'AI service not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # Build context based on user role
        context_info = ""
        doctor_recommendations = ""
        user_role = "guest"
        
        if is_authenticated:
            try:
                user = request.user
                if not user or not hasattr(user, 'role'):
                    is_authenticated = False
                    user_role = "guest"
                else:
                    user_role = user.role
            except Exception as e:
                logger.error(f"Error accessing user in teddy_ai_chat: {str(e)}")
                is_authenticated = False
                user_role = "guest"
        
        if is_authenticated and user_role in ['patient', 'doctor']:
            if user_role == 'patient':
                try:
                    patient = user.patient_profile
                except Patient.DoesNotExist:
                    patient = Patient.objects.create(user=user)
                
                # Get linked doctors with reviews
                links = DoctorPatientLink.objects.filter(patient=patient).select_related('doctor__user')
                doctor_ids = [link.doctor.id for link in links]
                
                # Get review data for recommendations
                reviews_data = DoctorReview.objects.filter(doctor_id__in=doctor_ids).values('doctor_id').annotate(
                    avg_rating=Avg('rating'),
                    review_count=Count('id')
                )
                reviews_dict = {str(r['doctor_id']): {'avgRating': float(r['avg_rating']) if r['avg_rating'] else None, 'reviewCount': r['review_count']} for r in reviews_data}
                
                # Build doctor recommendations context
                doctors_list = []
                for link in links:
                    doctor_id_str = str(link.doctor.id)
                    review_info = reviews_dict.get(doctor_id_str, {'avgRating': None, 'reviewCount': 0})
                    doctors_list.append({
                        'name': link.doctor.user.name,
                        'specialty': link.doctor.specialty or 'General',
                        'avgRating': review_info['avgRating'],
                        'reviewCount': review_info['reviewCount'],
                        'bio': link.doctor.bio or '',
                    })
                
                if doctors_list:
                    doctor_recommendations = "\n\nAvailable Doctors with Reviews (use these for recommendations):\n"
                    # Sort by rating (highest first)
                    doctors_sorted = sorted(doctors_list, key=lambda x: x['avgRating'] or 0, reverse=True)
                    for doc in doctors_sorted:
                        rating_text = f"{doc['avgRating']:.1f} stars" if doc['avgRating'] else "No ratings yet"
                        review_text = f"{doc['reviewCount']} review{'s' if doc['reviewCount'] != 1 else ''}"
                        doctor_recommendations += f"- **{doc['name']}** ({doc['specialty']}): {rating_text} from {review_text}"
                        if doc['bio']:
                            doctor_recommendations += f"\n  Bio: {doc['bio'][:150]}"
                        doctor_recommendations += "\n"
                    
                    # Add recommendation guidance
                    doctor_recommendations += "\nWhen recommending doctors:\n"
                    doctor_recommendations += "- Prioritize doctors with higher ratings (4+ stars)\n"
                    doctor_recommendations += "- Consider specialty match with patient's medical needs\n"
                    doctor_recommendations += "- Mention review count for credibility\n"
                    doctor_recommendations += "- Encourage patients to read reviews and leave their own after consultations\n"
                
                # Safely handle medical_conditions
                medical_conditions_str = 'None specified'
                if patient.medical_conditions:
                    if isinstance(patient.medical_conditions, list):
                        medical_conditions_str = ', '.join(patient.medical_conditions) if patient.medical_conditions else 'None specified'
                    else:
                        medical_conditions_str = str(patient.medical_conditions)
                
                context_info = f"""
Patient Information:
- Name: {user.name}
- Email: {user.email}
- Linked Doctors: {len(doctors_list)}
- Medical Conditions: {medical_conditions_str}
"""
                
            elif user_role == 'doctor':
                try:
                    doctor = user.doctor_profile
                except Doctor.DoesNotExist:
                    doctor = Doctor.objects.create(user=user)
                
                # Get patient count and stats
                patient_count = DoctorPatientLink.objects.filter(doctor=doctor).count()
                
                # Get review stats
                review_stats = DoctorReview.objects.filter(doctor=doctor).aggregate(
                    avg_rating=Avg('rating'),
                    total_reviews=Count('id')
                )
                
                # Format average rating
                avg_rating_str = f"{review_stats['avg_rating']:.1f}" if review_stats['avg_rating'] is not None else 'N/A'
                
                context_info = f"""
Doctor Information:
- Name: {user.name}
- Email: {user.email}
- Specialty: {doctor.specialty or 'Not specified'}
- License Number: {doctor.license_number or 'Not specified'}
- Total Patients: {patient_count}
- Average Rating: {avg_rating_str} stars
- Total Reviews: {review_stats['total_reviews']}
"""
        else:
            # Guest user (landing page)
            context_info = """
Guest User:
- Not logged in
- Can provide general information about TeddyBridge
- Should encourage registration/login for personalized features
"""
        
        # Build comprehensive system prompt
        system_prompt = f"""You are Teddy, the AI assistant for TeddyBridge - a healthcare platform that connects patients with specialized doctors for joint replacement consultations and PROMS (Patient-Reported Outcome Measures) tracking.

PLATFORM KNOWLEDGE:
- TeddyBridge is a peer-to-peer healthcare platform
- PROMSBridge is the patient-facing side for PROMS tracking
- Doctors can connect with peers for consultations
- Patients can link to doctors via QR codes
- The platform supports automated PROMS assessments (Pre, Post, and follow-up)
- HIPAA-compliant video consultations are available
- Review and recommendation system allows patients to rate doctors

{context_info}

{doctor_recommendations if doctor_recommendations else ''}

CAPABILITIES:
1. For Patients:
   - Help find and recommend doctors based on medical needs and reviews
   - Explain how to link with doctors via QR code
   - Guide on PROMS assessments
   - Answer questions about the platform

2. For Doctors:
   - Help manage patient relationships
   - Explain PROMS monitoring features
   - Guide on peer-to-peer consultations
   - Help understand review feedback

IMPORTANT GUIDELINES:
- Always be helpful, professional, and empathetic
- Use review ratings and feedback when recommending doctors to patients
- When recommending doctors, prioritize those with higher ratings (4+ stars) and more reviews
- Consider specialty match when suggesting doctors
- Encourage patients to read reviews and leave their own after consultations
- Provide accurate information about platform features
- If asked about medical advice, recommend consulting with a doctor
- Be concise but thorough in responses
- For patients: Help them understand how to link with doctors via QR code
- For doctors: Help them understand PROMS monitoring and patient management features

REVIEW SYSTEM:
- Patients can rate doctors from 1-5 stars
- Reviews help other patients make informed decisions
- Doctors can see their average ratings and review counts
- Use review data to provide personalized recommendations

Current user role: {user_role}
"""
        
        try:
            response = groq_client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=1500
            )
            
            ai_response = response.choices[0].message.content
            
            return Response({
                'success': True,
                'response': ai_response,
                'role': user_role
            })
        except Exception as e:
            logger.error(f"Error in Groq API call: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({
                'error': f'Failed to get AI response: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as outer_error:
        # Catch any unexpected errors
        logger.error(f"Unexpected error in teddy_ai_chat: {str(outer_error)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return Response({
            'error': f'An unexpected error occurred: {str(outer_error)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

