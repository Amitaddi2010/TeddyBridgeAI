# TeddyCare Precise - Features & API Documentation

## Overview
TeddyCare Precise (powered by TeddyBridge) is a comprehensive healthcare platform that enables secure telemedicine consultations, patient outcome tracking, peer networking, and AI-powered assistance. This document outlines all features and the APIs used to power them.

---

## 1. Authentication & User Management

### Features
- **Email/Password Authentication** - Secure user registration and login
- **Google OAuth Sign-In** - One-click authentication via Google
- **Role-Based Access Control** - Separate doctor and patient dashboards
- **User Profile Management** - Update profile information, specialty, license numbers

### APIs Used
- **Firebase Authentication API** (`firebase/auth`)
  - Email/password authentication
  - Google OAuth provider
  - Token generation and verification
  - Password reset functionality

- **Firebase Admin SDK** (`firebase-admin`)
  - Server-side token verification
  - User management
  - UID synchronization

### API Endpoints
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/google-signin
GET  /api/user/me
```

---

## 2. Video Consultations (Twilio Video)

### Features
- **Secure Video Calls** - HIPAA-compliant video consultations between doctors and patients
- **Doctor-to-Doctor Consultations** - Peer-to-peer specialist consultations
- **Audio-Only Mode** - Option to switch to audio-only calls
- **Recording Capabilities** - Record consultations with consent
- **Real-time Controls** - Mute, video toggle, settings adjustment
- **Consent Management** - Recording consent workflow with scroll-to-accept

### APIs Used
- **Twilio Video API** (`twilio-video`)
  - WebRTC video/audio connections
  - Room creation and management
  - Token generation for secure access
  - Participant management
  - Track publishing/subscribing

- **Twilio REST API**
  - Account management
  - API key generation
  - Service configuration

### API Endpoints
```
POST /api/meetings                    - Create new meeting
GET  /api/meetings/{meeting_id}      - Get meeting details
POST /api/meetings/{meeting_id}/consent - Grant recording consent
POST /api/meetings/{meeting_id}/startRecording - Start recording
POST /api/meetings/{meeting_id}/uploadRecording - Upload recording file
POST /api/meetings/{meeting_id}/reschedule - Reschedule appointment
DELETE /api/meetings/{meeting_id}    - Delete meeting
```

---

## 3. AI Assistant (Teddy Talk)

### Features
- **Intelligent Chat Assistant** - AI-powered assistant for patients and doctors
- **Context-Aware Responses** - Understands user role and linked relationships
- **Doctor Recommendations** - Suggests doctors based on reviews and specialty
- **Platform Guidance** - Helps users navigate features and understand functionality
- **Medical Information** - Provides general health information (with disclaimers)

### APIs Used
- **Groq API** (`groq`)
  - Model: `mixtral-8x7b-32768`
  - Chat completions for AI assistant
  - Context-aware responses
  - Medical information processing

### API Endpoints
```
POST /api/ai/chat
Body: {
  "message": "user message"
}
Response: {
  "response": "AI assistant response"
}
```

---

## 4. QR Code Patient Linking

### Features
- **QR Code Generation** - Doctors can generate unique QR codes for patient linking
- **One-Time Tokens** - Secure token-based linking system
- **Quick Patient Add** - Patients can link to doctors via QR scan or manual entry
- **Token Verification** - Secure verification before linking

### APIs Used
- **QR Code Generation Library** (`qrcode` npm package)
  - QR code image generation
  - Data URL encoding

### API Endpoints
```
GET  /api/qr/generate                 - Generate QR code (doctor-only)
GET  /api/qr/tokens                   - List active QR tokens
GET  /api/link/verify/{token}         - Verify QR token
POST /api/link/patient                - Link patient to doctor
```

---

## 5. PROMS Monitoring System

### Features
- **Pre/Post Surgery Tracking** - Record and monitor patient outcome scores
- **Dashboard View** - Comprehensive patient score dashboard with improvement indicators
- **Trend Analysis** - Interactive charts showing score trends over time
- **Filtering Options** - Filter by patient, score type, and time range (30/90 days, all time)
- **PDF Report Generation** - Generate professional PDF reports with billable codes
- **Billable Codes** - Track CPT codes (27447, 27446, G0421) for insurance
- **Multiple PROMS Support** - PROMIS, KOOS, and custom assessment tools

### APIs Used
- **ReportLab** (`reportlab` Python library)
  - PDF document generation
  - Professional medical report formatting

### API Endpoints
```
GET  /api/doctor/monitor/dashboard                    - Get all patients with scores
POST /api/doctor/monitor/scores/add                  - Add new PROMS score
GET  /api/doctor/monitor/trends                      - Get trend data with filters
GET  /api/doctor/monitor/document/{patient_id}       - Generate PDF report
GET  /api/doctor/monitor/history/{patient_id}        - Get patient score history
```

### Score Types
- `pre_surgery` - Pre-operative assessment
- `post_surgery` - Post-operative assessment

### Improvement Badges
- 🟢 Excellent: >20 point improvement
- 🔵 Good: 10-20 point improvement
- 🟡 Fair: 0-10 point improvement
- 🔴 Poor: Negative improvement

---

## 6. Surveys & Assessments

### Features
- **Survey Creation** - Doctors can create custom surveys with multiple question types
- **Patient Distribution** - Send surveys to linked patients
- **Response Tracking** - View patient responses and completion status
- **Survey Management** - Update, view details, and analyze responses

### API Endpoints
```
POST /api/surveys                                    - Create new survey
GET  /api/surveys/{survey_id}                        - Get survey details
POST /api/surveys/{survey_id}/respond                 - Submit survey response
GET  /api/doctor/surveys                             - List doctor's surveys
GET  /api/doctor/surveys/{survey_id}                 - Get survey details
GET  /api/doctor/surveys/{survey_id}/responses       - Get survey responses
PUT  /api/doctor/surveys/{survey_id}/update          - Update survey
GET  /api/patient/surveys/pending                    - Get pending surveys
GET  /api/patient/surveys/completed                  - Get completed surveys
```

---

## 7. Peer Network & Social Features

### Features
- **Peer Search** - Find other doctors (for doctors) or patients (for patients)
- **Real-time Chat** - Messaging between peers
- **Peer Meetings** - Schedule and manage peer-to-peer consultations
- **Social Feed** - View posts and updates from peers
- **Post Creation** - Share updates and information
- **Likes & Comments** - Engage with peer content

### API Endpoints
```
GET    /api/peers/search                             - Search for peers
GET    /api/peers/chat/conversations                 - Get all conversations
GET    /api/peers/chat/unread-count                  - Get unread message count
GET    /api/peers/chat/{peer_id}                     - Get chat messages with peer
POST   /api/peers/chat/send                          - Send chat message
GET    /api/peers/meetings                           - Get peer meetings
POST   /api/peers/meetings/create                    - Create peer meeting
POST   /api/peers/meetings/{meeting_id}/start        - Start peer meeting
DELETE /api/peers/meetings/{meeting_id}              - Delete peer meeting
GET    /api/peers/feed                               - Get social feed
POST   /api/peers/posts/create                       - Create post
POST   /api/peers/posts/{post_id}/like               - Toggle like on post
GET    /api/peers/posts/{post_id}/comments           - Get post comments
DELETE /api/peers/posts/{post_id}                    - Delete post
```

---

## 8. Clinical Notes & Transcription

### Features
- **AI-Generated Clinical Notes** - Automatic generation of structured clinical notes from transcripts
- **Recording Transcription** - Convert recorded consultations to text
- **Note Management** - View and manage clinical notes for patients
- **Structured Format** - Notes formatted for medical records

### APIs Used
- **Groq API** (`groq`)
  - Model: `mixtral-8x7b-32768`
  - Clinical note generation from transcripts
  - Structured medical documentation

- **AssemblyAI API** (`assemblyai`) - Optional
  - Speech-to-text transcription
  - Audio file processing
  - Webhook callbacks for transcription completion

### API Endpoints
```
POST /api/meetings/notes/generate                     - Generate clinical notes
GET  /api/doctor/notes                                - Get all clinical notes
```

---

## 9. Notifications System

### Features
- **Real-time Notifications** - In-app notification bell with unread count
- **Automatic Notifications** - System-generated notifications for:
  - New appointments
  - AI notes ready
  - Survey responses
  - Appointment reminders (24h and 1h before)
- **Notification Management** - Mark as read, view all, navigate to related content

### API Endpoints
```
GET  /api/user/notifications/list                    - Get all notifications
POST /api/user/notifications/{id}/read               - Mark notification as read
POST /api/user/notifications/read-all                - Mark all as read
```

### Notification Types
- `appointment` - Appointment-related (blue dot)
- `note` - Clinical notes (green dot)
- `survey` - Survey-related (purple dot)
- `general` - General notifications (gray dot)

---

## 10. Appointment Management

### Features
- **Appointment Scheduling** - Create and manage appointments
- **Status Tracking** - Track appointment status (scheduled, in_progress, completed, missed, cancelled)
- **Missed Appointment Detection** - Automatic detection of missed appointments (30 min grace period)
- **Rescheduling** - Easy reschedule functionality for missed appointments
- **Appointment Tabs** - Organized view: Upcoming, Missed, Completed
- **Reminders** - Automated reminders at 24 hours and 1 hour before appointment

### API Endpoints
```
GET  /api/doctor/appointments                        - Get all appointments
GET  /api/doctor/appointments/upcoming               - Get upcoming appointments
GET  /api/patient/appointments                       - Get patient appointments
POST /api/meetings/{meeting_id}/reschedule           - Reschedule appointment
```

---

## 11. Patient & Doctor Management

### Features
- **Patient Dashboard** - View linked doctors, surveys, appointments
- **Doctor Dashboard** - View linked patients, appointments, surveys, PROMS data
- **Patient Linking** - Manage doctor-patient relationships
- **Profile Management** - Update doctor specialty, license numbers, bio
- **Statistics** - View stats for doctors and patients

### API Endpoints
```
GET  /api/doctor/stats                                - Get doctor statistics
GET  /api/doctor/patients                            - Get linked patients
GET  /api/doctor/patients/recent                     - Get recently linked patients
GET  /api/doctor/patients/{patient_id}               - Get patient details
GET  /api/patient/stats                              - Get patient statistics
GET  /api/patient/doctors                            - Get linked doctors
```

---

## 12. Review System

### Features
- **Doctor Reviews** - Patients can rate and review doctors (1-5 stars)
- **Review Display** - Average ratings and review counts shown to patients
- **AI Recommendations** - AI assistant uses reviews to recommend doctors
- **Review Filtering** - Prioritize doctors with higher ratings (4+ stars)

### Database Models
- `DoctorReview` - Stores patient reviews and ratings
- Average rating calculation
- Review count aggregation

---

## Technical Stack & Infrastructure

### Backend
- **Framework**: Django REST Framework
- **Database**: PostgreSQL (with SQLite fallback for development)
- **ORM**: Django ORM
- **Authentication**: Django Session Auth + Firebase

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui components
- **Styling**: TailwindCSS
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)

### External Services
1. **Firebase** - Authentication
2. **Twilio Video** - Video conferencing
3. **Groq** - AI/LLM services
4. **AssemblyAI** - Speech-to-text (optional)
5. **ReportLab** - PDF generation

### Deployment
- **Backend**: Render.com
- **Frontend**: Vercel
- **Database**: PostgreSQL (Render managed)

---

## API Base URLs

### Development
- Backend: `http://localhost:8000/api`
- Frontend: `http://localhost:5173`

### Production
- Backend: `https://teddybridge-api.onrender.com/api`
- Frontend: `https://your-vercel-url.vercel.app`

---

## Security & Compliance

### HIPAA Compliance
- End-to-end encryption for video calls
- Secure token-based authentication
- Encrypted data storage
- Audit logging capabilities
- Consent management for recordings

### Security Features
- Firebase token verification
- CORS protection
- CSRF protection
- Secure session management
- Role-based access control

---

## Environment Variables Required

### Backend (Render)
```
GROQ_API_KEY
ASSEMBLYAI_API_KEY (optional)
TWILIO_ACCOUNT_SID
TWILIO_API_KEY
TWILIO_API_SECRET
FIREBASE_CREDENTIALS_JSON
DJANGO_SECRET_KEY
DJANGO_DEBUG
ALLOWED_HOSTS
CORS_ALLOWED_ORIGINS
```

### Frontend (Vercel)
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_APP_ID
VITE_API_BASE_URL
```

---

## Summary

TeddyCare Precise provides a comprehensive telemedicine platform with:
- ✅ Secure video consultations (Twilio)
- ✅ AI-powered assistant (Groq)
- ✅ PROMS outcome tracking
- ✅ Survey management
- ✅ Peer networking
- ✅ Clinical note generation
- ✅ QR-based patient linking
- ✅ Real-time notifications
- ✅ Appointment management
- ✅ Review system

All features are built with HIPAA compliance in mind and use industry-standard APIs for security and reliability.

