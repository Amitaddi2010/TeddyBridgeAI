from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from datetime import timedelta
import secrets
import os
import qrcode
import io
import base64
from teddybridge.apps.core.models import Doctor, DoctorPatientLink, Meeting, QRToken, Survey, SurveyResponse, CallNote, Patient, ChatMessage
from django.db.models import Count

@api_view(['GET'])
def doctor_stats(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
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
        total_patients = DoctorPatientLink.objects.filter(doctor=doctor).count()
        upcoming = Meeting.objects.filter(doctor=doctor, status__in=['scheduled', 'in_progress']).count()
        completed = Meeting.objects.filter(doctor=doctor, status='completed', scheduled_at__gte=start_date).count()
        cancelled = Meeting.objects.filter(doctor=doctor, status='cancelled', scheduled_at__gte=start_date).count()
        online_consultations = Meeting.objects.filter(
            doctor=doctor, 
            meeting_url__isnull=False
        ).exclude(meeting_url='').filter(scheduled_at__gte=start_date).count()
        pending_notes = CallNote.objects.filter(meeting__doctor=doctor, meeting__status='completed').exclude(chief_complaint__isnull=False).count()
        
        # Previous period stats for growth calculation
        previous_total_patients = DoctorPatientLink.objects.filter(
            doctor=doctor, 
            linked_at__gte=previous_start, 
            linked_at__lt=start_date
        ).count()
        previous_completed = Meeting.objects.filter(
            doctor=doctor, 
            status='completed', 
            scheduled_at__gte=previous_start,
            scheduled_at__lt=start_date
        ).count()
        previous_cancelled = Meeting.objects.filter(
            doctor=doctor, 
            status='cancelled', 
            scheduled_at__gte=previous_start,
            scheduled_at__lt=start_date
        ).count()
        previous_online = Meeting.objects.filter(
            doctor=doctor,
            meeting_url__isnull=False
        ).exclude(meeting_url='').filter(
            scheduled_at__gte=previous_start,
            scheduled_at__lt=start_date
        ).count()
        
        # Total appointments (all time for breakdown stats)
        total_appointments = Meeting.objects.filter(doctor=doctor).count()
        total_video_consultations = Meeting.objects.filter(
            doctor=doctor,
            meeting_url__isnull=False
        ).exclude(meeting_url='').count()
        total_rescheduled = Meeting.objects.filter(
            doctor=doctor,
            status__in=['scheduled', 'in_progress']
        ).exclude(scheduled_at__isnull=True).count()
        
        # Follow-ups (meetings with same patient who has previous completed meetings)
        follow_ups = 0
        completed_meetings = Meeting.objects.filter(doctor=doctor, status='completed').values_list('patient_id', flat=True).distinct()
        for patient_id in completed_meetings:
            if patient_id:
                future_meetings = Meeting.objects.filter(
                    doctor=doctor,
                    patient_id=patient_id,
                    scheduled_at__gt=now
                ).count()
                if future_meetings > 0:
                    follow_ups += future_meetings
        
        return Response({
            'totalPatients': total_patients,
            'upcomingAppointments': upcoming,
            'completedMeetings': completed,
            'cancelledAppointments': cancelled,
            'onlineConsultations': online_consultations,
            'pendingNotes': pending_notes,
            # Previous period data for growth calculation
            'previousTotalPatients': previous_total_patients,
            'previousCompletedMeetings': previous_completed,
            'previousCancelledAppointments': previous_cancelled,
            'previousOnlineConsultations': previous_online,
            # Breakdown stats (all time)
            'totalAppointments': total_appointments,
            'totalVideoConsultations': total_video_consultations,
            'totalRescheduled': total_rescheduled,
            'totalFollowUps': follow_ups,
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_patients(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
    except Doctor.DoesNotExist:
        doctor = Doctor.objects.create(user=request.user)
    
    try:
        links = DoctorPatientLink.objects.filter(doctor=doctor).select_related('patient__user')
        
        # Get unread message counts for each patient
        patient_user_ids = [link.patient.user.id for link in links]
        unread_counts = ChatMessage.objects.filter(
            sender_id__in=patient_user_ids,
            receiver=request.user,
            is_read=False
        ).values('sender_id').annotate(count=Count('id'))
        unread_dict = {str(r['sender_id']): r['count'] for r in unread_counts}
        
        result = []
        for link in links:
            patient_user_id_str = str(link.patient.user.id)
            unread_count = unread_dict.get(patient_user_id_str, 0)
            
            result.append({
            'id': str(link.patient.id),
                'userId': patient_user_id_str,
            'name': link.patient.user.name,
            'email': link.patient.user.email,
            'avatar': link.patient.user.avatar_url,
            'phone': link.patient.phone,
            'dateOfBirth': link.patient.date_of_birth.isoformat() if link.patient.date_of_birth else None,
            'linkedAt': link.linked_at.isoformat(),
                'unreadMessageCount': unread_count,
            })
        
        return Response(result)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_patient(request, patient_id):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
        link = DoctorPatientLink.objects.filter(doctor=doctor, patient_id=patient_id).select_related('patient__user').first()
        
        if not link:
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
        
        patient = link.patient
        appointments = Meeting.objects.filter(patient=patient).order_by('-scheduled_at')[:5]
        surveys_completed = SurveyResponse.objects.filter(patient=patient).count()
        
        return Response({
            'id': str(patient.id),
            'name': patient.user.name,
            'email': patient.user.email,
            'phone': patient.phone,
            'dateOfBirth': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
            'address': patient.address,
            'emergencyContact': patient.emergency_contact,
            'medicalHistory': patient.medical_history,
            'linkedAt': link.linked_at.isoformat(),
            'totalAppointments': appointments.count(),
            'surveysCompleted': surveys_completed,
            'recentAppointments': [{
                'id': str(m.id),
                'title': m.title,
                'scheduledAt': m.scheduled_at.isoformat() if m.scheduled_at else None,
                'status': m.status,
            } for m in appointments],
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_patients_recent(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
        links = DoctorPatientLink.objects.filter(doctor=doctor).select_related('patient__user')[:5]
        
        # Get unread message counts for each patient
        patient_user_ids = [link.patient.user.id for link in links]
        unread_counts = ChatMessage.objects.filter(
            sender_id__in=patient_user_ids,
            receiver=request.user,
            is_read=False
        ).values('sender_id').annotate(count=Count('id'))
        unread_dict = {str(r['sender_id']): r['count'] for r in unread_counts}
        
        result = []
        for link in links:
            patient_user_id_str = str(link.patient.user.id)
            unread_count = unread_dict.get(patient_user_id_str, 0)
            
            result.append({
            'id': str(link.patient.id),
                'userId': patient_user_id_str,
            'name': link.patient.user.name,
            'avatar': link.patient.user.avatar_url,
            'lastVisit': link.linked_at.isoformat(),
                'unreadMessageCount': unread_count,
            })
        
        return Response(result)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_appointments_upcoming(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
        now = timezone.now()
        
        # Get filter parameter
        filter_type = request.GET.get('filter', 'all')  # today, week, month, all
        
        if filter_type == 'today':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            meetings = Meeting.objects.filter(
                doctor=doctor,
                status__in=['scheduled', 'in_progress'],
                scheduled_at__gte=start_date,
                scheduled_at__lte=end_date
            ).select_related('patient__user', 'doctor').order_by('scheduled_at')
        elif filter_type == 'week':
            start_date = now - timedelta(days=7)
            meetings = Meeting.objects.filter(
                doctor=doctor,
                status__in=['scheduled', 'in_progress'],
                scheduled_at__gte=start_date
            ).select_related('patient__user', 'doctor').order_by('scheduled_at')
        elif filter_type == 'month':
            start_date = now - timedelta(days=30)
            meetings = Meeting.objects.filter(
                doctor=doctor,
                status__in=['scheduled', 'in_progress'],
                scheduled_at__gte=start_date
            ).select_related('patient__user', 'doctor').order_by('scheduled_at')
        else:
            meetings = Meeting.objects.filter(
                doctor=doctor,
                status__in=['scheduled', 'in_progress']
            ).select_related('patient__user', 'doctor').order_by('scheduled_at')
        
        result = []
        for m in meetings[:20]:  # Limit to 20 for performance
            result.append({
                'id': str(m.id),
                'appointmentId': f"AP{m.id.hex[:8].upper()}",
                'patientName': m.patient.user.name if m.patient and m.patient.user else 'Unknown',
                'patientAvatar': m.patient.user.avatar_url if m.patient and m.patient.user else None,
                'patientId': str(m.patient.id) if m.patient else None,
                'scheduledAt': m.scheduled_at.isoformat() if m.scheduled_at else None,
                'title': m.title,
                'status': m.status,
                'meetingUrl': m.meeting_url,
                'isOnline': bool(m.meeting_url and m.meeting_url.strip()),
                'specialty': doctor.specialty,
            })
        
        return Response(result)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_patients_top(request):
    """Get top patients by appointment count"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
        
        # Get period filter
        period = request.GET.get('period', 'week')  # week, month, year, all
        if period == 'week':
            start_date = timezone.now() - timedelta(days=7)
        elif period == 'month':
            start_date = timezone.now() - timedelta(days=30)
        elif period == 'year':
            start_date = timezone.now() - timedelta(days=365)
        else:
            start_date = None
        
        # Get patients with appointment counts
        links = DoctorPatientLink.objects.filter(doctor=doctor).select_related('patient__user')
        
        result = []
        for link in links:
            if start_date:
                appointment_count = Meeting.objects.filter(
                    doctor=doctor,
                    patient=link.patient,
                    scheduled_at__gte=start_date
                ).count()
            else:
                appointment_count = Meeting.objects.filter(
                    doctor=doctor,
                    patient=link.patient
                ).count()
            
            # Get last visit
            last_meeting = Meeting.objects.filter(
                doctor=doctor,
                patient=link.patient,
                status='completed'
            ).order_by('-scheduled_at').first()
            
            if appointment_count > 0:  # Only include patients with appointments
                result.append({
                    'id': str(link.patient.id),
                    'userId': str(link.patient.user.id),
                    'name': link.patient.user.name,
                    'avatar': link.patient.user.avatar_url,
                    'phone': link.patient.phone,
                    'appointmentCount': appointment_count,
                    'lastVisit': last_meeting.scheduled_at.isoformat() if last_meeting and last_meeting.scheduled_at else None,
                })
        
        # Sort by appointment count descending and limit to top 5
        result.sort(key=lambda x: x['appointmentCount'], reverse=True)
        
        return Response(result[:5])
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_appointments_recent(request):
    """Get recent appointments with full details for table"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
        
        # Get filter parameters
        status_filter = request.GET.get('status', 'all')  # all, completed, pending, cancelled
        limit = int(request.GET.get('limit', 10))
        
        meetings_query = Meeting.objects.filter(doctor=doctor).select_related('patient__user', 'doctor').order_by('-scheduled_at', '-created_at')
        
        if status_filter == 'completed':
            meetings_query = meetings_query.filter(status='completed')
        elif status_filter == 'pending':
            meetings_query = meetings_query.filter(status__in=['scheduled', 'in_progress'])
        elif status_filter == 'cancelled':
            meetings_query = meetings_query.filter(status='cancelled')
        
        meetings = meetings_query[:limit]
        
        result = []
        for m in meetings:
            result.append({
                'id': str(m.id),
                'appointmentId': f"AP{m.id.hex[:8].upper()}",
                'patientName': m.patient.user.name if m.patient and m.patient.user else 'Unknown',
                'patientAvatar': m.patient.user.avatar_url if m.patient and m.patient.user else None,
                'patientId': str(m.patient.id) if m.patient else None,
                'scheduledAt': m.scheduled_at.isoformat() if m.scheduled_at else None,
                'startedAt': m.started_at.isoformat() if m.started_at else None,
                'endedAt': m.ended_at.isoformat() if m.ended_at else None,
                'title': m.title,
                'status': m.status,
                'meetingUrl': m.meeting_url,
                'isOnline': bool(m.meeting_url and m.meeting_url.strip()),
                'specialty': doctor.specialty,
                'createdAt': m.created_at.isoformat() if m.created_at else None,
            })
        
        return Response(result)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_appointment_statistics(request):
    """Get appointment statistics for chart (grouped by period)"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
        
        # Get period parameter
        period = request.GET.get('period', 'monthly')  # monthly, weekly, yearly
        
        now = timezone.now()
        
        if period == 'weekly':
            # Last 7 days
            days = 7
            date_format = '%Y-%m-%d'
        elif period == 'yearly':
            # Last 12 months
            days = 365
            date_format = '%Y-%m'
        else:  # monthly
            # Last 30 days
            days = 30
            date_format = '%Y-%m-%d'
        
        start_date = now - timedelta(days=days)
        
        meetings = Meeting.objects.filter(
            doctor=doctor,
            scheduled_at__gte=start_date
        ).values('status', 'scheduled_at')
        
        # Group by date and status
        stats = {}
        for m in meetings:
            if m['scheduled_at']:
                date_key = m['scheduled_at'].strftime(date_format)
                if date_key not in stats:
                    stats[date_key] = {'completed': 0, 'pending': 0, 'cancelled': 0}
                
                if m['status'] == 'completed':
                    stats[date_key]['completed'] += 1
                elif m['status'] in ['scheduled', 'in_progress']:
                    stats[date_key]['pending'] += 1
                elif m['status'] == 'cancelled':
                    stats[date_key]['cancelled'] += 1
        
        # Convert to list format for chart
        result = []
        for date_key in sorted(stats.keys()):
            result.append({
                'date': date_key,
                'completed': stats[date_key]['completed'],
                'pending': stats[date_key]['pending'],
                'cancelled': stats[date_key]['cancelled'],
            })
        
        return Response(result)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def generate_qr(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if not hasattr(request.user, 'role') or request.user.role != 'doctor':
        return Response({'error': f'Only doctors can generate QR codes'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
    except Doctor.DoesNotExist:
        doctor = Doctor.objects.create(user=request.user)
    
    try:
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=24)
        
        QRToken.objects.create(doctor=doctor, token=token, expires_at=expires_at)
        
        qr = qrcode.QRCode(version=1, box_size=10, border=2)
        # Use environment variable for frontend URL, fallback to production or localhost
        frontend_url = os.getenv('FRONTEND_URL', '')
        if not frontend_url:
            # In production, use Vercel URL; in development, use localhost
            if not request.get_host().startswith('localhost') and not request.get_host().startswith('127.0.0.1'):
                frontend_url = os.getenv('VITE_FRONTEND_URL', 'https://teddy-bridge-ai.vercel.app')
            else:
                frontend_url = 'http://localhost:5173'
        link_url = f"{frontend_url}/link/{token}"
        qr.add_data(link_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_data_url = f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"
        
        return Response({'token': token, 'qrDataUrl': qr_data_url})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_qr_tokens(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
    except Doctor.DoesNotExist:
        doctor = Doctor.objects.create(user=request.user)
    
    try:
        tokens = QRToken.objects.filter(doctor=doctor).order_by('-created_at')
        
        result = [{
            'id': str(t.id),
            'token': t.token,
            'used': t.used,
            'expiresAt': t.expires_at.isoformat(),
            'createdAt': t.created_at.isoformat(),
        } for t in tokens]
        
        return Response(result)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
