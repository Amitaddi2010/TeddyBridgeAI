from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
import uuid

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'doctor')
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [('doctor', 'Doctor'), ('patient', 'Patient')]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    username = models.CharField(max_length=100, blank=True, null=True, help_text='Display username')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    avatar_url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    email_appointments = models.BooleanField(default=True)
    email_notes = models.BooleanField(default=True)
    email_surveys = models.BooleanField(default=True)
    firebase_uid = models.CharField(max_length=255, blank=True, null=True, help_text='Firebase UID for Google-signup users')
    created_at = models.DateTimeField(auto_now_add=True)
    
    objects = UserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name', 'role']
    
    class Meta:
        db_table = 'users'

class Doctor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
    specialty = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=255, blank=True, null=True)
    license_number = models.CharField(max_length=100, blank=True, null=True)
    verified = models.BooleanField(default=False)
    bio = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'doctors'

class Patient(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_profile')
    date_of_birth = models.DateField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    emergency_contact = models.CharField(max_length=255, blank=True, null=True)
    medical_history = models.TextField(blank=True, null=True)
    medical_conditions = models.JSONField(blank=True, null=True, help_text='List of medical conditions/issues')
    gender = models.CharField(max_length=50, blank=True, null=True)
    age = models.IntegerField(blank=True, null=True)
    procedure = models.CharField(max_length=255, blank=True, null=True, help_text='Medical procedure or treatment')
    connect_to_peers = models.BooleanField(default=False, help_text='Allow connection with other patients')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'patients'

class QRToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.CharField(max_length=255, unique=True)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='qr_tokens')
    used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'qr_tokens'

class DoctorPatientLink(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='patient_links')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='doctor_links')
    source = models.CharField(max_length=50, default='qr')
    linked_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'doctor_patient_links'
        unique_together = ['doctor', 'patient']

class Meeting(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('missed', 'Missed'),
        ('transcription_pending', 'Transcription Pending'),
        ('transcription_failed', 'Transcription Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='meetings')
    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, related_name='meetings')
    title = models.CharField(max_length=255, blank=True, null=True)
    scheduled_at = models.DateTimeField(blank=True, null=True)
    started_at = models.DateTimeField(blank=True, null=True)
    ended_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='scheduled')
    meeting_url = models.URLField(blank=True, null=True)
    daily_room_url = models.URLField(blank=True, null=True)
    recording_url = models.URLField(blank=True, null=True)
    transcript_url = models.URLField(blank=True, null=True)
    transcript_text = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'meetings'

class RecordingConsent(models.Model):
    CONSENT_CHOICES = [
        ('pending', 'Pending'),
        ('granted', 'Granted'),
        ('denied', 'Denied'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='consents')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=CONSENT_CHOICES, default='pending')
    consented_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'recording_consents'

class CallNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='call_notes')
    chief_complaint = models.TextField(blank=True, null=True)
    hpi = models.TextField(blank=True, null=True)
    past_medical_history = models.TextField(blank=True, null=True)
    medications = models.TextField(blank=True, null=True)
    allergies = models.TextField(blank=True, null=True)
    exam_observations = models.TextField(blank=True, null=True)
    assessment = models.TextField(blank=True, null=True)
    plan = models.TextField(blank=True, null=True)
    urgent_flags = models.JSONField(blank=True, null=True)
    follow_up_questions = models.JSONField(blank=True, null=True)
    ai_metadata = models.JSONField(blank=True, null=True)
    is_edited = models.BooleanField(default=False)
    edited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='edited_notes')
    edited_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'call_notes'

class Survey(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='surveys')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    questions = models.JSONField()
    is_active = models.BooleanField(default=True)
    assigned_patients = models.JSONField(blank=True, null=True, help_text='List of patient IDs')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'surveys'

class SurveyResponse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='responses')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='survey_responses')
    answers = models.JSONField()
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'survey_responses'

class Notification(models.Model):
    TYPE_CHOICES = [
        ('appointment', 'Appointment'),
        ('note', 'Note'),
        ('survey', 'Survey'),
        ('general', 'General'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

class PromsScore(models.Model):
    SCORE_TYPE_CHOICES = [
        ('pre_surgery', 'Pre-Surgery'),
        ('post_surgery', 'Post-Surgery'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='proms_scores')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='proms_scores')
    score_type = models.CharField(max_length=20, choices=SCORE_TYPE_CHOICES)
    score = models.IntegerField()
    billable_codes = models.JSONField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'proms_scores'
        ordering = ['-recorded_at']

class DoctorReview(models.Model):
    """Patient reviews and recommendations for doctors"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='reviews')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='doctor_reviews')
    rating = models.IntegerField(help_text='Rating from 1 to 5 stars')
    comment = models.TextField(blank=True, null=True, help_text='Patient recommendation/feedback')
    meeting = models.ForeignKey('Meeting', on_delete=models.SET_NULL, null=True, blank=True, related_name='review')
    is_anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'doctor_reviews'
        ordering = ['-created_at']
        unique_together = [['doctor', 'patient']]  # One review per patient per doctor
    
    def __str__(self):
        return f"{self.patient.user.name} - {self.doctor.user.name} ({self.rating} stars)"

class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=255)
    resource_type = models.CharField(max_length=100, blank=True, null=True)
    resource_id = models.CharField(max_length=255, blank=True, null=True)
    data = models.JSONField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'

class PeerConnection(models.Model):
    """Connection between two users (patient-patient or doctor-doctor)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='peer_connections_1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='peer_connections_2')
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('blocked', 'Blocked'),
    ], default='accepted')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'peer_connections'
        unique_together = ['user1', 'user2']

class ChatMessage(models.Model):
    """Chat messages between peers"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']

class PeerMeeting(models.Model):
    """Meetings between peers (patient-patient or doctor-doctor)"""
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('missed', 'Missed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_peer_meetings')
    participant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='peer_meetings')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    scheduled_at = models.DateTimeField()
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='scheduled')
    meeting_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'peer_meetings'
        ordering = ['-scheduled_at']

class Post(models.Model):
    """Social posts visible to all users with same role"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField()
    image_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'posts'
        ordering = ['-created_at']

class PostLike(models.Model):
    """Likes on posts"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post_likes')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'post_likes'
        unique_together = ['post', 'user']

class PostComment(models.Model):
    """Comments on posts"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post_comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'post_comments'
        ordering = ['created_at']
