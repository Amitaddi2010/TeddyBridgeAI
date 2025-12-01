from django.contrib import admin
from .models import User, Doctor, Patient, QRToken, DoctorPatientLink, Meeting, RecordingConsent, CallNote, Survey, SurveyResponse, AuditLog

admin.site.register(User)
admin.site.register(Doctor)
admin.site.register(Patient)
admin.site.register(QRToken)
admin.site.register(DoctorPatientLink)
admin.site.register(Meeting)
admin.site.register(RecordingConsent)
admin.site.register(CallNote)
admin.site.register(Survey)
admin.site.register(SurveyResponse)
admin.site.register(AuditLog)
