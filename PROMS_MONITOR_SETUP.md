# PROMS Monitor Setup Guide

## Installation Steps

### 1. Install Dependencies
```bash
pip install reportlab==4.0.7
```

### 2. Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 3. Access the Feature
Navigate to: **Doctor Dashboard → PROMS Monitor**

## Features

### 1. Dashboard Tab
- **View all patients** with Pre and Post-Surgery scores
- **Track improvement** with color-coded badges:
  - 🟢 Excellent: >20 point improvement
  - 🔵 Good: 10-20 point improvement
  - 🟡 Fair: 0-10 point improvement
  - 🔴 Poor: Negative improvement
- **Download PDF reports** for individual patients

### 2. Trends Tab
- **Interactive line chart** showing PROMS scores over time
- **Filters**:
  - Patient: All or specific patient
  - Score Type: All, Pre-Surgery, or Post-Surgery
  - Time Range: All time, Last 30 days, Last 90 days
- **Visual analytics** for outcome tracking

### 3. Add Score
- Record Pre-Surgery or Post-Surgery scores
- Enter score (0-100)
- Add billable codes (comma-separated): e.g., 27447, 27446, G0421
- Optional notes for additional context

### 4. PDF Document Generation
- **Patient Information**: Name, Doctor, Date
- **PROMS Results**: Pre-Surgery Score, Post-Surgery Score, Improvement
- **Billable Codes**: Automatically included from latest post-surgery entry
- **Professional formatting** ready for medical records

## API Endpoints

### Dashboard
```
GET /api/doctor/monitor/dashboard
```
Returns all patients with their latest pre/post scores

### Add Score
```
POST /api/doctor/monitor/scores/add
Body: {
  "patientId": "uuid",
  "scoreType": "pre_surgery" | "post_surgery",
  "score": 0-100,
  "billableCodes": ["27447", "27446"],
  "notes": "Optional notes"
}
```

### Trends Data
```
GET /api/doctor/monitor/trends?patientId=all&scoreType=all&timeRange=all
```
Query params:
- patientId: "all" or patient UUID
- scoreType: "all", "pre_surgery", "post_surgery"
- timeRange: "all", "30", "90"

### Generate PDF
```
GET /api/doctor/monitor/document/{patient_id}
```
Downloads PDF report for specified patient

### Patient History
```
GET /api/doctor/monitor/history/{patient_id}
```
Returns all PROMS scores for a patient

## Database Schema

### PromsScore Model
```python
{
  "id": UUID,
  "patient": ForeignKey(Patient),
  "doctor": ForeignKey(Doctor),
  "score_type": "pre_surgery" | "post_surgery",
  "score": Integer (0-100),
  "billable_codes": JSON Array,
  "notes": Text,
  "recorded_at": DateTime
}
```

## Usage Example

### 1. Add Pre-Surgery Score
1. Click "Add Score" button
2. Select patient: "Mike R."
3. Score Type: Pre-Surgery
4. Score: 45
5. Click "Add Score"

### 2. Add Post-Surgery Score
1. Click "Add Score" button
2. Select patient: "Mike R."
3. Score Type: Post-Surgery
4. Score: 72
5. Billable Codes: 27447, 27446, G0421
6. Click "Add Score"

### 3. View Dashboard
- Dashboard shows: Pre: 45, Post: 72, Improvement: 27
- Badge shows: "Excellent" (green)

### 4. Download PDF
- Click "PDF" button next to patient
- PDF downloads with all information

### 5. View Trends
- Switch to "Trends" tab
- Select filters (patient, type, time range)
- View interactive chart

## Benefits

✅ **Track patient outcomes** systematically
✅ **Generate professional reports** instantly
✅ **Visualize trends** for better insights
✅ **Document billable codes** for insurance
✅ **Monitor improvement** across all patients
✅ **Export data** as PDF for records

## Tips

- Record pre-surgery scores before procedures
- Record post-surgery scores at follow-up appointments
- Use consistent scoring methodology
- Review trends regularly to identify patterns
- Download PDFs for patient records and insurance claims
