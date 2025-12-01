from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant
import os

def generate_twilio_token(room_name, identity):
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    api_key = os.getenv('TWILIO_API_KEY')
    api_secret = os.getenv('TWILIO_API_SECRET')
    
    token = AccessToken(account_sid, api_key, api_secret, identity=identity)
    video_grant = VideoGrant(room=room_name)
    token.add_grant(video_grant)
    
    return token.to_jwt()
