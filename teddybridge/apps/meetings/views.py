from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from groq import Groq
from django.conf import settings
import os
import logging
from teddybridge.apps.core.models import Meeting, Doctor, Patient, RecordingConsent, CallNote
from teddybridge.apps.core.notifications import create_notification
from .twilio_utils import generate_twilio_token

logger = logging.getLogger(__name__)

def get_groq_client():
    if settings.GROQ_API_KEY:
        return Groq(api_key=settings.GROQ_API_KEY)
    return None

@api_view(['POST'])
def create_meeting(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Only doctors can create meetings'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
    except Doctor.DoesNotExist:
        doctor = Doctor.objects.create(user=request.user)
    
    patient_id = request.data.get('patientId')
    title = request.data.get('title', 'Video Consultation')
    scheduled_at = request.data.get('scheduledAt')
    
    if not patient_id:
        return Response({'error': 'Patient ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        patient = Patient.objects.get(id=patient_id)
    except Patient.DoesNotExist:
        return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
    
    meeting = Meeting.objects.create(
        doctor=doctor,
        patient=patient,
        title=title,
        scheduled_at=scheduled_at,
        status='scheduled'
    )
    
    # Create notification for patient
    create_notification(
        user=patient.user,
        notification_type='appointment',
        title='New Appointment Scheduled',
        message=f'Dr. {doctor.user.name} has scheduled an appointment with you for {title}',
        link=f'/patient/appointments'
    )
    
    return Response({
        'id': str(meeting.id),
        'title': meeting.title,
        'scheduledAt': meeting.scheduled_at if isinstance(meeting.scheduled_at, str) else (meeting.scheduled_at.isoformat() if meeting.scheduled_at else None),
        'status': meeting.status,
    })

@api_view(['DELETE'])
def delete_meeting(request, meeting_id):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        meeting = Meeting.objects.get(id=meeting_id)
        
        if request.user.role == 'doctor' and meeting.doctor.user != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        meeting.delete()
        return Response({'success': True})
    except Meeting.DoesNotExist:
        return Response({'error': 'Meeting not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def reschedule_meeting(request, meeting_id):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        meeting = Meeting.objects.get(id=meeting_id)
        
        if request.user.role == 'doctor' and meeting.doctor.user != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        new_scheduled_at = request.data.get('scheduledAt')
        if not new_scheduled_at:
            return Response({'error': 'scheduledAt is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        meeting.scheduled_at = new_scheduled_at
        meeting.status = 'scheduled'
        meeting.save()
        
        # Notify patient about reschedule
        create_notification(
            user=meeting.patient.user,
            notification_type='appointment',
            title='Appointment Rescheduled',
            message=f'Your appointment with Dr. {meeting.doctor.user.name} has been rescheduled',
            link='/patient/appointments'
        )
        
        return Response({
            'success': True,
            'scheduledAt': meeting.scheduled_at.isoformat()
        })
    except Meeting.DoesNotExist:
        return Response({'error': 'Meeting not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def get_meeting(request, meeting_id):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        meeting = Meeting.objects.select_related('doctor__user', 'patient__user').get(id=meeting_id)
        
        consent = RecordingConsent.objects.filter(meeting=meeting, user=request.user).first()
        
        room_name = str(meeting.id)
        token = generate_twilio_token(room_name, request.user.email)
        
        # If Twilio token generation failed, log detailed error
        if not token:
            logger.warning(f"Twilio token generation failed for meeting {meeting.id}, user: {request.user.email}")
            # Return error details in response for debugging
            return Response({
                'id': str(meeting.id),
                'title': meeting.title,
                'doctorName': meeting.doctor.user.name,
                'patientName': meeting.patient.user.name if meeting.patient else None,
                'status': meeting.status,
                'scheduledAt': meeting.scheduled_at.isoformat() if meeting.scheduled_at else None,
                'hasConsented': consent.status == 'granted' if consent else False,
                'isRecording': meeting.status == 'in_progress',
                'twilioToken': None,
                'twilioError': 'Token generation failed. Check server logs and Twilio credentials.',
                'roomName': room_name,
            })
        
        logger.info(f"Twilio token generated successfully for meeting {meeting.id}")
        
        return Response({
            'id': str(meeting.id),
            'title': meeting.title,
            'doctorName': meeting.doctor.user.name,
            'patientName': meeting.patient.user.name if meeting.patient else None,
            'status': meeting.status,
            'scheduledAt': meeting.scheduled_at.isoformat() if meeting.scheduled_at else None,
            'hasConsented': consent.status == 'granted' if consent else False,
            'isRecording': meeting.status == 'in_progress',
            'twilioToken': token,
            'roomName': room_name,
        })
    except Meeting.DoesNotExist:
        return Response({'error': 'Meeting not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def update_consent(request, meeting_id):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    consent_status = request.data.get('status')
    
    try:
        meeting = Meeting.objects.get(id=meeting_id)
        consent, created = RecordingConsent.objects.get_or_create(
            meeting=meeting,
            user=request.user,
            defaults={'status': consent_status}
        )
        
        if not created:
            consent.status = consent_status
            if consent_status == 'granted':
                consent.consented_at = timezone.now()
            consent.save()
        
        return Response({'success': True})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def start_recording(request, meeting_id):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        meeting = Meeting.objects.get(id=meeting_id)
        meeting.status = 'in_progress'
        meeting.started_at = timezone.now()
        meeting.save()
        
        return Response({'success': True})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def upload_recording(request, meeting_id):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        import assemblyai as aai
        
        meeting = Meeting.objects.get(id=meeting_id)
        
        if 'audio' in request.FILES:
            audio_file = request.FILES['audio']
            
            assemblyai_key = os.getenv('ASSEMBLYAI_API_KEY')
            if not assemblyai_key:
                logger.warning("ASSEMBLYAI_API_KEY not configured, skipping transcription")
                meeting.status = 'completed'
                meeting.ended_at = timezone.now()
                meeting.save()
                return Response({'success': True, 'message': 'Recording uploaded but transcription skipped (AssemblyAI not configured)'})
            
            aai.settings.api_key = assemblyai_key
            transcriber = aai.Transcriber()
            
            logger.info("Starting transcription with AssemblyAI...")
            transcript = transcriber.transcribe(audio_file)
            
            if transcript.status == aai.TranscriptStatus.completed:
                logger.info(f"Transcription completed for meeting {meeting_id}, text length: {len(transcript.text)}")
                meeting.transcript_text = transcript.text
                meeting.status = 'transcription_pending'
                meeting.save()
                
                groq_client = get_groq_client()
                if groq_client:
                    prompt = f"""Analyze this medical consultation transcript and extract structured clinical notes:

Transcript:
{transcript.text}

Provide:
1. Chief Complaint
2. History of Present Illness (HPI)
3. Past Medical History
4. Current Medications
5. Allergies
6. Exam Observations
7. Assessment
8. Plan"""
                    
                    response = groq_client.chat.completions.create(
                        model="openai/gpt-oss-120b",
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.3,
                        max_tokens=2000
                    )
                    
                    ai_response = response.choices[0].message.content
                    
                    CallNote.objects.create(
                        meeting=meeting,
                        chief_complaint=ai_response[:500],
                        ai_metadata={'raw_response': ai_response, 'transcript': transcript.text}
                    )
                    
                    # Notify doctor that notes are ready
                    create_notification(
                        user=meeting.doctor.user,
                        notification_type='note',
                        title='AI Notes Ready',
                        message=f'Clinical notes for {meeting.patient.user.name} are ready',
                        link='/doctor/notes'
                    )
                    
                    meeting.status = 'completed'
                else:
                    meeting.status = 'transcription_failed'
            else:
                meeting.status = 'transcription_failed'
        else:
            meeting.status = 'completed'
        
        meeting.ended_at = timezone.now()
        meeting.save()
        
        logger.info(f"Meeting {meeting_id} marked as completed")
        return Response({'success': True})
    except Exception as e:
        logger.error(f'Upload recording error for meeting {meeting_id}: {str(e)}')
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def generate_notes(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
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
    
    prompt = f"""Analyze this medical consultation transcript and extract structured clinical notes. Return the response in valid JSON format with the following structure:

{{
  "chiefComplaint": "...",
  "hpi": "...",
  "pastMedicalHistory": "...",
  "medications": "...",
  "allergies": "...",
  "examObservations": "...",
  "assessment": "...",
  "plan": "...",
  "urgentFlags": [...],
  "followUpQuestions": [...]
}}

IMPORTANT: 
- Use markdown formatting (not HTML) for text fields
- Use **bold** for emphasis, not HTML tags
- Use newlines and markdown lists, not <br> or HTML entities
- Use markdown tables for structured data
- Do NOT use HTML tags like <br>, &nbsp;, etc.

Transcript:
{transcript}

Return ONLY valid JSON, no additional text or markdown code blocks."""
    
    try:
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=3000
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        # Try to parse JSON response
        import json
        import re
        
        # Remove markdown code blocks if present
        ai_response_cleaned = re.sub(r'```json\s*', '', ai_response)
        ai_response_cleaned = re.sub(r'```\s*$', '', ai_response_cleaned).strip()
        
        try:
            notes_data = json.loads(ai_response_cleaned)
            
            # Create CallNote with parsed data
            call_note = CallNote.objects.create(
                meeting=meeting,
                chief_complaint=notes_data.get('chiefComplaint', ''),
                hpi=notes_data.get('hpi', ''),
                past_medical_history=notes_data.get('pastMedicalHistory', ''),
                medications=notes_data.get('medications', ''),
                allergies=notes_data.get('allergies', ''),
                exam_observations=notes_data.get('examObservations', ''),
                assessment=notes_data.get('assessment', ''),
                plan=notes_data.get('plan', ''),
                urgent_flags=notes_data.get('urgentFlags', []),
                follow_up_questions=notes_data.get('followUpQuestions', []),
                ai_metadata={'raw_response': ai_response, 'parsed': True}
            )
            
            return Response({
                'success': True,
                'noteId': str(call_note.id),
                'notes': {
                    'chiefComplaint': call_note.chief_complaint,
                    'hpi': call_note.hpi,
                    'pastMedicalHistory': call_note.past_medical_history,
                    'medications': call_note.medications,
                    'allergies': call_note.allergies,
                    'examObservations': call_note.exam_observations,
                    'assessment': call_note.assessment,
                    'plan': call_note.plan,
                    'urgentFlags': call_note.urgent_flags,
                    'followUpQuestions': call_note.follow_up_questions,
                }
            })
        except json.JSONDecodeError:
            # If JSON parsing fails, store as raw text in chief_complaint
            CallNote.objects.create(
                meeting=meeting,
                chief_complaint=ai_response[:1000],  # Store more characters
                ai_metadata={'raw_response': ai_response, 'parsed': False}
            )
            
            return Response({
                'success': True,
                'notes': {'raw': ai_response},
                'warning': 'Note stored as raw text - JSON parsing failed'
            })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
