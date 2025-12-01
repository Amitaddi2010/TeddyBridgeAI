from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from teddybridge.apps.core.models import Doctor, Meeting, CallNote

@api_view(['GET'])
def get_appointments(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
    except Doctor.DoesNotExist:
        doctor = Doctor.objects.create(user=request.user)
    
    meetings = Meeting.objects.filter(doctor=doctor).select_related('patient__user').order_by('-scheduled_at')
    
    result = [{
        'id': str(m.id),
        'patientName': m.patient.user.name if m.patient else 'Unknown',
        'patientAvatar': m.patient.user.avatar_url if m.patient else None,
        'patientId': str(m.patient.id) if m.patient else None,
        'scheduledAt': m.scheduled_at.isoformat() if m.scheduled_at else None,
        'title': m.title,
        'status': m.status,
    } for m in meetings]
    
    return Response(result)

@api_view(['GET'])
def get_meetings(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
    except Doctor.DoesNotExist:
        doctor = Doctor.objects.create(user=request.user)
    
    meetings = Meeting.objects.filter(doctor=doctor).select_related('patient__user').order_by('-created_at')
    
    result = [{
        'id': str(m.id),
        'patientName': m.patient.user.name if m.patient else 'Unknown',
        'patientAvatar': m.patient.user.avatar_url if m.patient else None,
        'title': m.title,
        'scheduledAt': m.scheduled_at.isoformat() if m.scheduled_at else None,
        'startedAt': m.started_at.isoformat() if m.started_at else None,
        'endedAt': m.ended_at.isoformat() if m.ended_at else None,
        'status': m.status,
        'hasTranscript': bool(m.transcript_text),
        'hasNotes': CallNote.objects.filter(meeting=m).exists(),
    } for m in meetings]
    
    return Response(result)

@api_view(['GET'])
def get_notes(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
    except Doctor.DoesNotExist:
        doctor = Doctor.objects.create(user=request.user)
    
    notes = CallNote.objects.filter(meeting__doctor=doctor).select_related('meeting__patient__user').order_by('-created_at')
    
    result = [{
        'id': str(n.id),
        'meetingId': str(n.meeting.id),
        'patientName': n.meeting.patient.user.name if n.meeting.patient else 'Unknown',
        'patientAvatar': n.meeting.patient.user.avatar_url if n.meeting.patient else None,
        'meetingDate': n.meeting.created_at.isoformat(),
        'chiefComplaint': n.chief_complaint or '',
        'hpi': n.hpi or '',
        'pastMedicalHistory': n.past_medical_history or '',
        'medications': n.medications or '',
        'allergies': n.allergies or '',
        'examObservations': n.exam_observations or '',
        'assessment': n.assessment or '',
        'plan': n.plan or '',
        'urgentFlags': n.urgent_flags or [],
        'followUpQuestions': n.follow_up_questions or [],
        'isEdited': n.is_edited,
        'createdAt': n.created_at.isoformat(),
    } for n in notes]
    
    return Response(result)
