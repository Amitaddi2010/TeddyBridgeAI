# 🚀 START HERE: Deploy TeddyBridge AI for FREE

> **📝 Note**: For local development setup with `.env` file, see [ENV_SETUP.md](./ENV_SETUP.md)

## ⚡ Quick Start (15 Minutes)

### Part 1: Deploy Frontend (5 minutes)

1. **Go to Vercel**: https://vercel.com/signup
   - Click "Continue with GitHub"
   - Authorize Vercel to access your GitHub

2. **Import Project**:
   - Click "Add New..." → "Project"
   - Find your repository: `TeddyBridgeAI`
   - Click "Import"

3. **Configure**:
   - **Root Directory**: Leave as root (IMPORTANT: Do NOT change to `client`)
   - **Framework Preset**: Other (or leave blank)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Deploy**:
   - Click "Deploy" button
   - Wait 2-3 minutes
   - ✅ Copy your URL (e.g., `teddybridge-ai.vercel.app`)

---

### Part 2: Deploy Backend (7 minutes)

1. **Go to Render**: https://render.com/signup
   - Click "Start Free" → "Sign up with GitHub"
   - Authorize Render

2. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Connect repository: `TeddyBridgeAI`
   - Click "Connect"

3. **Configure Service**:
   ```
   Name: teddybridge-api
   Environment: Python 3
   Region: Choose closest to you
   Branch: main
   Root Directory: (leave empty)
   Build Command: pip install --upgrade pip && pip install -r requirements.txt
   Start Command: python manage.py migrate --noinput && (python manage.py init_superuser || true) && gunicorn teddybridge.wsgi:application --bind 0.0.0.0:$PORT
   Plan: Free
   ```

4. **Add Environment Variables**:
   Click "Advanced" → "Add Environment Variable"
   
   Add these one by one:
   ```
   Name: GROQ_API_KEY
   Value: gsk_your_groq_api_key_here
   (Get from: https://console.groq.com/)
   
   Name: ASSEMBLYAI_API_KEY
   Value: your_assemblyai_api_key_here
   (Get from: https://www.assemblyai.com/)
   (Optional - only if using transcription)
   
   Name: DJANGO_SECRET_KEY
   Value: (generate a random string - use: https://djecrety.ir/)
   
   Name: DJANGO_DEBUG
   Value: False
   
   Name: ALLOWED_HOSTS
   Value: teddybridge-api.onrender.com
   
   Name: CORS_ALLOWED_ORIGINS
   Value: https://your-vercel-url.vercel.app
   (Replace with your actual Vercel URL from Part 1)
   
   Name: DJANGO_SUPERUSER_EMAIL
   Value: admin@yourdomain.com (your email for admin login)
   
   Name: DJANGO_SUPERUSER_PASSWORD
   Value: YourSecurePassword123! (choose a strong password)
   
   Name: IS_PRODUCTION
   Value: True (optional, helps with cookie settings)
   ```
   
   > 📖 **See [API_KEYS_SETUP.md](./API_KEYS_SETUP.md) for detailed instructions**

6. **Deploy**:
   - Click "Create Web Service"
   - Wait 5-10 minutes for first deployment
   - ✅ Copy your URL (e.g., `teddybridge-api.onrender.com`)

---

### Part 3: Connect Frontend to Backend (3 minutes)

**Note**: If you see build errors about Python packages, make sure Python Version is set to 3.11.9 in Render settings!

1. **Go back to Vercel**:
   - Open your project
   - Go to "Settings" → "Environment Variables"

2. **Add API URL** (CRITICAL - Required for API calls to work):
   ```
   Key: VITE_API_URL
   Value: https://your-render-url.onrender.com
   (Replace with your actual Render URL from Part 2)
   
   IMPORTANT: Make sure the URL does NOT end with /api
   Example: https://teddybridge-api.onrender.com ✅
   NOT: https://teddybridge-api.onrender.com/api ❌
   ```

3. **Redeploy**:
   - Go to "Deployments" tab
   - Click "..." on latest deployment
   - Click "Redeploy"
   - Wait 2 minutes

---

### Part 4: Setup Database (FREE - No Shell Needed!)

**Migrations run automatically on deployment!** ✅

The start command includes `python manage.py migrate --noinput` which will:
- Create all database tables automatically
- Run all migrations
- No manual intervention needed

**Add Superuser Environment Variables in Render** (Optional but Recommended):
   - Go to your Render service → Settings → Environment
   - Add these variables:
   ```
   Name: DJANGO_SUPERUSER_EMAIL
   Value: admin@yourdomain.com (your email)
   
   Name: DJANGO_SUPERUSER_PASSWORD
   Value: YourSecurePassword123! (choose a strong password)
   
   Name: DJANGO_SUPERUSER_USERNAME
   Value: admin (optional, defaults to 'admin')
   ```

2. **Migrations run automatically**:
   - Migrations will run automatically on each deployment
   - Superuser will be created automatically if it doesn't exist
   - No Shell access needed! ✅

**Option 2: Use Railway Instead (FREE with $5 credit - Has Shell)**

If you need shell access, use Railway instead:
1. Go to https://railway.app
2. Sign up (get $5 free credit - lasts months)
3. Deploy your repo
4. Railway has free shell access ✅

---

## ✅ Done! Your App is Live!

- 🌐 **Frontend**: https://your-app.vercel.app
- 🔧 **Backend**: https://your-api.onrender.com
- 👤 **Admin**: https://your-api.onrender.com/admin

---

## 🆘 Having Issues?

### Frontend shows errors?
- Check Vercel deployment logs
- Make sure `VITE_API_URL` is set correctly

### Backend shows 500 error?
- Check Render logs (Logs tab)
- Make sure all environment variables are set
- Migrations run automatically on deployment (no Shell needed!)
- Make sure `DJANGO_SUPERUSER_EMAIL` and `DJANGO_SUPERUSER_PASSWORD` are set

### CORS errors?
- Check `CORS_ALLOWED_ORIGINS` includes your Vercel URL
- Make sure URL starts with `https://`

### API not connecting?
- Verify `VITE_API_URL` in Vercel matches Render URL
- Check backend logs for errors
- Test API directly: `https://your-api.onrender.com/api/auth/me`

---

## 📝 Important Notes

1. **Free Tier Limits**:
   - Render: Sleeps after 15 min inactivity (wakes on first request)
   - Vercel: Unlimited bandwidth on free tier ✅

2. **Environment Variables**:
   - Never commit `.env` file to GitHub
   - Always add secrets in platform dashboards

3. **Database**:
   - Currently using SQLite (file-based)
   - Upgrade to PostgreSQL later if needed (free on Render)

---

## 🎯 Next Steps

1. ✅ Test your deployed app
2. ✅ Update admin user
3. ✅ Test API endpoints
4. 🌟 Share your live app!

---

## 📚 Need More Help?

- See `DEPLOYMENT_GUIDE.md` for detailed options
- See `QUICK_DEPLOY.md` for alternative platforms
- Check platform docs:
  - Vercel: https://vercel.com/docs
  - Render: https://render.com/docs

**Good luck! 🚀**

