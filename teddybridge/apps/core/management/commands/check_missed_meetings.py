from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from teleclinic.apps.core.models import Meeting
from teleclinic.apps.core.notifications import create_notification

class Command(BaseCommand):
    help = 'Check for missed meetings and mark them accordingly'

    def handle(self, *args, **options):
        now = timezone.now()
        
        # Get meetings that are scheduled but past their time (30 min grace period)
        grace_period = now - timedelta(minutes=30)
        
        missed_meetings = Meeting.objects.filter(
            scheduled_at__lt=grace_period,
            status='scheduled'
        ).select_related('doctor__user', 'patient__user')
        
        count = 0
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
            
            count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Marked {count} meetings as missed')
        )
