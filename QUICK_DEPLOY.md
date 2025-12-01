# 🚀 Quick Deploy Guide - 10 Minutes Setup

## Fastest Way to Deploy (Step by Step)

### Step 1: Prepare Your Code (5 minutes)

1. **Update Django Settings** (`teddybridge/settings.py`):
```python
# Add at the top
import os
from pathlib import Path

# Update ALLOWED_HOSTS
ALLOWED_HOSTS = ['*']  # Change to your domain later

# Add CORS
INSTALLED_APPS = [
    ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Add this first
    ...
]

# Allow all origins (update later for security)
CORS_ALLOW_ALL_ORIGINS = True

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
```

2. **Update requirements.txt** (add if missing):
```
Django>=4.2
djangorestframework
gunicorn
django-cors-headers
python-dotenv
```

3. **Create Procfile** (in root directory):
```
web: gunicorn teddybridge.wsgi:application --bind 0.0.0.0:$PORT
```

---

### Step 2: Deploy Frontend to Vercel (3 minutes)

1. Go to: https://vercel.com
2. Click "Sign Up" → Choose "Continue with GitHub"
3. Click "Add New Project"
4. Import: `Amitaddi2010/TeddyBridgeAI`
5. Configure:
   - **Root Directory**: `client` (click Edit)
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Click "Deploy"
7. **Copy your Vercel URL** (e.g., `teddybridge-ai.vercel.app`)

---

### Step 3: Deploy Backend to Render (5 minutes)

1. Go to: https://render.com
2. Click "Sign Up" → Choose "Sign up with GitHub"
3. Click "New +" → "Web Service"
4. Connect repository: `Amitaddi2010/TeddyBridgeAI`
5. Configure:
   - **Name**: `teddybridge-api`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn teddybridge.wsgi:application`
   - **Plan**: Free
6. Click "Advanced" → Add Environment Variables:
   ```
   DJANGO_SECRET_KEY = (generate random string)
   DJANGO_DEBUG = False
   ALLOWED_HOSTS = your-app.onrender.com
   CORS_ALLOWED_ORIGINS = https://your-vercel-url.vercel.app
   ```
7. Click "Create Web Service"
8. **Copy your Render URL** (e.g., `teddybridge-api.onrender.com`)

---

### Step 4: Connect Frontend to Backend (2 minutes)

1. Go back to Vercel dashboard
2. Go to your project → Settings → Environment Variables
3. Add:
   ```
   VITE_API_URL = https://your-render-url.onrender.com
   ```
4. Go to Deployments → Click "..." → "Redeploy"

---

### Step 5: Run Migrations on Backend

1. Go to Render dashboard
2. Click on your service → "Shell"
3. Run:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

---

## ✅ Done! Your app is live!

- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-api.onrender.com`

## 🔗 Update API URL in Frontend Code

If you hardcoded API URLs, update:
- `client/src/lib/api.ts` - Use `import.meta.env.VITE_API_URL`

---

## 🆘 Need Help?

**Common fixes:**

1. **CORS Error?**
   - Check `CORS_ALLOWED_ORIGINS` in Render environment variables
   - Make sure it includes your Vercel URL

2. **500 Error?**
   - Check Render logs (Logs tab)
   - Make sure all environment variables are set

3. **404 Error?**
   - Run migrations: `python manage.py migrate`
   - Check `ALLOWED_HOSTS` setting

---

## 🎯 Next Steps

1. **Custom Domain** (Optional):
   - Vercel: Settings → Domains → Add your domain
   - Render: Settings → Custom Domain → Add your domain

2. **SSL/HTTPS**: Automatically enabled on both platforms ✅

3. **Database**: Upgrade to PostgreSQL later if needed

---

**Total Cost: $0 (Completely FREE!)** 💰

