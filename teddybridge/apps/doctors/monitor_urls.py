from django.urls import path
from . import monitor_views

urlpatterns = [
    path('dashboard', monitor_views.get_monitor_dashboard),
    path('scores/add', monitor_views.add_proms_score),
    path('trends', monitor_views.get_trends_data),
    path('document/<uuid:patient_id>', monitor_views.generate_proms_document),
    path('history/<uuid:patient_id>', monitor_views.get_patient_proms_history),
]
