"""
Firebase Authentication utilities for Django backend
"""
import os
import logging
import firebase_admin
from firebase_admin import credentials, auth
from django.conf import settings

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
_firebase_app = None

def initialize_firebase():
    """Initialize Firebase Admin SDK if not already initialized"""
    global _firebase_app
    if _firebase_app is None:
        try:
            # Try to get Firebase credentials from environment
            firebase_creds_json = os.getenv('FIREBASE_CREDENTIALS_JSON')
            if firebase_creds_json:
                # Parse JSON string
                import json
                cred_dict = json.loads(firebase_creds_json)
                cred = credentials.Certificate(cred_dict)
            else:
                # Try to load from file path
                cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
                if cred_path and os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                else:
                    # Use default credentials (for Google Cloud environments)
                    cred = credentials.ApplicationDefault()
            
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK: {str(e)}")
            _firebase_app = False  # Mark as failed
    
    return _firebase_app

def verify_firebase_token(id_token):
    """
    Verify a Firebase ID token and return the decoded token
    
    Args:
        id_token: Firebase ID token string
        
    Returns:
        dict: Decoded token claims, or None if verification fails
    """
    try:
        if _firebase_app is False:
            logger.warning("Firebase Admin SDK not initialized, cannot verify token")
            return None
        
        initialize_firebase()
        
        # Verify the token
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        logger.error(f"Firebase token verification failed: {str(e)}")
        return None

def get_user_from_token(id_token):
    """
    Get user information from Firebase token
    
    Args:
        id_token: Firebase ID token string
        
    Returns:
        dict: User information with uid, email, name, etc., or None if verification fails
    """
    decoded_token = verify_firebase_token(id_token)
    if decoded_token:
        return {
            'uid': decoded_token.get('uid'),
            'email': decoded_token.get('email'),
            'name': decoded_token.get('name') or decoded_token.get('email', '').split('@')[0],
            'email_verified': decoded_token.get('email_verified', False),
            'firebase_uid': decoded_token.get('uid'),
        }
    return None

