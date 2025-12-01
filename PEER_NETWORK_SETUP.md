# Peer Network Feature Setup

## Overview
Added peer-to-peer networking for patients and doctors to connect, chat, and schedule meetings with each other.

## Features
- **Search Peers**: Find other patients (if you're a patient) or doctors (if you're a doctor)
- **Chat**: Real-time messaging between peers
- **Schedule Meetings**: Create peer-to-peer meetings

## Database Migration
Run the migration to create the new tables:

```bash
python manage.py migrate
```

This creates three new tables:
- `peer_connections`: Tracks connections between users
- `chat_messages`: Stores chat messages
- `peer_meetings`: Stores peer-to-peer meetings

## API Endpoints

### Search Peers
```
GET /api/peers/search?q=<query>
```

### Chat
```
GET /api/peers/chat/conversations
GET /api/peers/chat/<peer_id>
POST /api/peers/chat/send
```

### Meetings
```
GET /api/peers/meetings
POST /api/peers/meetings/create
DELETE /api/peers/meetings/<meeting_id>
```

## Frontend
- New page: `/peer-network`
- Added to sidebar for both doctors and patients
- Three tabs: Chat, Meetings, Search Peers

## Usage
1. Navigate to "Peer Network" from the sidebar
2. Search for other users with the same role
3. Click "Chat" to start a conversation
4. Click "Schedule" to create a meeting
5. View all conversations and meetings in their respective tabs
