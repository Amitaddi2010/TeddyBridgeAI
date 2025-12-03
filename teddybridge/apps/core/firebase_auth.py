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
            cred = None
            project_id = None
            
            if firebase_creds_json:
                try:
                    # Parse JSON string
                    import json
                    cred_dict = json.loads(firebase_creds_json)
                    cred = credentials.Certificate(cred_dict)
                    # Get project ID from credentials
                    project_id = cred_dict.get('project_id', os.getenv('GOOGLE_CLOUD_PROJECT', 'teddybridge-f3f2c'))
                    logger.info(f"Firebase credentials loaded from FIREBASE_CREDENTIALS_JSON for project: {project_id}")
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse FIREBASE_CREDENTIALS_JSON as JSON: {str(e)}")
                    _firebase_app = False
                    return _firebase_app
                except Exception as e:
                    logger.error(f"Failed to create credentials from FIREBASE_CREDENTIALS_JSON: {str(e)}")
                    _firebase_app = False
                    return _firebase_app
            else:
                # Try to load from file path
                cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
                if cred_path and os.path.exists(cred_path):
                    try:
                        cred = credentials.Certificate(cred_path)
                        # Try to read project ID from file
                        import json
                        with open(cred_path, 'r') as f:
                            cred_dict = json.load(f)
                            project_id = cred_dict.get('project_id', os.getenv('GOOGLE_CLOUD_PROJECT', 'teddybridge-f3f2c'))
                        logger.info(f"Firebase credentials loaded from file: {cred_path} for project: {project_id}")
                    except Exception as e:
                        logger.error(f"Failed to load Firebase credentials from file {cred_path}: {str(e)}")
                        _firebase_app = False
                        return _firebase_app
                else:
                    # Firebase credentials not configured - don't use Application Default
                    logger.warning("FIREBASE_CREDENTIALS_JSON and FIREBASE_CREDENTIALS_PATH not set. Firebase authentication will not work.")
                    logger.warning("To enable Firebase authentication, set FIREBASE_CREDENTIALS_JSON environment variable with your service account JSON.")
                    _firebase_app = False
                    return _firebase_app
            
            if not cred:
                logger.error("No Firebase credentials available")
                _firebase_app = False
                return _firebase_app
            
            # Initialize with project ID
            try:
                _firebase_app = firebase_admin.initialize_app(cred, {
                    'projectId': project_id,
                })
                logger.info(f"Firebase Admin SDK initialized successfully with project ID: {project_id}")
            except ValueError as e:
                # App already initialized
                if 'already exists' in str(e).lower():
                    logger.info("Firebase Admin SDK already initialized, using existing app")
                    _firebase_app = firebase_admin.get_app()
                else:
                    logger.error(f"Failed to initialize Firebase Admin SDK (ValueError): {str(e)}")
                    _firebase_app = False
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK (unexpected error): {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
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
        
        firebase_app = initialize_firebase()
        if not firebase_app or firebase_app is False:
            logger.error("Firebase Admin SDK initialization failed, cannot verify token")
            return None
        
        # Verify the token
        decoded_token = auth.verify_id_token(id_token)
        logger.info(f"Firebase token verified successfully for user: {decoded_token.get('email', 'unknown')}")
        return decoded_token
    except firebase_admin.exceptions.FirebaseError as e:
        logger.error(f"Firebase token verification failed (FirebaseError): {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Firebase token verification failed (unexpected error): {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
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

