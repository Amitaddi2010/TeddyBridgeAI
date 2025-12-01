from .models import Notification, User

def create_notification(user, notification_type, title, message, link=None):
    """Helper function to create notifications"""
    return Notification.objects.create(
        user=user,
        type=notification_type,
        title=title,
        message=message,
        link=link
    )
