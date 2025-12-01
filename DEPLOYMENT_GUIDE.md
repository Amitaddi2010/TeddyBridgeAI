# Free Deployment Guide for TeddyBridge AI

This guide will help you deploy your TeddyBridge application for **FREE** using various platforms.

## 🎯 Overview

Your application has:
- **Frontend**: React app (Vite)
- **Backend**: Django REST API
- **Database**: SQLite (can upgrade to PostgreSQL for free)

---

## 🚀 Option 1: Vercel (Frontend) + Render (Backend) - RECOMMENDED

### **Frontend: Deploy to Vercel (FREE)**

1. **Sign up for Vercel**
   - Go to https://vercel.com
   - Sign up with GitHub (connect your GitHub account)

2. **Import your repository**
   - Click "New Project"
   - Import `Amitaddi2010/TeddyBridgeAI`
   - Select the repository

3. **Configure Build Settings**
   - **Framework Preset**: Vite
   - **Root Directory**: `client` (or leave blank if root is client)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Environment Variables** (if needed)
   - Add any frontend environment variables in Vercel dashboard
   - `VITE_API_URL` = Your backend URL (set this after deploying backend)

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your site will be live at: `your-app-name.vercel.app`

### **Backend: Deploy to Render (FREE)**

1. **Sign up for Render**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create a new Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure Settings**
   - **Name**: teddybridge-api (or any name)
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn teddybridge.wsgi:application`
   - **Plan**: Free

4. **Environment Variables**
   Add these in Render dashboard:
   ```
   DJANGO_SECRET_KEY=your-secret-key-here
   DJANGO_DEBUG=False
   ALLOWED_HOSTS=your-render-app.onrender.com
   DATABASE_URL=sqlite:///db.sqlite3 (or use PostgreSQL)
   CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (first time takes 5-10 minutes)
   - Your API will be at: `your-app-name.onrender.com`

6. **Update Frontend API URL**
   - Go back to Vercel
   - Add environment variable: `VITE_API_URL=https://your-app-name.onrender.com`
   - Redeploy frontend

---

## 🌐 Option 2: Netlify (Frontend) + Railway (Backend)

### **Frontend: Deploy to Netlify (FREE)**

1. **Sign up for Netlify**
   - Go to https://netlify.com
   - Sign up with GitHub

2. **Deploy from GitHub**
   - Click "New site from Git"
   - Select GitHub → Choose repository
   - Configure:
     - **Base directory**: `client`
     - **Build command**: `npm run build`
     - **Publish directory**: `client/dist`

3. **Environment Variables**
   - Site settings → Environment variables
   - Add: `VITE_API_URL=https://your-backend-url.railway.app`

4. **Deploy**
   - Click "Deploy site"
   - Your site: `your-app-name.netlify.app`

### **Backend: Deploy to Railway (FREE with $5 credit)**

1. **Sign up for Railway**
   - Go to https://railway.app
   - Sign up with GitHub
   - Get $5 free credit (usually enough for months)

2. **Create New Project**
   - Click "New Project"
   - "Deploy from GitHub repo"
   - Select your repository

3. **Configure**
   - Railway will auto-detect Django
   - Add environment variables in Variables tab
   - Set start command: `gunicorn teddybridge.wsgi:application`

4. **Deploy**
   - Railway will auto-deploy
   - Get your URL: `your-app.up.railway.app`

---

## 🐍 Option 3: PythonAnywhere (Backend) - Easiest for Django

### **Backend: Deploy to PythonAnywhere (FREE)**

1. **Sign up**
   - Go to https://pythonanywhere.com
   - Create free account

2. **Upload your code**
   - Go to Files tab
   - Upload your Django project (zip and extract)
   - Or use Git: `git clone https://github.com/Amitaddi2010/TeddyBridgeAI.git`

3. **Create Web App**
   - Go to Web tab
   - Click "Add a new web app"
   - Choose Django, Python 3.10
   - Set source code path: `/home/yourusername/TeddyBridgeAI`

4. **Configure WSGI file**
   - Edit WSGI configuration file
   - Point to: `teddybridge.wsgi.application`

5. **Environment Variables**
   - Add in Web app settings or use `.env` file

6. **Reload**
   - Click green "Reload" button
   - Your API: `yourusername.pythonanywhere.com`

---

## 📦 Quick Setup Scripts

### Create `vercel.json` for Frontend (if deploying to Vercel)

Create `client/vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite"
}
```

### Create `Procfile` for Backend (if deploying to Heroku/Railway)

Create `Procfile` in root:
```
web: gunicorn teddybridge.wsgi:application --bind 0.0.0.0:$PORT
```

### Update `requirements.txt` (add if missing)

Make sure `requirements.txt` includes:
```
Django>=4.2
djangorestframework
gunicorn
cors-headers
psycopg2-binary  # if using PostgreSQL
python-dotenv
```

### Create `render.yaml` (for Render.com)

Create `render.yaml` in root:
```yaml
services:
  - type: web
    name: teddybridge-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn teddybridge.wsgi:application
    envVars:
      - key: DJANGO_SECRET_KEY
        generateValue: true
      - key: DJANGO_DEBUG
        value: False
      - key: ALLOWED_HOSTS
        value: your-app.onrender.com
```

---

## 🔧 Important Configuration Changes

### 1. Update Django Settings for Production

In `teddybridge/settings.py`, add:

```python
import os

# For Render.com
ALLOWED_HOSTS = ['your-app.onrender.com', 'localhost']
if 'RENDER' in os.environ:
    ALLOWED_HOSTS.append(os.environ.get('RENDER_EXTERNAL_HOSTNAME'))

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "https://your-frontend.vercel.app",
    "http://localhost:5173",
]

# Database (use PostgreSQL in production)
if os.environ.get('DATABASE_URL'):
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(default=os.environ.get('DATABASE_URL'))
    }
```

### 2. Update Frontend API URL

In `client/src/lib/api.ts` or where you make API calls:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

---

## 🗄️ Free Database Options

### Option 1: SQLite (Simple, but limited)
- Works for small projects
- Already configured

### Option 2: Supabase PostgreSQL (FREE tier)
1. Sign up: https://supabase.com
2. Create new project
3. Get connection string
4. Update Django DATABASES setting

### Option 3: Render PostgreSQL (FREE tier)
- When creating Render service, add PostgreSQL database
- Use the DATABASE_URL provided

---

## ✅ Deployment Checklist

- [ ] Update `ALLOWED_HOSTS` in Django settings
- [ ] Set `DEBUG = False` for production
- [ ] Add CORS allowed origins
- [ ] Configure environment variables
- [ ] Update frontend API URL
- [ ] Test API endpoints
- [ ] Run database migrations on server
- [ ] Collect static files (if needed)

---

## 🆘 Troubleshooting

### Common Issues:

1. **CORS errors**
   - Add frontend URL to `CORS_ALLOWED_ORIGINS`
   - Install: `pip install django-cors-headers`

2. **Static files not loading**
   - Run: `python manage.py collectstatic`
   - Configure static files serving in settings

3. **Database errors**
   - Run migrations: `python manage.py migrate`
   - Create superuser: `python manage.py createsuperuser`

4. **API connection errors**
   - Check environment variables
   - Verify CORS settings
   - Check backend logs

---

## 📚 Additional Resources

- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **Railway Docs**: https://docs.railway.app
- **Django Deployment**: https://docs.djangoproject.com/en/stable/howto/deployment/

---

## 🎉 Recommended Setup (Easiest)

**Frontend**: Vercel (Automatic deployments from GitHub)
**Backend**: Render (Free tier, easy Django setup)

This combination is:
- ✅ Completely free
- ✅ Automatic deployments
- ✅ Easy to set up
- ✅ Reliable

Good luck with your deployment! 🚀

