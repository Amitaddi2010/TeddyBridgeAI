"""
Management command to create a superuser from environment variables.
This allows creating a superuser without interactive shell access.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

User = get_user_model()


class Command(BaseCommand):
    help = 'Creates a superuser from environment variables'

    def handle(self, *args, **options):
        admin_email = os.getenv('DJANGO_SUPERUSER_EMAIL')
        admin_password = os.getenv('DJANGO_SUPERUSER_PASSWORD')
        admin_username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')

        if not admin_email or not admin_password:
            self.stdout.write(
                self.style.WARNING(
                    'DJANGO_SUPERUSER_EMAIL and DJANGO_SUPERUSER_PASSWORD must be set. '
                    'Skipping superuser creation.'
                )
            )
            return

        if User.objects.filter(email=admin_email).exists():
            self.stdout.write(
                self.style.SUCCESS(f'Superuser with email {admin_email} already exists.')
            )
            return

        User.objects.create_superuser(
            email=admin_email,
            password=admin_password,
            username=admin_username
        )
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created superuser: {admin_email}')
        )

