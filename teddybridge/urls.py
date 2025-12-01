from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from teddybridge.apps.core import views as core_views
from teddybridge.apps.core.urls import user_urlpatterns

from teddybridge.apps.doctors import survey_views

urlpatterns = [
    path('', core_views.api_info),  # Root endpoint
    path('api/health', core_views.health_check),  # Health check endpoint
    path('admin/', admin.site.urls),
    path('api/auth/', include('teddybridge.apps.core.urls')),
    path('api/user/', include(user_urlpatterns)),
    path('api/doctor/', include('teddybridge.apps.doctors.urls')),
    path('api/doctor/monitor/', include('teddybridge.apps.doctors.monitor_urls')),
    path('api/patient/', include('teddybridge.apps.patients.urls')),
    path('api/meetings', include('teddybridge.apps.meetings.urls')),
    path('api/qr/', include('teddybridge.apps.doctors.qr_urls')),
    path('api/link/verify/<str:token>', core_views.verify_qr_token),
    path('api/link/patient', core_views.link_patient),
    path('api/surveys', survey_views.create_survey),
    path('api/surveys/<uuid:survey_id>', survey_views.get_survey),
    path('api/surveys/<uuid:survey_id>/respond', survey_views.submit_survey_response),
    path('api/peers/', include('teddybridge.apps.core.peer_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
