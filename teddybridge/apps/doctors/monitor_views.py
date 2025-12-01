from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.http import HttpResponse
from teddybridge.apps.core.models import Doctor, Patient, PromsScore
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from io import BytesIO

@api_view(['GET'])
def get_monitor_dashboard(request):
    if not request.user.is_authenticated or request.user.role != 'doctor':
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        doctor = request.user.doctor_profile
    except Doctor.DoesNotExist:
        return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get all patients with their latest scores
    patients = Patient.objects.filter(doctor_links__doctor=doctor).distinct()
    
    dashboard_data = []
    for patient in patients:
        pre_score = PromsScore.objects.filter(
            patient=patient,
            doctor=doctor,
            score_type='pre_surgery'
        ).order_by('-recorded_at').first()
        
        post_score = PromsScore.objects.filter(
            patient=patient,
            doctor=doctor,
            score_type='post_surgery'
        ).order_by('-recorded_at').first()
        
        dashboard_data.append({
            'patientId': str(patient.id),
            'patientName': patient.user.name,
            'preScore': pre_score.score if pre_score else None,
            'postScore': post_score.score if post_score else None,
            'improvement': (post_score.score - pre_score.score) if (pre_score and post_score) else None,
            'lastUpdated': (post_score.recorded_at if post_score else pre_score.recorded_at).isoformat() if (pre_score or post_score) else None,
        })
    
    return Response(dashboard_data)

@api_view(['POST'])
def add_proms_score(request):
    if not request.user.is_authenticated or request.user.role != 'doctor':
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        doctor = request.user.doctor_profile
    except Doctor.DoesNotExist:
        return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    patient_id = request.data.get('patientId')
    score_type = request.data.get('scoreType')
    score = request.data.get('score')
    billable_codes = request.data.get('billableCodes', [])
    notes = request.data.get('notes', '')
    
    try:
        patient = Patient.objects.get(id=patient_id)
    except Patient.DoesNotExist:
        return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
    
    proms_score = PromsScore.objects.create(
        patient=patient,
        doctor=doctor,
        score_type=score_type,
        score=score,
        billable_codes=billable_codes,
        notes=notes
    )
    
    return Response({
        'id': str(proms_score.id),
        'success': True
    })

@api_view(['GET'])
def get_trends_data(request):
    if not request.user.is_authenticated or request.user.role != 'doctor':
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        doctor = request.user.doctor_profile
    except Doctor.DoesNotExist:
        return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get filter parameters
    patient_id = request.GET.get('patientId', 'all')
    score_type = request.GET.get('scoreType', 'all')
    time_range = request.GET.get('timeRange', 'all')
    
    # Base query
    scores = PromsScore.objects.filter(doctor=doctor)
    
    # Apply filters
    if patient_id != 'all':
        scores = scores.filter(patient_id=patient_id)
    
    if score_type != 'all':
        scores = scores.filter(score_type=score_type)
    
    if time_range != 'all':
        now = timezone.now()
        if time_range == '30':
            scores = scores.filter(recorded_at__gte=now - timedelta(days=30))
        elif time_range == '90':
            scores = scores.filter(recorded_at__gte=now - timedelta(days=90))
    
    # Format data for chart
    trend_data = []
    for score in scores.order_by('recorded_at'):
        trend_data.append({
            'date': score.recorded_at.strftime('%Y-%m-%d'),
            'score': score.score,
            'type': score.score_type,
            'patientName': score.patient.user.name,
        })
    
    return Response(trend_data)

@api_view(['GET'])
def generate_proms_document(request, patient_id):
    if not request.user.is_authenticated or request.user.role != 'doctor':
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        doctor = request.user.doctor_profile
        patient = Patient.objects.get(id=patient_id)
    except (Doctor.DoesNotExist, Patient.DoesNotExist):
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get scores
    pre_score = PromsScore.objects.filter(
        patient=patient,
        doctor=doctor,
        score_type='pre_surgery'
    ).order_by('-recorded_at').first()
    
    post_score = PromsScore.objects.filter(
        patient=patient,
        doctor=doctor,
        score_type='post_surgery'
    ).order_by('-recorded_at').first()
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title = Paragraph(f"<b>PROMS Report - {patient.user.name}</b>", styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 20))
    
    # Patient Info
    info = Paragraph(f"<b>Patient:</b> {patient.user.name}<br/><b>Doctor:</b> Dr. {doctor.user.name}<br/><b>Date:</b> {timezone.now().strftime('%Y-%m-%d')}", styles['Normal'])
    elements.append(info)
    elements.append(Spacer(1, 20))
    
    # Scores Table
    data = [['Metric', 'Value']]
    if pre_score:
        data.append(['Pre-Surgery Score', str(pre_score.score)])
    if post_score:
        data.append(['Post-Surgery Score', str(post_score.score)])
    if pre_score and post_score:
        improvement = post_score.score - pre_score.score
        data.append(['Improvement', f"{improvement} ({'+' if improvement > 0 else ''}{improvement})"])
    
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(table)
    elements.append(Spacer(1, 20))
    
    # Billable Codes
    if post_score and post_score.billable_codes:
        codes_text = Paragraph(f"<b>Billable Codes:</b> {', '.join(post_score.billable_codes)}", styles['Normal'])
        elements.append(codes_text)
    
    doc.build(elements)
    buffer.seek(0)
    
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="proms_report_{patient.user.name.replace(" ", "_")}.pdf"'
    return response

@api_view(['GET'])
def get_patient_proms_history(request, patient_id):
    if not request.user.is_authenticated or request.user.role != 'doctor':
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        doctor = request.user.doctor_profile
        patient = Patient.objects.get(id=patient_id)
    except (Doctor.DoesNotExist, Patient.DoesNotExist):
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    
    scores = PromsScore.objects.filter(patient=patient, doctor=doctor).order_by('-recorded_at')
    
    return Response([{
        'id': str(s.id),
        'scoreType': s.score_type,
        'score': s.score,
        'billableCodes': s.billable_codes,
        'notes': s.notes,
        'recordedAt': s.recorded_at.isoformat(),
    } for s in scores])
