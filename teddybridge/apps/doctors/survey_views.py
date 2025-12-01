from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from teddybridge.apps.core.models import Doctor, Survey, SurveyResponse
from teddybridge.apps.core.notifications import create_notification

@api_view(['GET'])
def get_surveys(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
    except Doctor.DoesNotExist:
        doctor = Doctor.objects.create(user=request.user)
    
    surveys = Survey.objects.filter(doctor=doctor)
    
    result = [{
        'id': str(s.id),
        'title': s.title,
        'description': s.description,
        'questionCount': len(s.questions) if s.questions else 0,
        'isActive': s.is_active,
        'createdAt': s.created_at.isoformat(),
        'responseCount': SurveyResponse.objects.filter(survey=s).count(),
    } for s in surveys]
    
    return Response(result)

@api_view(['POST'])
def create_survey(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        doctor = request.user.doctor_profile
    except Doctor.DoesNotExist:
        doctor = Doctor.objects.create(user=request.user)
    
    title = request.data.get('title')
    description = request.data.get('description')
    questions = request.data.get('questions', [])
    assigned_patients = request.data.get('assignedPatients', [])
    
    survey = Survey.objects.create(
        doctor=doctor,
        title=title,
        description=description,
        questions=questions,
        assigned_patients=assigned_patients,
        is_active=True
    )
    
    # Notify assigned patients
    from teddybridge.apps.core.models import Patient
    from teddybridge.apps.core.notifications import create_notification
    for patient_id in assigned_patients:
        try:
            patient = Patient.objects.get(id=patient_id)
            create_notification(
                user=patient.user,
                notification_type='survey',
                title='New Survey Assigned',
                message=f'Dr. {doctor.user.name} assigned you a survey: {title}',
                link='/patient/surveys'
            )
        except Patient.DoesNotExist:
            pass
    
    return Response({
        'id': str(survey.id),
        'title': survey.title,
        'description': survey.description,
    })

@api_view(['GET'])
def get_survey(request, survey_id):
    try:
        survey = Survey.objects.select_related('doctor__user').get(id=survey_id)
        
        return Response({
            'id': str(survey.id),
            'title': survey.title,
            'description': survey.description,
            'doctorName': survey.doctor.user.name,
            'questions': survey.questions,
        })
    except Survey.DoesNotExist:
        return Response({'error': 'Survey not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def submit_survey_response(request, survey_id):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'patient':
        return Response({'error': 'Only patients can submit responses'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        from teddybridge.apps.core.models import Patient
        patient = request.user.patient_profile
    except Patient.DoesNotExist:
        return Response({'error': 'Patient profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    answers = request.data.get('answers')
    
    try:
        survey = Survey.objects.get(id=survey_id)
        SurveyResponse.objects.create(
            survey=survey,
            patient=patient,
            answers=answers
        )
        
        # Notify doctor about survey response
        create_notification(
            user=survey.doctor.user,
            notification_type='survey',
            title='New Survey Response',
            message=f'{patient.user.name} completed the survey: {survey.title}',
            link=f'/doctor/surveys'
        )
        
        return Response({'success': True})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_survey_detail(request, survey_id):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        survey = Survey.objects.get(id=survey_id, doctor=request.user.doctor_profile)
        
        return Response({
            'id': str(survey.id),
            'title': survey.title,
            'description': survey.description,
            'questions': survey.questions,
            'isActive': survey.is_active,
            'createdAt': survey.created_at.isoformat(),
        })
    except Survey.DoesNotExist:
        return Response({'error': 'Survey not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def get_survey_responses(request, survey_id):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        survey = Survey.objects.get(id=survey_id, doctor=request.user.doctor_profile)
        responses = SurveyResponse.objects.filter(survey=survey).select_related('patient__user')
        
        result = [{
            'id': str(r.id),
            'patientName': r.patient.user.name,
            'patientEmail': r.patient.user.email,
            'answers': r.answers,
            'submittedAt': r.submitted_at.isoformat(),
        } for r in responses]
        
        return Response(result)
    except Survey.DoesNotExist:
        return Response({'error': 'Survey not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PATCH'])
def update_survey(request, survey_id):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.role != 'doctor':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        survey = Survey.objects.get(id=survey_id, doctor=request.user.doctor_profile)
        
        if 'title' in request.data:
            survey.title = request.data['title']
        if 'description' in request.data:
            survey.description = request.data['description']
        if 'questions' in request.data:
            survey.questions = request.data['questions']
        if 'isActive' in request.data:
            survey.is_active = request.data['isActive']
        
        survey.save()
        
        return Response({'success': True})
    except Survey.DoesNotExist:
        return Response({'error': 'Survey not found'}, status=status.HTTP_404_NOT_FOUND)
