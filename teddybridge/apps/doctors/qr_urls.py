from django.urls import path
from . import views

urlpatterns = [
    path('generate', views.generate_qr),
    path('tokens', views.get_qr_tokens),
]
