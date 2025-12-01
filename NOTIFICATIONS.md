# Notification System

## Overview
The TeleClinic notification system provides real-time in-app notifications for important events.

## Features

### Automatic Notifications
1. **New Appointment** - Patient receives notification when doctor schedules an appointment
2. **AI Notes Ready** - Doctor receives notification when clinical notes are generated
3. **Survey Response** - Doctor receives notification when patient completes a survey
4. **Appointment Reminders** - Both doctor and patient receive reminders at:
   - 24 hours before appointment
   - 1 hour before appointment

### Notification Bell
- Located in the header next to theme toggle
- Shows unread count badge
- Auto-refreshes every 30 seconds
- Click to view all notifications
- Click notification to navigate to relevant page
- Mark individual or all notifications as read

## Running Appointment Reminders

### Manual Testing
```bash
python manage.py send_appointment_reminders
```

### Automated (Windows Task Scheduler)
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily, repeat every 1 hour
4. Action: Start a program
5. Program: `E:\Harvard University\TeleMed\TeleClinicScaffold\TeleClinicScaffold\run_reminders.bat`

### Automated (Linux/Mac Cron)
Add to crontab:
```bash
# Run every hour
0 * * * * cd /path/to/TeleClinicScaffold && python manage.py send_appointment_reminders
```

## API Endpoints

- `GET /api/user/notifications/list` - Get all notifications
- `POST /api/user/notifications/{id}/read` - Mark notification as read
- `POST /api/user/notifications/read-all` - Mark all as read

## Notification Types

- `appointment` - Blue dot, appointment-related
- `note` - Green dot, clinical notes
- `survey` - Purple dot, survey-related
- `general` - Gray dot, other notifications

## Database Model

```python
class Notification:
    user: User
    type: str  # appointment, note, survey, general
    title: str
    message: str
    link: str  # Optional navigation link
    is_read: bool
    created_at: datetime
```

## Adding New Notifications

```python
from teleclinic.apps.core.notifications import create_notification

create_notification(
    user=user_object,
    notification_type='appointment',
    title='Notification Title',
    message='Notification message',
    link='/path/to/page'  # Optional
)
```
