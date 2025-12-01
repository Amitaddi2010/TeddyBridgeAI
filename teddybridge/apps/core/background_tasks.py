import threading
import time
from django.utils import timezone
from datetime import timedelta
from .models import Meeting
from .notifications import create_notification

def check_missed_meetings_background():
    """Background task to check for missed meetings every minute"""
    while True:
        try:
            now = timezone.now()
            grace_period = now - timedelta(minutes=30)
            
            # Get meetings that should be marked as missed
            missed_meetings = Meeting.objects.filter(
                scheduled_at__lt=grace_period,
                status='scheduled'
            ).select_related('doctor__user', 'patient__user')
            
            for meeting in missed_meetings:
                meeting.status = 'missed'
                meeting.save()
                
                # Notify doctor
                create_notification(
                    user=meeting.doctor.user,
                    notification_type='appointment',
                    title='Missed Appointment',
                    message=f'Appointment with {meeting.patient.user.name} was not attended',
                    link='/doctor/appointments'
                )
                
                # Notify patient
                create_notification(
                    user=meeting.patient.user,
                    notification_type='appointment',
                    title='Missed Appointment',
                    message=f'Your appointment with Dr. {meeting.doctor.user.name} was not attended',
                    link='/patient/appointments'
                )
                
                print(f'Marked meeting {meeting.id} as missed and sent notifications')
        
        except Exception as e:
            print(f'Error in background task: {e}')
        
        # Wait 1 minute before checking again
        time.sleep(60)

def start_background_tasks():
    """Start background tasks in a separate thread"""
    thread = threading.Thread(target=check_missed_meetings_background, daemon=True)
    thread.start()
    print('Background task started: checking for missed meetings every minute')
