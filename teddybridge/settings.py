import os
from pathlib import Path
from dotenv import load_dotenv
from rest_framework.authentication import SessionAuthentication

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-this-in-production')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,*').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'teddybridge.apps.core',
    'teddybridge.apps.doctors',
    'teddybridge.apps.patients',
    'teddybridge.apps.meetings',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Security Headers - Allow popups for Firebase authentication
SECURE_CROSS_ORIGIN_OPENER_POLICY = None  # Allow popups for OAuth flows

ROOT_URLCONF = 'teddybridge.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'teddybridge.wsgi.application'

# Database Configuration
# Use PostgreSQL in production (Render) if DATABASE_URL is set, otherwise use SQLite for local development
DATABASE_URL = os.getenv('DATABASE_URL')

if DATABASE_URL:
    # Production: Use PostgreSQL from Render or other provider
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Development: Use SQLite
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_USER_MODEL = 'core.User'

AUTHENTICATION_BACKENDS = [
    'teddybridge.apps.core.backends.EmailAuthBackend',  # Custom backend for email auth
    'django.contrib.auth.backends.ModelBackend',  # Fallback to default backend
]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

APPEND_SLASH = False

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'core.User'

class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'teddybridge.settings.CsrfExemptSessionAuthentication',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Session Cookie Configuration
# For production (HTTPS), use 'None' and Secure=True for cross-origin cookies
# For development (HTTP), use 'Lax' and Secure=False
# Detect production: if DEBUG is False or we're on Render (has .onrender.com in ALLOWED_HOSTS)
IS_PRODUCTION = not DEBUG or any('.onrender.com' in host for host in ALLOWED_HOSTS) or os.getenv('IS_PRODUCTION', 'False') == 'True'

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'None' if IS_PRODUCTION else 'Lax'
SESSION_COOKIE_SECURE = IS_PRODUCTION  # True for HTTPS, False for HTTP
SESSION_COOKIE_DOMAIN = None
SESSION_COOKIE_AGE = 60 * 60 * 24 * 30  # 30 days in seconds
SESSION_SAVE_EVERY_REQUEST = True  # Refresh session on every request
SESSION_EXPIRE_AT_BROWSER_CLOSE = False  # Keep session alive across browser restarts

# CSRF Cookie Configuration
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'None' if IS_PRODUCTION else 'Lax'
CSRF_COOKIE_SECURE = IS_PRODUCTION  # True for HTTPS, False for HTTP

GROQ_API_KEY = os.getenv('GROQ_API_KEY')
ASSEMBLYAI_API_KEY = os.getenv('ASSEMBLYAI_API_KEY')
