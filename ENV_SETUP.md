# Environment Variables Setup Guide

## 📋 Overview

This project uses environment variables for configuration. There are two ways to set them:

1. **Local Development**: Use a `.env` file (not committed to Git)
2. **Production (Render)**: Use environment variables in the dashboard

---

## 🏠 Local Development Setup

### Step 1: Create `.env` file

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

   Or create a new `.env` file in the project root.

### Step 2: Fill in your values

Open `.env` and update these values:

```env
# Django Settings
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,*

# API Keys (Required)
GROQ_API_KEY=your-groq-api-key-here
ASSEMBLYAI_API_KEY=your-assemblyai-api-key-here

# Firebase Authentication (Frontend - Vercel)
VITE_FIREBASE_API_KEY=your-firebase-api-key-here
VITE_FIREBASE_APP_ID=your-firebase-app-id-here

# Firebase Admin SDK (Backend - Render)
FIREBASE_CREDENTIALS_JSON={"type":"service_account","project_id":"teddybridge-f3f2c",...}

# Superuser (Optional - for automatic superuser creation)
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=admin123
DJANGO_SUPERUSER_USERNAME=admin
```

### Step 3: Generate a Secret Key

Generate a secure secret key:
- Online: https://djecrety.ir/
- Or run: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`

### Step 4: Get API Keys

1. **Groq API Key**: 
   - Sign up at https://console.groq.com/
   - Create an API key
   - Add to `GROQ_API_KEY` in `.env`

2. **AssemblyAI API Key** (optional, for transcription):
   - Sign up at https://www.assemblyai.com/
   - Get your API key
   - Add to `ASSEMBLYAI_API_KEY` in `.env`

### Step 5: Run the server

```bash
python manage.py migrate
python manage.py init_superuser  # Creates superuser from .env
python manage.py runserver
```

---

## 🚀 Production Setup (Render)

**Important**: Never commit `.env` files to Git! They're already in `.gitignore`.

For production on Render, set environment variables in the dashboard:

### Required Variables

1. Go to Render Dashboard → Your Service → Settings → Environment
2. Add these variables:

```
SECRET_KEY = (generate a secure random string)
DEBUG = False
ALLOWED_HOSTS = your-app.onrender.com
GROQ_API_KEY = your-groq-api-key
ASSEMBLYAI_API_KEY = your-assemblyai-api-key
DJANGO_SUPERUSER_EMAIL = admin@yourdomain.com
DJANGO_SUPERUSER_PASSWORD = YourSecurePassword123!
DJANGO_SUPERUSER_USERNAME = admin
CORS_ALLOWED_ORIGINS = https://your-frontend.vercel.app
```

### How it works

- Django automatically loads variables from `.env` file (local) or environment (production)
- The `load_dotenv()` in `settings.py` reads `.env` for local development
- Render uses environment variables from the dashboard (no `.env` file needed)

---

## 📝 All Available Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | ✅ | `django-insecure-...` | Django secret key (change in production!) |
| `DEBUG` | ❌ | `True` | Debug mode (set to `False` in production) |
| `ALLOWED_HOSTS` | ❌ | `localhost,127.0.0.1,*` | Comma-separated list of allowed hosts |
| `GROQ_API_KEY` | ✅ | - | Groq API key for AI features |
| `ASSEMBLYAI_API_KEY` | ❌ | - | AssemblyAI key for transcription |
| `DJANGO_SUPERUSER_EMAIL` | ❌ | - | Email for auto-created superuser |
| `DJANGO_SUPERUSER_PASSWORD` | ❌ | - | Password for auto-created superuser |
| `DJANGO_SUPERUSER_USERNAME` | ❌ | `admin` | Username for auto-created superuser |

---

## 🔒 Security Best Practices

1. ✅ **Never commit `.env` files** - They're in `.gitignore`
2. ✅ **Use strong SECRET_KEY** in production
3. ✅ **Set DEBUG=False** in production
4. ✅ **Use environment variables** in production (not `.env` files)
5. ✅ **Rotate API keys** if they're exposed
6. ✅ **Use different keys** for development and production

---

## 🆘 Troubleshooting

### "ModuleNotFoundError: No module named 'dotenv'"
```bash
pip install python-dotenv
```

### Variables not loading?
- Make sure `.env` is in the project root (same level as `manage.py`)
- Check for typos in variable names
- Restart your Django server after changing `.env`

### Production variables not working?
- Check Render logs for errors
- Verify variable names match exactly (case-sensitive)
- Make sure you saved and redeployed after adding variables

---

## 📚 Additional Resources

- [Django Environment Variables](https://docs.djangoproject.com/en/stable/topics/settings/)
- [python-dotenv Documentation](https://pypi.org/project/python-dotenv/)
- [Render Environment Variables](https://render.com/docs/environment-variables)

