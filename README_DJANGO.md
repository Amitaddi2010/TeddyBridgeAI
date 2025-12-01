# TeleClinic - Django Backend with Groq AI

## Architecture Change

This project has been converted from Express/Node.js to Django/Python backend with Groq AI instead of OpenAI.

## Setup Instructions

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Create Django Directory Structure

Run in PowerShell or Command Prompt:

```powershell
mkdir teleclinic
mkdir teleclinic\apps
mkdir teleclinic\apps\core
mkdir teleclinic\apps\doctors
mkdir teleclinic\apps\patients
mkdir teleclinic\apps\meetings

# Create __init__.py files
type nul > teleclinic\__init__.py
type nul > teleclinic\apps\__init__.py
type nul > teleclinic\apps\core\__init__.py
type nul > teleclinic\apps\doctors\__init__.py
type nul > teleclinic\apps\patients\__init__.py
type nul > teleclinic\apps\meetings\__init__.py
```

### 3. Copy Django Files

Copy the following reference files to their proper locations:

- `django_settings.py` → `teleclinic/settings.py`
- `django_models.py` → `teleclinic/apps/core/models.py`
- `django_views.py` → `teleclinic/apps/core/views.py`
- `django_serializers.py` → `teleclinic/apps/core/serializers.py`
- `django_wsgi.py` → `teleclinic/wsgi.py`

### 4. Create URL Files

Create `teleclinic/urls.py`:
```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('teleclinic.apps.core.urls')),
    path('api/doctor/', include('teleclinic.apps.doctors.urls')),
    path('api/patient/', include('teleclinic.apps.patients.urls')),
    path('api/meetings/', include('teleclinic.apps.meetings.urls')),
]
```

Create `teleclinic/apps/core/urls.py`:
```python
from django.urls import path
from . import views

urlpatterns = [
    path('register', views.register),
    path('login', views.user_login),
    path('logout', views.user_logout),
    path('me', views.get_current_user),
    path('qr/generate', views.generate_qr),
    path('link/verify/<str:token>', views.verify_qr_token),
    path('link/patient', views.link_patient),
]
```

### 5. Configure Database

Update `.env` file:
```
DATABASE_URL=postgresql://username:password@localhost:5432/teleclinic
SECRET_KEY=your-secret-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
GROQ_API_KEY=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
```

Or set individual database variables:
```
DB_NAME=teleclinic
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
```

### 6. Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 7. Create Superuser

```bash
python manage.py createsuperuser
```

### 8. Run Django Server

```bash
python manage.py runserver 0.0.0.0:8000
```

### 9. Update Frontend Configuration

Update the frontend API base URL to point to Django:

In `client/src/lib/api.ts` or similar:
```typescript
const API_BASE_URL = 'http://localhost:8000/api';
```

## Key Changes

### Backend
- **Framework**: Express → Django REST Framework
- **AI Service**: OpenAI → Groq (mixtral-8x7b-32768 model)
- **ORM**: Drizzle → Django ORM
- **Authentication**: Passport.js → Django Session Auth

### API Endpoints

All endpoints remain the same, just change the base URL from `http://localhost:5000` to `http://localhost:8000`.

### Groq AI Integration

The Groq API is used for generating clinical notes from transcripts:

```python
from groq import Groq

client = Groq(api_key=settings.GROQ_API_KEY)
response = client.chat.completions.create(
    model="mixtral-8x7b-32768",
    messages=[{"role": "user", "content": prompt}],
    temperature=0.3,
    max_tokens=2000
)
```

### Available Groq Models

- `mixtral-8x7b-32768` (recommended for medical notes)
- `llama2-70b-4096`
- `gemma-7b-it`

## Frontend (No Changes Required)

The React frontend remains the same. Just update the API base URL.

## Development Workflow

1. **Backend**: `python manage.py runserver` (port 8000)
2. **Frontend**: `npm run dev` (port 5173)

## Production Deployment

1. Set `DEBUG=False` in `.env`
2. Configure proper `SECRET_KEY`
3. Set `ALLOWED_HOSTS` to your domain
4. Use production WSGI server (gunicorn, uwsgi)
5. Serve static files with nginx/Apache

```bash
pip install gunicorn
gunicorn teleclinic.wsgi:application --bind 0.0.0.0:8000
```

## Testing Groq Integration

```bash
python manage.py shell
```

```python
from groq import Groq
import os

client = Groq(api_key=os.getenv('GROQ_API_KEY'))
response = client.chat.completions.create(
    model="mixtral-8x7b-32768",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```
