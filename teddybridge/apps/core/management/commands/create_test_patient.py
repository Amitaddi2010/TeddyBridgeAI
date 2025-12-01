from django.core.management.base import BaseCommand
from teleclinic.apps.core.models import User, Patient, Doctor, DoctorPatientLink

class Command(BaseCommand):
    help = 'Create a test patient and link to doctor'

    def handle(self, *args, **options):
        doctor_email = 'amit.addi2010@gmail.com'
        
        try:
            doctor_user = User.objects.get(email=doctor_email)
            doctor = doctor_user.doctor_profile
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Doctor with email {doctor_email} not found'))
            return
        
        patient_user, created = User.objects.get_or_create(
            email='test.patient@example.com',
            defaults={
                'name': 'Test Patient',
                'role': 'patient',
            }
        )
        
        if created:
            patient_user.set_password('password123')
            patient_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created user: {patient_user.email}'))
        
        patient, created = Patient.objects.get_or_create(
            user=patient_user,
            defaults={'phone': '+1234567890'}
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created patient profile'))
        
        link, created = DoctorPatientLink.objects.get_or_create(
            doctor=doctor,
            patient=patient
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Linked patient to doctor'))
        
        self.stdout.write(self.style.SUCCESS(f'Patient ID: {patient.id}'))
        self.stdout.write(self.style.SUCCESS('Done! You can now create appointments with this patient.'))
