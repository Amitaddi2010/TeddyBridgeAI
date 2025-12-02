# 🔑 API Keys Setup Guide

## 📍 Where to Add API Keys

### **Backend API Keys → Render (Backend)**
### **Frontend API URL → Vercel (Frontend)**

---

## 🚀 Render (Backend) - Add These API Keys

### Step 1: Go to Render Dashboard
1. Open https://render.com
2. Click on your service: `teddybridge-api`
3. Go to **Settings** → **Environment**

### Step 2: Add Backend API Keys

Add these environment variables one by one:

```
Name: GROQ_API_KEY
Value: gsk_your_groq_api_key_here
(Get from: https://console.groq.com/)

Name: ASSEMBLYAI_API_KEY
Value: your_assemblyai_api_key_here
(Get from: https://www.assemblyai.com/)
(Optional - only if using transcription features)

Name: TWILIO_ACCOUNT_SID
Value: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
(Get from: https://console.twilio.com/)
(Optional - only if using video calls)

Name: TWILIO_API_KEY
Value: SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
(Get from: https://console.twilio.com/ → API Keys)
(Optional - only if using video calls)

Name: TWILIO_API_SECRET
Value: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
(Get from: https://console.twilio.com/ → API Keys)
(Optional - only if using video calls)

Name: DJANGO_SECRET_KEY
Value: (generate at https://djecrety.ir/)

Name: DJANGO_DEBUG
Value: False

Name: ALLOWED_HOSTS
Value: teddybridge-api.onrender.com

Name: CORS_ALLOWED_ORIGINS
Value: https://your-vercel-url.vercel.app
(Replace with your actual Vercel URL)

Name: DJANGO_SUPERUSER_EMAIL
Value: admin@yourdomain.com

Name: DJANGO_SUPERUSER_PASSWORD
Value: YourSecurePassword123!

Name: IS_PRODUCTION
Value: True
(Optional - helps with cookie settings)
```

### Step 3: Save and Redeploy
- Click **Save Changes**
- Go to **Manual Deploy** → **Deploy latest commit**
- Wait for deployment to complete

---

## 🌐 Vercel (Frontend) - Add API URL Only

### Step 1: Go to Vercel Dashboard
1. Open https://vercel.com
2. Click on your project: `teddy-bridge-ai` (or your project name)
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Frontend API URL

Add this environment variable:

```
Key: VITE_API_URL
Value: https://teddybridge-api.onrender.com
(Replace with your actual Render URL)

IMPORTANT: 
✅ Do NOT include /api at the end
✅ Must start with https://
✅ Example: https://teddybridge-api.onrender.com ✅
❌ NOT: https://teddybridge-api.onrender.com/api ❌
```

### Step 3: Save and Redeploy
- Click **Save**
- Go to **Deployments** tab
- Click **"..."** on latest deployment
- Click **Redeploy**
- Wait 2-3 minutes

---

## 📋 Complete List of Variables

### **Render (Backend) Variables:**

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|--------------|
| `GROQ_API_KEY` | ✅ Yes | Groq AI API key | https://console.groq.com/ |
| `ASSEMBLYAI_API_KEY` | ❌ Optional | AssemblyAI for transcription | https://www.assemblyai.com/ |
| `TWILIO_ACCOUNT_SID` | ❌ Optional | Twilio Account SID for video calls | https://console.twilio.com/ |
| `TWILIO_API_KEY` | ❌ Optional | Twilio API Key for video calls | https://console.twilio.com/ |
| `TWILIO_API_SECRET` | ❌ Optional | Twilio API Secret for video calls | https://console.twilio.com/ |
| `DJANGO_SECRET_KEY` | ✅ Yes | Django secret key | https://djecrety.ir/ |
| `DJANGO_DEBUG` | ✅ Yes | Set to `False` | - |
| `ALLOWED_HOSTS` | ✅ Yes | Your Render URL | `your-app.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | ✅ Yes | Your Vercel URL | `https://your-app.vercel.app` |
| `DJANGO_SUPERUSER_EMAIL` | ✅ Yes | Admin email | Your email |
| `DJANGO_SUPERUSER_PASSWORD` | ✅ Yes | Admin password | Choose strong password |
| `IS_PRODUCTION` | ❌ Optional | Set to `True` | - |

### **Vercel (Frontend) Variables:**

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|--------------|
| `VITE_API_URL` | ✅ Yes | Your Render backend URL | `https://your-app.onrender.com` |

---

## 🔑 How to Get API Keys

### 1. Groq API Key (Required)
1. Go to https://console.groq.com/
2. Sign up / Log in
3. Go to **API Keys** section
4. Click **Create API Key**
5. Copy the key (starts with `gsk_`)
6. Add to Render as `GROQ_API_KEY`

### 2. AssemblyAI API Key (Optional)
1. Go to https://www.assemblyai.com/
2. Sign up / Log in
3. Go to **Dashboard** → **API Key**
4. Copy the key
5. Add to Render as `ASSEMBLYAI_API_KEY`

### 3. Django Secret Key
1. Go to https://djecrety.ir/
2. Click **Generate**
3. Copy the generated key
4. Add to Render as `DJANGO_SECRET_KEY`

---

## ✅ Verification Checklist

### Render (Backend):
- [ ] `GROQ_API_KEY` is set
- [ ] `DJANGO_SECRET_KEY` is set
- [ ] `DJANGO_DEBUG` = `False`
- [ ] `ALLOWED_HOSTS` = your Render URL
- [ ] `CORS_ALLOWED_ORIGINS` = your Vercel URL
- [ ] `DJANGO_SUPERUSER_EMAIL` is set
- [ ] `DJANGO_SUPERUSER_PASSWORD` is set
- [ ] All variables saved
- [ ] Service redeployed

### Vercel (Frontend):
- [ ] `VITE_API_URL` = your Render URL (without /api)
- [ ] Variable saved
- [ ] Frontend redeployed

---

## 🆘 Troubleshooting

### API Keys Not Working?
1. **Check spelling** - Variable names are case-sensitive
2. **Redeploy** - Changes require redeployment
3. **Check logs** - Render logs show if keys are being read
4. **No spaces** - Make sure there are no spaces in values

### Frontend Can't Connect to Backend?
1. **Check `VITE_API_URL`** - Must be your Render URL
2. **No `/api` suffix** - URL should NOT end with `/api`
3. **HTTPS required** - Must start with `https://`
4. **Redeploy frontend** - After changing variables

### CORS Errors?
1. **Check `CORS_ALLOWED_ORIGINS`** - Must include your Vercel URL
2. **Include `https://`** - URL must start with https://
3. **Redeploy backend** - After changing CORS settings

---

## 📝 Quick Reference

**Render = Backend API Keys** 🔑
- GROQ_API_KEY
- ASSEMBLYAI_API_KEY
- DJANGO_SECRET_KEY
- etc.

**Vercel = Frontend API URL** 🌐
- VITE_API_URL (points to Render)

---

## 💡 Pro Tip

After adding variables:
1. **Always redeploy** both services
2. **Check logs** to verify variables are being read
3. **Test the connection** by trying to login/register

