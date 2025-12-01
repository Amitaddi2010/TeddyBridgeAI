from django.urls import path
from . import views

urlpatterns = [
    path('', views.create_meeting),
    path('/<uuid:meeting_id>', views.get_meeting),
    path('/<uuid:meeting_id>/delete', views.delete_meeting),
    path('/<uuid:meeting_id>/reschedule', views.reschedule_meeting),
    path('/<uuid:meeting_id>/consent', views.update_consent),
    path('/<uuid:meeting_id>/startRecording', views.start_recording),
    path('/<uuid:meeting_id>/uploadRecording', views.upload_recording),
    path('/notes/generate', views.generate_notes),
]
