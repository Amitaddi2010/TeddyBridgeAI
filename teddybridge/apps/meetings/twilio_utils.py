from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant
import os
import logging
import re
import time
import uuid

logger = logging.getLogger(__name__)

def generate_twilio_token(room_name, identity):
    """
    Generate a Twilio access token for video calls.
    
    Returns None if Twilio credentials are not configured.
    """
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    api_key = os.getenv('TWILIO_API_KEY')
    api_secret = os.getenv('TWILIO_API_SECRET')
    
    # Check if all required credentials are present
    if not account_sid or not api_key or not api_secret:
        logger.warning(
            "Twilio credentials not configured. "
            "Set TWILIO_ACCOUNT_SID, TWILIO_API_KEY, and TWILIO_API_SECRET environment variables."
        )
        return None
    
    # Sanitize identity: Twilio only allows alphanumeric and underscore characters
    # Replace invalid characters with underscores
    sanitized_identity = re.sub(r'[^a-zA-Z0-9_]', '_', str(identity))
    
    # Ensure identity is not empty and not too long (max 128 chars)
    if not sanitized_identity:
        sanitized_identity = 'user_' + str(hash(identity))[:20]
    
    # Add timestamp and UUID suffix to make identity unique per connection
    # This prevents "duplicate identity" errors when the same user tries to reconnect
    timestamp = str(int(time.time() * 1000))[-8:]  # Last 8 digits of timestamp
    unique_id = str(uuid.uuid4())[:8]  # First 8 characters of UUID
    sanitized_identity = f"{sanitized_identity}_{timestamp}_{unique_id}"
    
    # Truncate to 128 chars max (Twilio limit)
    sanitized_identity = sanitized_identity[:128]
    
    try:
        # Log credential presence (without exposing secrets)
        logger.info(f"Generating Twilio token for room: {room_name}, identity: {sanitized_identity}")
        logger.info(f"Account SID present: {bool(account_sid)}, API Key present: {bool(api_key)}, API Secret present: {bool(api_secret)}")
        
        # Validate Account SID format (should start with AC)
        if account_sid and not account_sid.startswith('AC'):
            logger.error(f"Invalid Account SID format: {account_sid[:10]}... (should start with AC)")
            return None
        
        # Validate API Key format (should start with SK)
        if api_key and not api_key.startswith('SK'):
            logger.error(f"Invalid API Key format: {api_key[:10]}... (should start with SK)")
            return None
        
        token = AccessToken(account_sid, api_key, api_secret, identity=sanitized_identity)
        video_grant = VideoGrant(room=room_name)
        token.add_grant(video_grant)
        
        jwt_token = token.to_jwt()
        logger.info(f"Twilio token generated successfully (length: {len(jwt_token)})")
        return jwt_token
    except Exception as e:
        logger.error(f"Failed to generate Twilio token: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None
