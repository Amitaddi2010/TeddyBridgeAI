from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import User, PeerConnection, ChatMessage, PeerMeeting, Post, PostLike, PostComment
from .notifications import create_notification

@api_view(['GET'])
def search_peers(request):
    """Search for other patients or doctors"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    query = request.GET.get('q', '')
    condition_filter = request.GET.get('condition', '')
    
    # Base query for same role
    peers = User.objects.filter(role=request.user.role).exclude(id=request.user.id)
    
    # Apply name search if provided
    if query and len(query) >= 2:
        peers = peers.filter(name__icontains=query)
    
    # For patients, filter by medical conditions
    if request.user.role == 'patient' and condition_filter:
        from .models import Patient
        patient_ids = Patient.objects.filter(
            medical_conditions__icontains=condition_filter
        ).values_list('user_id', flat=True)
        peers = peers.filter(id__in=patient_ids)
    
    peers = peers[:50]
    
    result = []
    for user in peers:
        data = {
            'id': str(user.id),
            'name': user.name,
            'email': user.email,
            'avatar': user.avatar_url,
            'role': user.role,
        }
        
        # Add medical conditions for patients
        if user.role == 'patient':
            try:
                patient = user.patient_profile
                data['medicalConditions'] = patient.medical_conditions or []
            except:
                data['medicalConditions'] = []
        
        result.append(data)
    
    return Response(result)

@api_view(['GET'])
def get_chat_conversations(request):
    """Get all chat conversations"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Get all users the current user has chatted with
    sent_to = ChatMessage.objects.filter(sender=request.user).values_list('receiver', flat=True).distinct()
    received_from = ChatMessage.objects.filter(receiver=request.user).values_list('sender', flat=True).distinct()
    peer_ids = set(list(sent_to) + list(received_from))
    
    conversations = []
    for peer_id in peer_ids:
        peer = User.objects.get(id=peer_id)
        last_message = ChatMessage.objects.filter(
            Q(sender=request.user, receiver=peer) | Q(sender=peer, receiver=request.user)
        ).order_by('-created_at').first()
        
        unread_count = ChatMessage.objects.filter(
            sender=peer, receiver=request.user, is_read=False
        ).count()
        
        conversations.append({
            'peerId': str(peer.id),
            'peerName': peer.name,
            'peerAvatar': peer.avatar_url,
            'lastMessage': last_message.message if last_message else '',
            'lastMessageTime': last_message.created_at if last_message else None,
            'unreadCount': unread_count,
        })
    
    # Sort by last message time (most recent first)
    from datetime import datetime
    conversations.sort(key=lambda x: x['lastMessageTime'] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    
    # Convert datetime to ISO string for JSON response
    for conv in conversations:
        if conv['lastMessageTime']:
            conv['lastMessageTime'] = conv['lastMessageTime'].isoformat()
    
    return Response(conversations)

@api_view(['GET'])
def get_chat_messages(request, peer_id):
    """Get chat messages with a specific peer"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        peer = User.objects.get(id=peer_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    messages = ChatMessage.objects.filter(
        Q(sender=request.user, receiver=peer) | Q(sender=peer, receiver=request.user)
    ).order_by('created_at')
    
    # Mark messages as read
    ChatMessage.objects.filter(sender=peer, receiver=request.user, is_read=False).update(is_read=True)
    
    return Response([{
        'id': str(msg.id),
        'senderId': str(msg.sender.id),
        'message': msg.message,
        'isRead': msg.is_read,
        'createdAt': msg.created_at.isoformat(),
    } for msg in messages])

@api_view(['GET'])
def get_unread_message_count(request):
    """Get total unread message count for the current user"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    unread_count = ChatMessage.objects.filter(receiver=request.user, is_read=False).count()
    
    return Response({'unreadCount': unread_count})

@api_view(['POST'])
def send_chat_message(request):
    """Send a chat message to a peer"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    receiver_id = request.data.get('receiverId')
    message = request.data.get('message')
    
    if not receiver_id or not message:
        return Response({'error': 'receiverId and message required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        receiver = User.objects.get(id=receiver_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    chat_message = ChatMessage.objects.create(
        sender=request.user,
        receiver=receiver,
        message=message
    )
    
    # Create notification for receiver with context-aware link
    try:
        # Determine appropriate link based on receiver's role
        # This ensures patients go to their doctors page, doctors go to their patients page
        # Only same-role messaging (peer-to-peer) goes to peer-network
        if receiver.role == 'patient':
            notification_link = '/patient/doctors'
        elif receiver.role == 'doctor':
            notification_link = '/doctor/patients'
        else:
            # Same role or other - use peer network for peer-to-peer messaging
            notification_link = '/peer-network'
        
        # Create context-aware notification message
        sender_role_prefix = 'Dr.' if request.user.role == 'doctor' else ''
        notification_title = 'New Message'
        notification_message = f'{sender_role_prefix} {request.user.name} sent you a message'
        
        create_notification(
            user=receiver,
            notification_type='general',
            title=notification_title,
            message=notification_message,
            link=notification_link
        )
    except Exception as e:
        # Log error but don't fail the message send
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f'Failed to create notification for chat message: {str(e)}')
    
    return Response({
        'id': str(chat_message.id),
        'senderId': str(chat_message.sender.id),
        'message': chat_message.message,
        'createdAt': chat_message.created_at.isoformat(),
    })

@api_view(['GET'])
def get_peer_meetings(request):
    """Get all peer meetings"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    meetings = PeerMeeting.objects.filter(
        Q(organizer=request.user) | Q(participant=request.user)
    ).select_related('organizer', 'participant')
    
    return Response([{
        'id': str(m.id),
        'title': m.title,
        'description': m.description,
        'organizerId': str(m.organizer.id),
        'organizerName': m.organizer.name,
        'participantId': str(m.participant.id),
        'participantName': m.participant.name,
        'scheduledAt': m.scheduled_at.isoformat(),
        'status': m.status,
        'isOrganizer': m.organizer.id == request.user.id,
    } for m in meetings])

@api_view(['POST'])
def create_peer_meeting(request):
    """Create a peer meeting (doctor-to-doctor or patient-to-patient)"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        import logging
        from django.utils.dateparse import parse_datetime
        from django.utils import timezone
        
        logger = logging.getLogger(__name__)
        
        participant_id = request.data.get('participantId')
        title = request.data.get('title')
        description = request.data.get('description', '')
        scheduled_at_str = request.data.get('scheduledAt')
        
        if not participant_id or not title or not scheduled_at_str:
            return Response({'error': 'participantId, title, and scheduledAt required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Parse scheduled_at from ISO string
        try:
            scheduled_at = parse_datetime(scheduled_at_str)
            if scheduled_at is None:
                # Try parsing as ISO format with Z or + timezone
                from datetime import datetime
                scheduled_at = datetime.fromisoformat(scheduled_at_str.replace('Z', '+00:00'))
        except (ValueError, TypeError) as e:
            logger.error(f"Error parsing scheduled_at: {scheduled_at_str}, error: {str(e)}")
            return Response({'error': f'Invalid date format for scheduledAt: {scheduled_at_str}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Make sure scheduled_at is timezone-aware
        if timezone.is_naive(scheduled_at):
            scheduled_at = timezone.make_aware(scheduled_at)
        
        try:
            participant = User.objects.get(id=participant_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Validate that participants are same role (doctor-doctor or patient-patient)
        if request.user.role != participant.role:
            return Response({'error': 'Peer meetings can only be created between users of the same role'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Don't allow self-meetings
        if request.user.id == participant.id:
            return Response({'error': 'Cannot create a meeting with yourself'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create PeerMeeting
        peer_meeting = PeerMeeting.objects.create(
            organizer=request.user,
            participant=participant,
            title=title,
            description=description,
            scheduled_at=scheduled_at
        )
        
        # Create notification for participant
        try:
            create_notification(
                user=participant,
                notification_type='appointment',
                title='New Peer Meeting Scheduled',
                message=f'{request.user.name} has scheduled a meeting with you: {title}',
                link=f'/peer-network'  # Link to peer network for now, until we have peer meeting detail page
            )
        except Exception as notif_error:
            logger.warning(f"Failed to create notification for peer meeting: {str(notif_error)}")
            # Continue even if notification fails
        
        return Response({
            'id': str(peer_meeting.id),
            'title': peer_meeting.title,
            'scheduledAt': peer_meeting.scheduled_at.isoformat(),
            'status': peer_meeting.status,
            'isPeerMeeting': True,
        })
        
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Error creating peer meeting: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return Response({'error': f'Failed to create peer meeting: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def start_peer_meeting(request, meeting_id):
    """Start a peer meeting by converting it to a Meeting for video calls (doctor-doctor only)"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        import logging
        logger = logging.getLogger(__name__)
        from teddybridge.apps.core.models import Meeting, Doctor
        from teddybridge.apps.meetings.twilio_utils import generate_twilio_token
        
        logger.info(f"Starting peer meeting {meeting_id} for user {request.user.id}")
        
        try:
            peer_meeting = PeerMeeting.objects.select_related('organizer', 'participant').get(id=meeting_id)
        except PeerMeeting.DoesNotExist:
            logger.error(f"Peer meeting {meeting_id} not found")
            return Response({'error': 'Peer meeting not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Only allow starting if user is organizer or participant
        if peer_meeting.organizer.id != request.user.id and peer_meeting.participant.id != request.user.id:
            logger.warning(f"User {request.user.id} not authorized to start meeting {meeting_id}")
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        # Only doctor-doctor meetings can be started (patient-patient meetings don't use video calls)
        if peer_meeting.organizer.role != 'doctor' or peer_meeting.participant.role != 'doctor':
            logger.warning(f"Attempted to start non-doctor peer meeting {meeting_id}")
            return Response({'error': 'Only doctor-doctor peer meetings can be started as video calls'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create doctor profiles
        try:
            organizer_doctor = peer_meeting.organizer.doctor_profile
        except Doctor.DoesNotExist:
            logger.info(f"Creating doctor profile for organizer {peer_meeting.organizer.id}")
            organizer_doctor = Doctor.objects.create(user=peer_meeting.organizer)
        
        try:
            participant_doctor = peer_meeting.participant.doctor_profile
        except Doctor.DoesNotExist:
            logger.info(f"Creating doctor profile for participant {peer_meeting.participant.id}")
            participant_doctor = Doctor.objects.create(user=peer_meeting.participant)
        
        # Check if meeting already exists for this peer meeting
        try:
            existing_meeting = Meeting.objects.filter(
                doctor__user=peer_meeting.organizer,
                patient=None,
                title=peer_meeting.title
            ).first()
            
            if existing_meeting and existing_meeting.status != 'completed':
                # Update peer meeting status
                peer_meeting.status = 'in_progress'
                peer_meeting.meeting_url = f'/meeting/{existing_meeting.id}'
                peer_meeting.save()
                
                logger.info(f"Using existing meeting {existing_meeting.id} for peer meeting {meeting_id}")
                return Response({
                    'id': str(existing_meeting.id),
                    'meetingUrl': f'/meeting/{existing_meeting.id}',
                })
        except Exception as e:
            logger.warning(f"Error checking for existing meeting: {str(e)}")
        
        # Create Meeting record (doctor-doctor: use organizer as doctor, patient=None)
        try:
            meeting = Meeting.objects.create(
                doctor=organizer_doctor,
                patient=None,  # No patient for doctor-doctor meetings
                title=peer_meeting.title,
                scheduled_at=peer_meeting.scheduled_at,
                status='in_progress'
            )
            logger.info(f"Created new meeting {meeting.id} for peer meeting {meeting_id}")
        except Exception as e:
            logger.error(f"Error creating meeting: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({'error': f'Failed to create meeting: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Update peer meeting
        peer_meeting.status = 'in_progress'
        peer_meeting.meeting_url = f'/meeting/{meeting.id}'
        peer_meeting.save()
        
        # Create notification for the other doctor
        try:
            other_doctor = peer_meeting.participant if peer_meeting.organizer.id == request.user.id else peer_meeting.organizer
            create_notification(
                user=other_doctor,
                notification_type='call',
                title='Peer Meeting Started',
                message=f'{request.user.name} has started the meeting: {peer_meeting.title}',
                link=f'/meeting/{meeting.id}'
            )
        except Exception as notif_error:
            logger.warning(f"Failed to create notification: {str(notif_error)}")
            # Continue even if notification fails
        
        return Response({
            'id': str(meeting.id),
            'meetingUrl': f'/meeting/{meeting.id}',
        })
        
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Error starting peer meeting {meeting_id}: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return Response({'error': f'Failed to start peer meeting: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
def delete_peer_meeting(request, meeting_id):
    """Delete a peer meeting"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        meeting = PeerMeeting.objects.get(id=meeting_id, organizer=request.user)
        meeting.delete()
        return Response({'success': True})
    except PeerMeeting.DoesNotExist:
        return Response({'error': 'Meeting not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def get_feed(request):
    """Get social feed posts"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    posts = Post.objects.filter(author__role=request.user.role).select_related('author')[:50]
    
    result = []
    for post in posts:
        likes_count = post.likes.count()
        comments_count = post.comments.count()
        user_liked = post.likes.filter(user=request.user).exists()
        
        result.append({
            'id': str(post.id),
            'authorId': str(post.author.id),
            'authorName': post.author.name,
            'authorAvatar': post.author.avatar_url,
            'content': post.content,
            'imageUrl': post.image_url,
            'likesCount': likes_count,
            'commentsCount': comments_count,
            'userLiked': user_liked,
            'createdAt': post.created_at.isoformat(),
        })
    
    return Response(result)

@api_view(['POST'])
def create_post(request):
    """Create a new post"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    content = request.data.get('content')
    if not content:
        return Response({'error': 'Content required'}, status=status.HTTP_400_BAD_REQUEST)
    
    post = Post.objects.create(
        author=request.user,
        content=content,
        image_url=request.data.get('imageUrl')
    )
    
    return Response({
        'id': str(post.id),
        'content': post.content,
        'createdAt': post.created_at.isoformat(),
    })

@api_view(['POST'])
def toggle_like(request, post_id):
    """Like or unlike a post"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        post = Post.objects.get(id=post_id)
        like, created = PostLike.objects.get_or_create(post=post, user=request.user)
        
        if not created:
            like.delete()
            return Response({'liked': False, 'likesCount': post.likes.count()})
        
        return Response({'liked': True, 'likesCount': post.likes.count()})
    except Post.DoesNotExist:
        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET', 'POST'])
def post_comments(request, post_id):
    """Get or add comments to a post"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        comments = post.comments.select_related('author').all()
        return Response([{
            'id': str(c.id),
            'authorId': str(c.author.id),
            'authorName': c.author.name,
            'authorAvatar': c.author.avatar_url,
            'content': c.content,
            'createdAt': c.created_at.isoformat(),
        } for c in comments])
    
    content = request.data.get('content')
    if not content:
        return Response({'error': 'Content required'}, status=status.HTTP_400_BAD_REQUEST)
    
    comment = PostComment.objects.create(
        post=post,
        author=request.user,
        content=content
    )
    
    return Response({
        'id': str(comment.id),
        'authorName': comment.author.name,
        'content': comment.content,
        'createdAt': comment.created_at.isoformat(),
    })

@api_view(['DELETE'])
def delete_post(request, post_id):
    """Delete a post"""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        post = Post.objects.get(id=post_id, author=request.user)
        post.delete()
        return Response({'success': True})
    except Post.DoesNotExist:
        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
