from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from teleclinic.apps.core.models import Meeting, Notification

class Command(BaseCommand):
    help = 'Send notifications for upcoming appointments'

    def handle(self, *args, **options):
        now = timezone.now()
        
        # Get appointments in the next 24 hours that haven't started
        upcoming_start = now
        upcoming_end = now + timedelta(hours=24)
        
        meetings = Meeting.objects.filter(
            scheduled_at__gte=upcoming_start,
            scheduled_at__lte=upcoming_end,
            status='scheduled'
        ).select_related('doctor__user', 'patient__user')
        
        notifications_sent = 0
        
        for meeting in meetings:
            time_until = meeting.scheduled_at - now
            hours_until = int(time_until.total_seconds() / 3600)
            minutes_until = int(time_until.total_seconds() / 60)
            
            # Only send reminders for appointments 1 hour away or 24 hours away
            if not (55 <= minutes_until <= 65 or 23 <= hours_until <= 25):
                continue
            
            # Check if notification already sent for this meeting in the last 2 hours
            two_hours_ago = now - timedelta(hours=2)
            existing_notification = Notification.objects.filter(
                user=meeting.patient.user,
                type='appointment',
                message__contains=str(meeting.id),
                created_at__gte=two_hours_ago
            ).exists()
            
            if not existing_notification:
                time_text = f'{hours_until} hours' if hours_until > 1 else f'{minutes_until} minutes'
                
                # Notify patient
                Notification.objects.create(
                    user=meeting.patient.user,
                    type='appointment',
                    title='Upcoming Appointment Reminder',
                    message=f'Your appointment with Dr. {meeting.doctor.user.name} is in {time_text}. Meeting ID: {meeting.id}',
                    link=f'/patient/appointments'
                )
                
                # Notify doctor
                Notification.objects.create(
                    user=meeting.doctor.user,
                    type='appointment',
                    title='Upcoming Appointment Reminder',
                    message=f'Appointment with {meeting.patient.user.name} is in {time_text}. Meeting ID: {meeting.id}',
                    link=f'/doctor/appointments'
                )
                
                notifications_sent += 2
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully sent {notifications_sent} appointment reminders')
        )
