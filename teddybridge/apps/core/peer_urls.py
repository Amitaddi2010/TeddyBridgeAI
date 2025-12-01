from django.urls import path
from . import peer_views

urlpatterns = [
    path('search', peer_views.search_peers),
    path('chat/conversations', peer_views.get_chat_conversations),
    path('chat/unread-count', peer_views.get_unread_message_count),
    path('chat/<uuid:peer_id>', peer_views.get_chat_messages),
    path('chat/send', peer_views.send_chat_message),
    path('meetings', peer_views.get_peer_meetings),
    path('meetings/create', peer_views.create_peer_meeting),
    path('meetings/<uuid:meeting_id>', peer_views.delete_peer_meeting),
    path('feed', peer_views.get_feed),
    path('posts/create', peer_views.create_post),
    path('posts/<uuid:post_id>/like', peer_views.toggle_like),
    path('posts/<uuid:post_id>/comments', peer_views.post_comments),
    path('posts/<uuid:post_id>', peer_views.delete_post),
]
