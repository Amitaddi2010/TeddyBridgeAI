from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from teddybridge.apps.core.models import Patient, DoctorPatientLink, Meeting, Survey, SurveyResponse, Doctor, DoctorReview, ChatMessage
from django.db.models import Avg, Count, Q

@api_view(['GET'])
def patient_stats(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'patient':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        patient = request.user.patient_profile
    except Patient.DoesNotExist:
        patient = Patient.objects.create(user=request.user)
    
    total_doctors = DoctorPatientLink.objects.filter(patient=patient).count()
    upcoming = Meeting.objects.filter(patient=patient, status__in=['scheduled', 'in_progress']).count()
    pending_surveys = 0
    completed_surveys = SurveyResponse.objects.filter(patient=patient).count()
    
    return Response({
        'totalDoctors': total_doctors,
        'upcomingAppointments': upcoming,
        'pendingSurveys': pending_surveys,
        'completedSurveys': completed_surveys,
    })

@api_view(['GET'])
def get_doctors(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'patient':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        patient = request.user.patient_profile
    except Patient.DoesNotExist:
        patient = Patient.objects.create(user=request.user)
    
    links = DoctorPatientLink.objects.filter(patient=patient).select_related('doctor__user')
    
    # Get reviews for each doctor
    doctor_ids = [link.doctor.id for link in links]
    reviews_data = DoctorReview.objects.filter(doctor_id__in=doctor_ids).values('doctor_id').annotate(
        avg_rating=Avg('rating'),
        review_count=Count('id')
    )
    reviews_dict = {str(r['doctor_id']): {'avgRating': float(r['avg_rating']) if r['avg_rating'] else None, 'reviewCount': r['review_count']} for r in reviews_data}
    
    # Check if patient has reviewed each doctor
    patient_reviews = {str(r.doctor.id): r.rating for r in DoctorReview.objects.filter(patient=patient, doctor_id__in=doctor_ids)}
    
    # Get unread message counts for each doctor
    doctor_user_ids = [link.doctor.user.id for link in links]
    unread_counts = ChatMessage.objects.filter(
        sender_id__in=doctor_user_ids,
        receiver=request.user,
        is_read=False
    ).values('sender_id').annotate(count=Count('id'))
    unread_dict = {str(r['sender_id']): r['count'] for r in unread_counts}
    
    result = []
    for link in links:
        doctor_id_str = str(link.doctor.id)
        doctor_user_id_str = str(link.doctor.user.id)
        review_info = reviews_dict.get(doctor_id_str, {'avgRating': None, 'reviewCount': 0})
        patient_rating = patient_reviews.get(doctor_id_str)
        unread_count = unread_dict.get(doctor_user_id_str, 0)
        
        result.append({
            'id': doctor_id_str,  # Doctor model ID (for reviews)
            'userId': doctor_user_id_str,  # User ID (for peer chat)
            'name': link.doctor.user.name,
            'email': link.doctor.user.email,
            'specialty': link.doctor.specialty,
            'avatar': link.doctor.user.avatar_url,
            'bio': link.doctor.bio,
            'linkedAt': link.linked_at.isoformat(),
            'avgRating': review_info['avgRating'],
            'reviewCount': review_info['reviewCount'],
            'patientRating': patient_rating,
            'unreadMessageCount': unread_count,
        })
    
    return Response(result)

@api_view(['GET'])
def get_pending_surveys(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'patient':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        patient = request.user.patient_profile
    except Patient.DoesNotExist:
        patient = Patient.objects.create(user=request.user)
    
    doctor_ids = DoctorPatientLink.objects.filter(patient=patient).values_list('doctor_id', flat=True)
    surveys = Survey.objects.filter(doctor_id__in=doctor_ids, is_active=True).exclude(
        responses__patient=patient
    ).select_related('doctor__user')
    
    # Filter surveys assigned to this patient
    result = []
    for s in surveys:
        # If assigned_patients is None or empty, show to all patients
        # Otherwise, only show if patient ID is in the list
        if not s.assigned_patients or str(patient.id) in s.assigned_patients:
            result.append({
                'id': str(s.id),
                'title': s.title,
                'doctorName': s.doctor.user.name,
                'assignedAt': s.created_at.isoformat(),
                'questionCount': len(s.questions) if s.questions else 0,
            })
    
    return Response(result)

@api_view(['GET'])
def get_completed_surveys(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'patient':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        patient = request.user.patient_profile
    except Patient.DoesNotExist:
        patient = Patient.objects.create(user=request.user)
    
    responses = SurveyResponse.objects.filter(patient=patient).select_related('survey__doctor__user')
    
    result = [{
        'id': str(r.survey.id),
        'title': r.survey.title,
        'doctorName': r.survey.doctor.user.name,
        'questionCount': len(r.survey.questions) if r.survey.questions else 0,
        'submittedAt': r.submitted_at.isoformat(),
    } for r in responses]
    
    return Response(result)

@api_view(['GET'])
def get_appointments_upcoming(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'patient':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        patient = request.user.patient_profile
    except Patient.DoesNotExist:
        patient = Patient.objects.create(user=request.user)
    
    meetings = Meeting.objects.filter(
        patient=patient,
        status__in=['scheduled', 'in_progress']
    ).select_related('doctor__user')[:5]
    
    result = [{
        'id': str(m.id),
        'doctorName': m.doctor.user.name,
        'doctorAvatar': m.doctor.user.avatar_url,
        'specialty': m.doctor.specialty,
        'title': m.title,
        'scheduledAt': m.scheduled_at.isoformat() if m.scheduled_at else None,
        'status': m.status,
    } for m in meetings]
    
    return Response(result)

@api_view(['GET'])
def get_appointments(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'patient':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        patient = request.user.patient_profile
    except Patient.DoesNotExist:
        patient = Patient.objects.create(user=request.user)
    
    meetings = Meeting.objects.filter(patient=patient).select_related('doctor__user').order_by('-scheduled_at')
    
    result = [{
        'id': str(m.id),
        'doctorName': m.doctor.user.name,
        'doctorAvatar': m.doctor.user.avatar_url,
        'specialty': m.doctor.specialty,
        'title': m.title,
        'scheduledAt': m.scheduled_at.isoformat() if m.scheduled_at else None,
        'status': m.status,
    } for m in meetings]
    
    return Response(result)
