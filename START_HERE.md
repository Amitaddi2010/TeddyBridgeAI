# 🚀 START HERE: Deploy TeddyBridge AI for FREE

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
   - **Root Directory**: Click "Edit" → Change to `client`
   - **Framework Preset**: Vite (should auto-detect)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

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
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn teddybridge.wsgi:application
   Plan: Free
   ```

4. **Add Environment Variables**:
   Click "Advanced" → "Add Environment Variable"
   
   Add these one by one:
   ```
   Name: DJANGO_SECRET_KEY
   Value: (generate a random string - use: https://djecrety.ir/)
   
   Name: DJANGO_DEBUG
   Value: False
   
   Name: ALLOWED_HOSTS
   Value: teddybridge-api.onrender.com
   
   Name: CORS_ALLOWED_ORIGINS
   Value: https://your-vercel-url.vercel.app
   (Replace with your actual Vercel URL from Part 1)
   ```

5. **Deploy**:
   - Click "Create Web Service"
   - Wait 5-10 minutes for first deployment
   - ✅ Copy your URL (e.g., `teddybridge-api.onrender.com`)

---

### Part 3: Connect Frontend to Backend (3 minutes)

1. **Go back to Vercel**:
   - Open your project
   - Go to "Settings" → "Environment Variables"

2. **Add API URL**:
   ```
   Key: VITE_API_URL
   Value: https://your-render-url.onrender.com
   (Replace with your actual Render URL)
   ```

3. **Redeploy**:
   - Go to "Deployments" tab
   - Click "..." on latest deployment
   - Click "Redeploy"
   - Wait 2 minutes

---

### Part 4: Setup Database (2 minutes)

1. **Go to Render Dashboard**:
   - Open your web service
   - Click "Shell" tab (at the top)

2. **Run Commands**:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```
   (Follow prompts to create admin user)

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
- Try running migrations in Shell

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

