from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant
import os
import logging

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
    
    try:
        token = AccessToken(account_sid, api_key, api_secret, identity=identity)
        video_grant = VideoGrant(room=room_name)
        token.add_grant(video_grant)
        
        return token.to_jwt()
    except Exception as e:
        logger.error(f"Failed to generate Twilio token: {str(e)}")
        return None
