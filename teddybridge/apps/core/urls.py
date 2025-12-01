from django.urls import path
from . import views
from . import ai_views

urlpatterns = [
    path('register', views.register),
    path('login', views.user_login),
    path('logout', views.user_logout),
    path('me', views.get_current_user),
    path('link/verify/<str:token>', views.verify_qr_token),
    path('link/patient', views.link_patient),
    path('teddy/chat', ai_views.teddy_ai_chat),
]

user_urlpatterns = [
    path('profile', views.update_profile),
    path('upload-avatar', views.upload_avatar),
    path('notifications', views.notifications_settings),
    path('notifications/list', views.get_notifications),
    path('notifications/<uuid:notification_id>/read', views.mark_notification_read),
    path('notifications/read-all', views.mark_all_notifications_read),
    path('change-password', views.change_password),
    path('delete-account', views.delete_account),
]
