from django.urls import path
from . import views
from . import survey_views
from . import meeting_views

urlpatterns = [
    path('stats', views.doctor_stats),
    path('patients', views.get_patients),
    path('patients/recent', views.get_patients_recent),
    path('patients/top', views.get_patients_top),
    path('patients/<uuid:patient_id>', views.get_patient),
    path('appointments', meeting_views.get_appointments),
    path('appointments/upcoming', views.get_appointments_upcoming),
    path('appointments/recent', views.get_appointments_recent),
    path('appointments/statistics', views.get_appointment_statistics),
    path('meetings', meeting_views.get_meetings),
    path('notes', meeting_views.get_notes),
    path('qr/generate', views.generate_qr),
    path('qr/tokens', views.get_qr_tokens),
    path('surveys', survey_views.get_surveys),
    path('surveys/create', survey_views.create_survey),
    path('surveys/<uuid:survey_id>', survey_views.get_survey_detail),
    path('surveys/<uuid:survey_id>/responses', survey_views.get_survey_responses),
    path('surveys/<uuid:survey_id>/update', survey_views.update_survey),
]
