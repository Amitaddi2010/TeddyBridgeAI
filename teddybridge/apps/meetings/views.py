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
    
    # Only doctors can create meetings
    if request.user.role != 'doctor':
        return Response({'error': 'Only doctors can create meetings'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
        patient_id = request.data.get('patientId')
        if not patient_id:
            return Response({'error': 'Patient ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            patient = Patient.objects.get(id=patient_id)
        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
    except Doctor.DoesNotExist:
        # Create doctor profile if it doesn't exist
        doctor = Doctor.objects.create(user=request.user)
    
    title = request.data.get('title', 'Video Consultation')
    scheduled_at = request.data.get('scheduledAt')
    is_immediate = request.data.get('isImmediate', False)
    
    # If immediate call, set status to 'in_progress' and no scheduled time
    if is_immediate:
        scheduled_at = None
        status = 'in_progress'
    else:
        status = 'scheduled'
    
    meeting = Meeting.objects.create(
        doctor=doctor,
        patient=patient,
        title=title,
        scheduled_at=scheduled_at,
        status=status
    )
    
    # Create notification for the other party
    if request.user.role == 'doctor':
        notification_user = patient.user
        notification_message = f'Dr. {doctor.user.name} is calling you. Click to join the video call.'
        notification_link = f'/meeting/{meeting.id}'
    else:
        notification_user = doctor.user
        notification_message = f'{patient.user.name} is calling you. Click to join the video call.'
        notification_link = f'/meeting/{meeting.id}'
    
    create_notification(
        user=notification_user,
        notification_type='appointment' if not is_immediate else 'call',
        title='Incoming Call' if is_immediate else 'New Appointment Scheduled',
        message=notification_message,
        link=notification_link
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
        
        # Determine meeting type: patient-doctor or doctor-doctor
        meeting_type = 'doctor-doctor' if meeting.patient is None else 'patient-doctor'
        # Recording enabled for all meetings to support AI note generation
        # For patient-doctor meetings, recording is still enabled but patient doesn't see the button
        recording_enabled = True
        
        # If Twilio token generation failed, log detailed error
        if not token:
            logger.warning(f"Twilio token generation failed for meeting {meeting.id}, user: {request.user.email}")
            # Return error details in response for debugging
            return Response({
                'id': str(meeting.id),
                'title': meeting.title,
                'doctorName': meeting.doctor.user.name,
                'patientName': meeting.patient.user.name if meeting.patient else None,
                'participantDoctorName': None,
                'status': meeting.status,
                'scheduledAt': meeting.scheduled_at.isoformat() if meeting.scheduled_at else None,
                'hasConsented': consent.status == 'granted' if consent else False,
                'isRecording': meeting.status == 'in_progress',
                'twilioToken': None,
                'twilioError': 'Token generation failed. Check server logs and Twilio credentials.',
                'roomName': room_name,
                'meetingType': meeting_type,
                'recordingEnabled': recording_enabled,
            })
        
        logger.info(f"Twilio token generated successfully for meeting {meeting.id}")
        
        # Determine meeting type: patient-doctor or doctor-doctor
        meeting_type = 'doctor-doctor' if meeting.patient is None else 'patient-doctor'
        # Recording enabled for all meetings to support AI note generation
        # For patient-doctor meetings, recording is still enabled but patient doesn't see the button
        recording_enabled = True
        
        return Response({
            'id': str(meeting.id),
            'title': meeting.title,
            'doctorName': meeting.doctor.user.name,
            'patientName': meeting.patient.user.name if meeting.patient else None,
            'participantDoctorName': None,  # Can be enhanced later if we add participantDoctor field
            'status': meeting.status,
            'scheduledAt': meeting.scheduled_at.isoformat() if meeting.scheduled_at else None,
            'hasConsented': consent.status == 'granted' if consent else False,
            'isRecording': meeting.status == 'in_progress',
            'twilioToken': token,
            'roomName': room_name,
            'meetingType': meeting_type,
            'recordingEnabled': recording_enabled,
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
def participant_event(request, meeting_id):
    """Handle participant join/leave events and send notifications"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        meeting = Meeting.objects.select_related('doctor__user', 'patient__user').get(id=meeting_id)
        event = request.data.get('event')  # 'joined' or 'left'
        participant_name = request.data.get('participantName', request.user.name)
        
        # Determine the other party
        if request.user.role == 'doctor':
            other_user = meeting.patient.user
            other_name = meeting.patient.user.name
        else:
            other_user = meeting.doctor.user
            other_name = f"Dr. {meeting.doctor.user.name}"
        
        # Create notification for the other party
        if event == 'joined':
            create_notification(
                user=other_user,
                notification_type='call',
                title='Participant Joined',
                message=f'{participant_name} has joined the call.',
                link=f'/meeting/{meeting.id}'
            )
        elif event == 'left':
            create_notification(
                user=other_user,
                notification_type='call',
                title='Participant Left',
                message=f'{participant_name} has left the call.',
                link=f'/meeting/{meeting.id}'
            )
        
        return Response({'success': True})
    except Meeting.DoesNotExist:
        return Response({'error': 'Meeting not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in participant_event: {str(e)}")
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
        
        # Check for both 'audio' and 'recording' field names
        audio_file = None
        if 'audio' in request.FILES:
            audio_file = request.FILES['audio']
        elif 'recording' in request.FILES:
            audio_file = request.FILES['recording']
        
        if audio_file:
            
            assemblyai_key = os.getenv('ASSEMBLYAI_API_KEY')
            if not assemblyai_key:
                logger.warning("ASSEMBLYAI_API_KEY not configured, skipping transcription")
                meeting.status = 'completed'
                meeting.ended_at = timezone.now()
                meeting.save()
                return Response({'success': True, 'message': 'Recording uploaded but transcription skipped (AssemblyAI not configured)'})
            
            aai.settings.api_key = assemblyai_key
            transcriber = aai.Transcriber()
            
            logger.info(f"Starting transcription with AssemblyAI for meeting {meeting_id}, file size: {audio_file.size} bytes")
            
            try:
                # Configure transcription with speaker diarization to distinguish doctor and patient
                # This is CRITICAL for accurate AI notes - we need to know who said what
                config = aai.TranscriptionConfig(
                    speaker_labels=True,  # Enable speaker diarization
                    speakers_expected=2,  # Expect 2 speakers (doctor and patient)
                    language_code="en"  # English language
                )
                
                # Start transcription with speaker diarization (this is async)
                transcript = transcriber.transcribe(audio_file, config=config)
                logger.info(f"Transcription started with speaker diarization, ID: {transcript.id}, status: {transcript.status}")
                
                # Wait for transcription to complete (poll every 2 seconds, max 5 minutes)
                import time
                max_wait_time = 300  # 5 minutes
                wait_interval = 2  # 2 seconds
                elapsed_time = 0
                
                while transcript.status in [aai.TranscriptStatus.queued, aai.TranscriptStatus.processing]:
                    if elapsed_time >= max_wait_time:
                        logger.error(f"Transcription timeout for meeting {meeting_id} after {elapsed_time} seconds")
                        meeting.status = 'transcription_failed'
                        meeting.save()
                        return Response({'success': False, 'error': 'Transcription timeout'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                    time.sleep(wait_interval)
                    elapsed_time += wait_interval
                    transcript = transcriber.get_transcript(transcript.id)
                    logger.info(f"Transcription status: {transcript.status}, elapsed: {elapsed_time}s")
                
                if transcript.status == aai.TranscriptStatus.completed:
                    logger.info(f"Transcription completed for meeting {meeting_id}, text length: {len(transcript.text)}")
                    
                    # Format transcript with speaker labels for better AI understanding
                    # AssemblyAI provides utterances with speaker labels when diarization is enabled
                    formatted_transcript = transcript.text
                    if hasattr(transcript, 'utterances') and transcript.utterances:
                        # Build a formatted transcript with speaker labels (Speaker A, Speaker B, etc.)
                        formatted_parts = []
                        for utterance in transcript.utterances:
                            speaker_label = f"Speaker {utterance.speaker}"
                            formatted_parts.append(f"{speaker_label}: {utterance.text}")
                        formatted_transcript = "\n".join(formatted_parts)
                        logger.info(f"Formatted transcript with {len(transcript.utterances)} utterances from {len(set(u.speaker for u in transcript.utterances))} speakers")
                    else:
                        # Fallback to plain text if utterances not available
                        formatted_transcript = transcript.text
                        logger.warning("Speaker diarization utterances not available, using plain transcript")
                    
                    meeting.transcript_text = formatted_transcript
                    meeting.status = 'transcription_completed'
                    meeting.save()
                    
                    # Generate AI notes using Groq with speaker-labeled transcript
                    groq_client = get_groq_client()
                    if groq_client:
                        logger.info("Generating AI notes with Groq using speaker-labeled transcript...")
                        
                        # Get doctor and patient names for better context
                        doctor_name = meeting.doctor.user.name if meeting.doctor else "Doctor"
                        patient_name = meeting.patient.user.name if meeting.patient else "Patient"
                        
                        prompt = f"""You are a clinical summarization assistant. Analyze this medical consultation transcript and extract structured clinical notes.

IMPORTANT: This transcript contains a TWO-WAY conversation between a doctor and patient. The transcript includes speaker labels (Speaker A, Speaker B, etc.). 
- Speaker A is typically the {doctor_name} (doctor)
- Speaker B is typically the {patient_name} (patient)

Focus on extracting information from BOTH the patient's statements (chief complaint, symptoms, history) AND the doctor's observations and assessments.

Transcript with speaker labels:
{formatted_transcript}

Provide a JSON object with the following structure (return ONLY valid JSON, no markdown):
{{
  "chiefComplaint": "Main reason for visit (from patient's statements)",
  "hpi": "History of present illness (from patient's description and doctor's questions)",
  "pastMedicalHistory": "Past medical conditions mentioned by patient",
  "medications": "Current medications mentioned by patient",
  "allergies": "Known allergies mentioned by patient",
  "examObservations": "Physical examination findings mentioned by doctor",
  "assessment": "Clinical assessment and diagnosis from doctor",
  "plan": "Treatment plan, tests ordered, prescriptions, and follow-up instructions from doctor",
  "urgentFlags": ["Any urgent issues that need immediate attention"],
  "followUpQuestions": ["3 short follow-up questions for the patient"]
}}

CRITICAL INSTRUCTIONS:
- Extract information from BOTH patient responses AND doctor questions/observations
- Do NOT hallucinate medications or tests - only include what was actually mentioned
- If something is uncertain, mark it as "uncertain" or "not mentioned"
- Keep all fields brief and factual
- The patient's statements contain their symptoms and history
- The doctor's statements contain observations, assessments, and treatment plans"""
                        
                        try:
                            response = groq_client.chat.completions.create(
                                model="openai/gpt-oss-120b",
                                messages=[{"role": "user", "content": prompt}],
                                temperature=0.3,
                                max_tokens=2000
                            )
                            
                            ai_response = response.choices[0].message.content
                            logger.info(f"AI response received, length: {len(ai_response)}")
                            
                            # Try to parse JSON response
                            import json
                            import re
                            
                            # Remove markdown code blocks if present
                            ai_response_cleaned = re.sub(r'```json\s*', '', ai_response)
                            ai_response_cleaned = re.sub(r'```\s*$', '', ai_response_cleaned).strip()
                            
                            try:
                                notes_data = json.loads(ai_response_cleaned)
                                
                                # Create CallNote with parsed data including speaker-labeled transcript
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
                                    ai_metadata={
                                        'raw_response': ai_response, 
                                        'transcript': formatted_transcript, 
                                        'original_transcript': transcript.text,
                                        'parsed': True,
                                        'has_speaker_labels': hasattr(transcript, 'utterances') and transcript.utterances is not None
                                    }
                                )
                                
                                logger.info(f"CallNote created successfully for meeting {meeting_id}, note ID: {call_note.id}")
                                
                                # Notify doctor that notes are ready
                                create_notification(
                                    user=meeting.doctor.user,
                                    notification_type='note',
                                    title='AI Notes Ready',
                                    message=f'Clinical notes for {meeting.patient.user.name if meeting.patient else "patient"} are ready',
                                    link='/doctor/notes'
                                )
                                
                                meeting.status = 'completed'
                                meeting.save()
                                
                                logger.info(f"Meeting {meeting_id} completed successfully with AI notes")
                                
                            except json.JSONDecodeError as json_err:
                                logger.error(f"Failed to parse AI response as JSON: {json_err}")
                                logger.error(f"AI response was: {ai_response_cleaned[:500]}")
                                
                                # Fallback: create note with raw response
                                CallNote.objects.create(
                                    meeting=meeting,
                                    chief_complaint=ai_response[:500] if ai_response else '',
                                    ai_metadata={'raw_response': ai_response, 'transcript': transcript.text, 'parsed': False, 'error': str(json_err)}
                                )
                                meeting.status = 'completed'
                                meeting.save()
                                logger.warning(f"Created CallNote with unparsed AI response for meeting {meeting_id}")
                                
                        except Exception as groq_err:
                            logger.error(f"Error generating AI notes with Groq: {str(groq_err)}")
                            import traceback
                            logger.error(f"Traceback: {traceback.format_exc()}")
                            # Still mark as completed even if AI fails
                            meeting.status = 'completed'
                            meeting.save()
                    else:
                        logger.warning("Groq client not available, skipping AI note generation")
                        meeting.status = 'completed'
                        meeting.save()
                        
                elif transcript.status == aai.TranscriptStatus.error:
                    logger.error(f"Transcription failed for meeting {meeting_id}: {transcript.error}")
                    meeting.status = 'transcription_failed'
                    meeting.save()
                else:
                    logger.warning(f"Transcription status for meeting {meeting_id}: {transcript.status}")
                    meeting.status = 'transcription_failed'
                    meeting.save()
                    
            except Exception as transcribe_err:
                logger.error(f"Error during transcription: {str(transcribe_err)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                meeting.status = 'transcription_failed'
                meeting.save()
        else:
            logger.warning(f"No recording file found in request for meeting {meeting_id}")
            meeting.status = 'completed'
            meeting.ended_at = timezone.now()
            meeting.save()
        
        if not meeting.ended_at:
            meeting.ended_at = timezone.now()
            meeting.save()
        
        logger.info(f"Meeting {meeting_id} upload_recording endpoint completed, status: {meeting.status}")
        return Response({'success': True, 'status': meeting.status})
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
