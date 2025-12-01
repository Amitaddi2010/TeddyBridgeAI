# Missed Meetings & Reschedule Feature

## Overview
Automatically detect missed appointments and provide reschedule functionality.

## Features

### 1. Automatic Missed Meeting Detection
- Meetings are marked as "missed" if not attended 30 minutes after scheduled time
- Both doctor and patient receive notifications
- Runs via scheduled command

### 2. Appointment Tabs
- **Upcoming**: Scheduled appointments with Start/Delete options
- **Missed**: Not attended appointments with Reschedule/Delete options
- **Completed**: Finished appointments

### 3. Reschedule Functionality
- One-click reschedule from missed appointments
- Select new date and time
- Patient receives notification about reschedule
- Appointment status changes back to "scheduled"

## Setup

### 1. Run Migration
```bash
python manage.py makemigrations
python manage.py migrate
```

### 2. Test Manually
```bash
python manage.py check_missed_meetings
```

### 3. Automate (Windows Task Scheduler)
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily, repeat every 15 minutes
4. Action: Start a program
5. Program: `E:\Harvard University\TeleMed\TeleClinicScaffold\TeleClinicScaffold\check_missed_meetings.bat`

### 4. Automate (Linux/Mac Cron)
Add to crontab:
```bash
# Run every 15 minutes
*/15 * * * * cd /path/to/TeleClinicScaffold && python manage.py check_missed_meetings
```

## How It Works

### Missed Meeting Detection
1. Command runs every 15 minutes (via scheduler)
2. Checks for appointments scheduled >30 minutes ago
3. If status is still "scheduled", marks as "missed"
4. Sends notifications to both doctor and patient

### Reschedule Process
1. Doctor views "Missed" tab
2. Clicks "Reschedule" button
3. Selects new date and time
4. Appointment status changes to "scheduled"
5. Patient receives notification

## API Endpoints

### Reschedule Meeting
```
POST /api/meetings/{meeting_id}/reschedule
Body: {
  "scheduledAt": "2024-11-30T10:00:00Z"
}
```

## Meeting Statuses

- `scheduled` - Upcoming appointment
- `in_progress` - Currently happening
- `completed` - Successfully finished
- `missed` - Not attended (auto-marked after 30 min)
- `cancelled` - Manually cancelled

## Notifications

### When Meeting is Missed
- **Doctor**: "Missed Appointment - Appointment with {patient} was not attended"
- **Patient**: "Missed Appointment - Your appointment with Dr. {doctor} was not attended"

### When Meeting is Rescheduled
- **Patient**: "Appointment Rescheduled - Your appointment with Dr. {doctor} has been rescheduled"

## Usage Example

### Scenario: Missed Appointment
1. Meeting scheduled for Nov 29, 10:35 PM
2. At 11:05 PM (30 min later), automated check runs
3. Meeting status changes to "missed"
4. Both parties receive notifications
5. Meeting appears in "Missed" tab

### Scenario: Reschedule
1. Doctor opens "Missed" tab
2. Sees missed appointment with patient
3. Clicks "Reschedule" button
4. Selects new date: Nov 30, 2:00 PM
5. Clicks "Reschedule"
6. Appointment moves back to "Upcoming" tab
7. Patient receives notification

## Benefits

✅ **Automatic tracking** of missed appointments
✅ **Easy rescheduling** with one click
✅ **Organized view** with tabs (Upcoming/Missed/Completed)
✅ **Notifications** keep everyone informed
✅ **Grace period** (30 min) prevents false positives
✅ **Audit trail** of appointment history

## Tips

- Run the check command every 15 minutes for best results
- Grace period prevents marking meetings as missed too early
- Patients can also see their missed appointments
- Use reschedule feature to quickly book new time
- Delete missed appointments if no longer needed
