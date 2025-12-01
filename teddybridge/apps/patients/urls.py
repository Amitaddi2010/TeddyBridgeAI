from django.urls import path
from . import views, review_views

urlpatterns = [
    path('stats', views.patient_stats),
    path('doctors', views.get_doctors),
    path('surveys/pending', views.get_pending_surveys),
    path('surveys/completed', views.get_completed_surveys),
    path('appointments/upcoming', views.get_appointments_upcoming),
    path('appointments', views.get_appointments),
    path('reviews/submit', review_views.submit_review),
    path('reviews/doctor/<uuid:doctor_id>', review_views.get_doctor_reviews),
]
