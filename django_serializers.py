from rest_framework import serializers
from .models import User, Doctor, Patient, Meeting, Survey, CallNote, QRToken

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role', 'avatar_url', 'created_at']
        read_only_fields = ['id', 'created_at']

class DoctorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Doctor
        fields = ['id', 'user', 'specialty', 'license_number', 'verified', 'bio', 'created_at']
        read_only_fields = ['id', 'created_at']

class PatientSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Patient
        fields = ['id', 'user', 'date_of_birth', 'phone', 'address', 'emergency_contact', 'medical_history', 'created_at']
        read_only_fields = ['id', 'created_at']

class MeetingSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.name', read_only=True)
    patient_name = serializers.CharField(source='patient.user.name', read_only=True)
    
    class Meta:
        model = Meeting
        fields = ['id', 'doctor', 'doctor_name', 'patient', 'patient_name', 'title', 
                  'scheduled_at', 'started_at', 'ended_at', 'status', 'meeting_url', 
                  'recording_url', 'transcript_text', 'created_at']
        read_only_fields = ['id', 'created_at']

class SurveySerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.name', read_only=True)
    
    class Meta:
        model = Survey
        fields = ['id', 'doctor', 'doctor_name', 'title', 'description', 'questions', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

class CallNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CallNote
        fields = ['id', 'meeting', 'chief_complaint', 'hpi', 'past_medical_history', 
                  'medications', 'allergies', 'exam_observations', 'assessment', 'plan',
                  'urgent_flags', 'follow_up_questions', 'is_edited', 'created_at']
        read_only_fields = ['id', 'created_at']

class QRTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = QRToken
        fields = ['id', 'token', 'used', 'expires_at', 'created_at']
        read_only_fields = ['id', 'created_at']
