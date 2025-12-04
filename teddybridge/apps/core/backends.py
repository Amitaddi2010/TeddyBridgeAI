"""
Custom authentication backend for Django to authenticate users by email
"""
from django.contrib.auth.backends import ModelBackend
from .models import User


class EmailAuthBackend(ModelBackend):
    """
    Custom authentication backend that authenticates users by email
    """
    def authenticate(self, request, email=None, password=None, **kwargs):
        if email is None:
            email = kwargs.get('email')
        if email is None or password is None:
            return None
        try:
            user = User.objects.get(email=email)
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
        except User.DoesNotExist:
            return None
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

