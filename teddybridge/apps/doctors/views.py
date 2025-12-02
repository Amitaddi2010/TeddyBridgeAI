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
        total_patients = DoctorPatientLink.objects.filter(doctor=doctor).count()
        upcoming = Meeting.objects.filter(doctor=doctor, status__in=['scheduled', 'in_progress']).count()
        completed = Meeting.objects.filter(doctor=doctor, status='completed').count()
        
        return Response({
            'totalPatients': total_patients,
            'upcomingAppointments': upcoming,
            'completedMeetings': completed,
            'pendingNotes': 0,
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
        meetings = Meeting.objects.filter(
            doctor=doctor, 
            status__in=['scheduled', 'in_progress']
        ).select_related('patient__user')[:5]
        
        result = [{
            'id': str(m.id),
            'patientName': m.patient.user.name if m.patient else 'Unknown',
            'scheduledAt': m.scheduled_at.isoformat() if m.scheduled_at else None,
            'title': m.title,
        } for m in meetings]
        
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
