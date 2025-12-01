from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from teddybridge.apps.core.models import Patient, DoctorPatientLink, Meeting, Doctor, DoctorReview

@api_view(['POST'])
def submit_review(request):
    """Submit a review/recommendation for a doctor"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'patient':
        return Response({'error': 'Only patients can submit reviews'}, status=status.HTTP_403_FORBIDDEN)
    
    doctor_id = request.data.get('doctorId')
    rating = request.data.get('rating')
    comment = request.data.get('comment', '')
    meeting_id = request.data.get('meetingId')
    is_anonymous = request.data.get('isAnonymous', False)
    
    if not doctor_id or not rating:
        return Response({'error': 'doctorId and rating are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if rating < 1 or rating > 5:
        return Response({'error': 'Rating must be between 1 and 5'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        patient = request.user.patient_profile
    except Patient.DoesNotExist:
        return Response({'error': 'Patient profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    try:
        doctor = Doctor.objects.get(id=doctor_id)
    except Doctor.DoesNotExist:
        return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if patient is linked to this doctor
    link = DoctorPatientLink.objects.filter(patient=patient, doctor=doctor).first()
    if not link:
        return Response({'error': 'You must be linked to this doctor to submit a review'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get or create review (one review per patient per doctor)
    meeting = None
    if meeting_id:
        try:
            meeting = Meeting.objects.get(id=meeting_id, patient=patient, doctor=doctor)
        except Meeting.DoesNotExist:
            pass
    
    review, created = DoctorReview.objects.update_or_create(
        doctor=doctor,
        patient=patient,
        defaults={
            'rating': rating,
            'comment': comment,
            'meeting': meeting,
            'is_anonymous': is_anonymous,
        }
    )
    
    return Response({
        'id': str(review.id),
        'rating': review.rating,
        'comment': review.comment,
        'createdAt': review.created_at.isoformat(),
        'updated': not created,
    })

@api_view(['GET'])
def get_doctor_reviews(request, doctor_id):
    """Get all reviews for a doctor"""
    try:
        doctor = Doctor.objects.get(id=doctor_id)
    except Doctor.DoesNotExist:
        return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)
    
    reviews = DoctorReview.objects.filter(doctor=doctor).select_related('patient__user').order_by('-created_at')
    
    result = [{
        'id': str(r.id),
        'rating': r.rating,
        'comment': r.comment,
        'patientName': 'Anonymous' if r.is_anonymous else r.patient.user.name,
        'patientAvatar': None if r.is_anonymous else r.patient.user.avatar_url,
        'createdAt': r.created_at.isoformat(),
        'updatedAt': r.updated_at.isoformat(),
    } for r in reviews]
    
    return Response(result)

