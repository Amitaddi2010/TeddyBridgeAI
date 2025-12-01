from django.core.management.base import BaseCommand
from teleclinic.apps.core.models import Meeting
import requests
import os

class Command(BaseCommand):
    help = 'Create Daily.co rooms for existing meetings'

    def handle(self, *args, **options):
        daily_api_key = os.getenv('DAILY_API_KEY')
        
        if not daily_api_key:
            self.stdout.write(self.style.ERROR('DAILY_API_KEY not found in environment'))
            return
        
        meetings = Meeting.objects.filter(daily_room_url__isnull=True, status='scheduled')
        
        self.stdout.write(f'Found {meetings.count()} meetings without rooms')
        
        for meeting in meetings:
            try:
                room_name = str(meeting.id)
                response = requests.post(
                    'https://api.daily.co/v1/rooms',
                    headers={
                        'Authorization': f'Bearer {daily_api_key}',
                        'Content-Type': 'application/json'
                    },
                    json={
                        'name': room_name,
                        'privacy': 'public',
                        'properties': {
                            'enable_screenshare': True,
                            'enable_chat': True,
                            'start_video_off': False,
                            'start_audio_off': False
                        }
                    }
                )
                
                if response.status_code == 200:
                    room_data = response.json()
                    room_url = room_data.get('url')
                    meeting.daily_room_url = room_url
                    meeting.save()
                    self.stdout.write(self.style.SUCCESS(f'Created room for meeting {meeting.id}: {room_url}'))
                elif response.status_code == 400 and 'already exists' in response.text:
                    # Room already exists, fetch it
                    get_response = requests.get(
                        f'https://api.daily.co/v1/rooms/{room_name}',
                        headers={'Authorization': f'Bearer {daily_api_key}'}
                    )
                    if get_response.status_code == 200:
                        room_data = get_response.json()
                        room_url = room_data.get('url')
                        meeting.daily_room_url = room_url
                        meeting.save()
                        self.stdout.write(self.style.SUCCESS(f'Fetched existing room for meeting {meeting.id}: {room_url}'))
                    else:
                        self.stdout.write(self.style.ERROR(f'Failed to fetch room for meeting {meeting.id}'))
                else:
                    self.stdout.write(self.style.ERROR(f'Failed for meeting {meeting.id}: {response.status_code} - {response.text}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error for meeting {meeting.id}: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS('Done!'))
