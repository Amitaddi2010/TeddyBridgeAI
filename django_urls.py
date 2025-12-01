from django.contrib import admin
from django.urls import path, include

# Main URL Configuration
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('teleclinic.apps.core.urls')),
    path('api/doctor/', include('teleclinic.apps.doctors.urls')),
    path('api/patient/', include('teleclinic.apps.patients.urls')),
    path('api/meetings/', include('teleclinic.apps.meetings.urls')),
]

# Core App URLs (teleclinic/apps/core/urls.py)
core_urls = """
from django.urls import path
from . import views

urlpatterns = [
    path('register', views.register, name='register'),
    path('login', views.user_login, name='login'),
    path('logout', views.user_logout, name='logout'),
    path('me', views.get_current_user, name='current_user'),
]
"""

# Doctor App URLs (teleclinic/apps/doctors/urls.py)
doctor_urls = """
from django.urls import path
from . import views

urlpatterns = [
    path('stats', views.doctor_stats, name='doctor_stats'),
    path('patients', views.get_patients, name='get_patients'),
    path('appointments', views.get_appointments, name='get_appointments'),
    path('meetings', views.get_meetings, name='get_meetings'),
    path('notes', views.get_notes, name='get_notes'),
    path('surveys', views.get_surveys, name='get_surveys'),
    path('qr/generate', views.generate_qr, name='generate_qr'),
]
"""

# Patient App URLs (teleclinic/apps/patients/urls.py)
patient_urls = """
from django.urls import path
from . import views

urlpatterns = [
    path('stats', views.patient_stats, name='patient_stats'),
    path('doctors', views.get_doctors, name='get_doctors'),
    path('appointments', views.get_appointments, name='get_appointments'),
    path('surveys/pending', views.get_pending_surveys, name='pending_surveys'),
    path('surveys/completed', views.get_completed_surveys, name='completed_surveys'),
]
"""

# Meeting App URLs (teleclinic/apps/meetings/urls.py)
meeting_urls = """
from django.urls import path
from . import views

urlpatterns = [
    path('<uuid:meeting_id>', views.get_meeting, name='get_meeting'),
    path('<uuid:meeting_id>/consent', views.update_consent, name='update_consent'),
    path('<uuid:meeting_id>/startRecording', views.start_recording, name='start_recording'),
    path('notes/generate', views.generate_call_notes, name='generate_notes'),
]
"""

# QR Link URLs (add to core urls)
qr_urls = """
    path('link/verify/<str:token>', views.verify_qr_token, name='verify_qr'),
    path('link/patient', views.link_patient, name='link_patient'),
"""
