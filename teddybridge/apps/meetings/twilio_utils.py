from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant
import os
import logging
import re

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
    sanitized_identity = sanitized_identity[:128]
    
    try:
        # Log credential presence (without exposing secrets)
        logger.info(f"Generating Twilio token for room: {room_name}, identity: {sanitized_identity}")
        logger.debug(f"Account SID present: {bool(account_sid)}, API Key present: {bool(api_key)}, API Secret present: {bool(api_secret)}")
        
        token = AccessToken(account_sid, api_key, api_secret, identity=sanitized_identity)
        video_grant = VideoGrant(room=room_name)
        token.add_grant(video_grant)
        
        jwt_token = token.to_jwt()
        logger.info("Twilio token generated successfully")
        return jwt_token
    except Exception as e:
        logger.error(f"Failed to generate Twilio token: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None
