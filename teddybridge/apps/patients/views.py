from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from teddybridge.apps.core.models import Patient, DoctorPatientLink, Meeting, Survey, SurveyResponse, Doctor, DoctorReview, ChatMessage
from django.db.models import Avg, Count, Q, Max

@api_view(['GET'])
def patient_stats(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'patient':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        from django.utils import timezone
        from datetime import timedelta
        import logging
        
        logger = logging.getLogger(__name__)
        
        # Get or create patient profile
        try:
            patient = request.user.patient_profile
        except Patient.DoesNotExist:
            patient = Patient.objects.create(user=request.user)
            logger.info(f"Created patient profile for user {request.user.id}")
        
        now = timezone.now()
        
        # Get period parameter (default to 'month')
        period = request.GET.get('period', 'month')
        if period == 'week':
            start_date = now - timedelta(days=7)
        elif period == 'year':
            start_date = now - timedelta(days=365)
        else:
            start_date = now - timedelta(days=30)
        
        # Previous period for comparison
        period_days = (now - start_date).days
        previous_start = start_date - timedelta(days=period_days)
        
        # Current period stats
        links = DoctorPatientLink.objects.filter(patient=patient).select_related('doctor__user')
        total_doctors = links.count()
        
        upcoming = Meeting.objects.filter(patient=patient, status__in=['scheduled', 'in_progress']).count()
        completed = Meeting.objects.filter(patient=patient, status='completed', scheduled_at__gte=start_date).count()
        cancelled = Meeting.objects.filter(patient=patient, status='cancelled', scheduled_at__gte=start_date).count()
        total_consultations = Meeting.objects.filter(patient=patient).count()
        
        # Get pending surveys
        doctor_ids = DoctorPatientLink.objects.filter(patient=patient).values_list('doctor_id', flat=True)
        pending_surveys = Survey.objects.filter(
            doctor_id__in=doctor_ids, 
            is_active=True
        ).exclude(
            responses__patient=patient
        ).count()
        
        completed_surveys = SurveyResponse.objects.filter(patient=patient).count()
        
        # Previous period stats for growth calculation
        previous_total_doctors = DoctorPatientLink.objects.filter(
            patient=patient, 
            linked_at__gte=previous_start, 
            linked_at__lt=start_date
        ).distinct().count()
        previous_completed_surveys = SurveyResponse.objects.filter(
            patient=patient, 
            submitted_at__gte=previous_start,
            submitted_at__lt=start_date
        ).count()
        previous_completed = Meeting.objects.filter(
            patient=patient,
            status='completed',
            scheduled_at__gte=previous_start,
            scheduled_at__lt=start_date
        ).count()
        previous_cancelled = Meeting.objects.filter(
            patient=patient,
            status='cancelled',
            scheduled_at__gte=previous_start,
            scheduled_at__lt=start_date
        ).count()
        
        return Response({
            'totalDoctors': total_doctors,
            'upcomingAppointments': upcoming,
            'completedAppointments': completed,
            'cancelledAppointments': cancelled,
            'totalConsultations': total_consultations,
            'pendingSurveys': pending_surveys,
            'completedSurveys': completed_surveys,
            # Previous period data for growth calculation
            'previousTotalDoctors': previous_total_doctors,
            'previousCompletedSurveys': previous_completed_surveys,
            'previousCompletedAppointments': previous_completed,
            'previousCancelledAppointments': previous_cancelled,
        })
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in patient_stats: {str(e)}", exc_info=True)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
    
    # Get appointment counts and last consultation date for each doctor
    appointment_counts = Meeting.objects.filter(
        patient=patient,
        doctor_id__in=doctor_ids
    ).values('doctor_id').annotate(
        appointment_count=Count('id'),
        last_consultation=Max('scheduled_at')
    )
    appointments_dict = {
        str(r['doctor_id']): {
            'appointmentCount': r['appointment_count'],
            'lastConsultation': r['last_consultation'].isoformat() if r['last_consultation'] else None
        }
        for r in appointment_counts
    }
    
    result = []
    for link in links:
        doctor_id_str = str(link.doctor.id)
        doctor_user_id_str = str(link.doctor.user.id)
        review_info = reviews_dict.get(doctor_id_str, {'avgRating': None, 'reviewCount': 0})
        patient_rating = patient_reviews.get(doctor_id_str)
        unread_count = unread_dict.get(doctor_user_id_str, 0)
        appointment_info = appointments_dict.get(doctor_id_str, {'appointmentCount': 0, 'lastConsultation': None})
        
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
            'appointmentCount': appointment_info['appointmentCount'],
            'lastConsultation': appointment_info['lastConsultation'],
        })
    
    return Response(result)

@api_view(['GET'])
def get_doctor(request, doctor_id):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'patient':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        patient = request.user.patient_profile
    except Patient.DoesNotExist:
        patient = Patient.objects.create(user=request.user)
    
    # Verify that this doctor is linked to the patient
    link = DoctorPatientLink.objects.filter(patient=patient, doctor_id=doctor_id).select_related('doctor__user').first()
    
    if not link:
        return Response({'error': 'Doctor not found or not linked'}, status=status.HTTP_404_NOT_FOUND)
    
    doctor = link.doctor
    appointments = Meeting.objects.filter(patient=patient, doctor=doctor).order_by('-scheduled_at')[:5]
    
    # Get review statistics
    reviews_data = DoctorReview.objects.filter(doctor=doctor).aggregate(
        avg_rating=Avg('rating'),
        review_count=Count('id')
    )
    
    # Get patient's review if exists
    patient_review = DoctorReview.objects.filter(patient=patient, doctor=doctor).first()
    
    # Get appointment statistics
    total_appointments = Meeting.objects.filter(patient=patient, doctor=doctor).count()
    completed_appointments = Meeting.objects.filter(patient=patient, doctor=doctor, status='completed').count()
    
    return Response({
        'id': str(doctor.id),
        'userId': str(doctor.user.id),
        'name': doctor.user.name,
        'email': doctor.user.email,
        'specialty': doctor.specialty,
        'city': doctor.city,
        'avatar': doctor.user.avatar_url,
        'bio': doctor.bio,
        'linkedAt': link.linked_at.isoformat(),
        'avgRating': float(reviews_data['avg_rating']) if reviews_data['avg_rating'] else None,
        'reviewCount': reviews_data['review_count'],
        'patientRating': patient_review.rating if patient_review else None,
        'totalAppointments': total_appointments,
        'completedAppointments': completed_appointments,
        'recentAppointments': [{
            'id': str(m.id),
            'title': m.title,
            'scheduledAt': m.scheduled_at.isoformat() if m.scheduled_at else None,
            'status': m.status,
        } for m in appointments],
    })

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
        from django.utils import timezone
        from datetime import timedelta
        
        patient = request.user.patient_profile
    except Patient.DoesNotExist:
        patient = Patient.objects.create(user=request.user)
    
    now = timezone.now()
    
    # Get filter parameter
    filter_type = request.GET.get('filter', 'all')  # today, week, month, all
    
    if filter_type == 'today':
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        meetings = Meeting.objects.filter(
            patient=patient,
            status__in=['scheduled', 'in_progress'],
            scheduled_at__gte=start_date,
            scheduled_at__lte=end_date
        ).select_related('doctor__user', 'doctor').order_by('scheduled_at')
    elif filter_type == 'week':
        start_date = now - timedelta(days=7)
        meetings = Meeting.objects.filter(
            patient=patient,
            status__in=['scheduled', 'in_progress'],
            scheduled_at__gte=start_date
        ).select_related('doctor__user', 'doctor').order_by('scheduled_at')
    elif filter_type == 'month':
        start_date = now - timedelta(days=30)
        meetings = Meeting.objects.filter(
            patient=patient,
            status__in=['scheduled', 'in_progress'],
            scheduled_at__gte=start_date
        ).select_related('doctor__user', 'doctor').order_by('scheduled_at')
    else:
        meetings = Meeting.objects.filter(
            patient=patient,
            status__in=['scheduled', 'in_progress']
        ).select_related('doctor__user', 'doctor').order_by('scheduled_at')
    
    result = []
    for m in meetings[:20]:  # Limit to 20
        result.append({
            'id': str(m.id),
            'appointmentId': f"AP{m.id.hex[:8].upper()}",
            'doctorName': m.doctor.user.name,
            'doctorAvatar': m.doctor.user.avatar_url,
            'doctorId': str(m.doctor.id),
            'specialty': m.doctor.specialty,
            'title': m.title,
            'scheduledAt': m.scheduled_at.isoformat() if m.scheduled_at else None,
            'status': m.status,
            'meetingUrl': m.meeting_url,
            'isOnline': bool(m.meeting_url and m.meeting_url.strip()),
        })
    
    return Response(result)

@api_view(['GET'])
def get_appointments_recent(request):
    """Get recent appointments with full details for table"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'patient':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        patient = request.user.patient_profile
    except Patient.DoesNotExist:
        patient = Patient.objects.create(user=request.user)
    
    # Get filter parameters
    status_filter = request.GET.get('status', 'all')  # all, completed, upcoming, cancelled
    limit = int(request.GET.get('limit', 10))
    
    meetings_query = Meeting.objects.filter(patient=patient).select_related('doctor__user', 'doctor').order_by('-scheduled_at', '-created_at')
    
    if status_filter == 'completed':
        meetings_query = meetings_query.filter(status='completed')
    elif status_filter == 'upcoming':
        meetings_query = meetings_query.filter(status__in=['scheduled', 'in_progress'])
    elif status_filter == 'cancelled':
        meetings_query = meetings_query.filter(status='cancelled')
    
    meetings = meetings_query[:limit]
    
    result = []
    for m in meetings:
        result.append({
            'id': str(m.id),
            'appointmentId': f"AP{m.id.hex[:8].upper()}",
            'doctorName': m.doctor.user.name,
            'doctorAvatar': m.doctor.user.avatar_url,
            'doctorId': str(m.doctor.id),
            'specialty': m.doctor.specialty,
            'scheduledAt': m.scheduled_at.isoformat() if m.scheduled_at else None,
            'startedAt': m.started_at.isoformat() if m.started_at else None,
            'endedAt': m.ended_at.isoformat() if m.ended_at else None,
            'title': m.title,
            'status': m.status,
            'meetingUrl': m.meeting_url,
            'isOnline': bool(m.meeting_url and m.meeting_url.strip()),
            'createdAt': m.created_at.isoformat() if m.created_at else None,
        })
    
    return Response(result)

@api_view(['GET'])
def get_appointment_statistics(request):
    """Get appointment statistics for chart (grouped by period)"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'patient':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        from django.utils import timezone
        from datetime import timedelta
        
        patient = request.user.patient_profile
    except Patient.DoesNotExist:
        patient = Patient.objects.create(user=request.user)
    
    # Get period parameter
    period = request.GET.get('period', 'monthly')  # monthly, weekly, yearly
    
    now = timezone.now()
    
    if period == 'weekly':
        days = 7
        date_format = '%Y-%m-%d'
    elif period == 'yearly':
        days = 365
        date_format = '%Y-%m'
    else:  # monthly
        days = 30
        date_format = '%Y-%m-%d'
    
    start_date = now - timedelta(days=days)
    
    meetings = Meeting.objects.filter(
        patient=patient,
        scheduled_at__gte=start_date
    ).values('status', 'scheduled_at')
    
    # Group by date and status
    stats = {}
    for m in meetings:
        if m['scheduled_at']:
            date_key = m['scheduled_at'].strftime(date_format)
            if date_key not in stats:
                stats[date_key] = {'completed': 0, 'upcoming': 0, 'cancelled': 0}
            
            if m['status'] == 'completed':
                stats[date_key]['completed'] += 1
            elif m['status'] in ['scheduled', 'in_progress']:
                stats[date_key]['upcoming'] += 1
            elif m['status'] == 'cancelled':
                stats[date_key]['cancelled'] += 1
    
    # Convert to list format for chart
    result = []
    for date_key in sorted(stats.keys()):
        result.append({
            'date': date_key,
            'completed': stats[date_key]['completed'],
            'upcoming': stats[date_key]['upcoming'],
            'cancelled': stats[date_key]['cancelled'],
        })
    
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
