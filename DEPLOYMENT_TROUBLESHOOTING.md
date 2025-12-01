# Deployment Troubleshooting Guide

## Common Issues and Solutions

### Issue: "no such table: users" or Database Errors

**Problem**: Migrations haven't run on Render.

**Solution**:
1. Check Render logs to see if migrations ran
2. The start command should include: `python manage.py migrate --noinput`
3. If migrations aren't running, manually trigger them:
   - Go to Render Dashboard → Your Service → Manual Deploy
   - Or update the start command to ensure migrations run first

**Verify migrations ran**:
- Check Render logs for: "Running migrations..."
- Look for: "Operations to perform: Apply all migrations"

---

### Issue: 405 Method Not Allowed

**Problem**: Frontend can't reach backend API.

**Solution**:
1. Set `VITE_API_URL` in Vercel environment variables
2. Value should be your Render URL (e.g., `https://teddybridge-api.onrender.com`)
3. **Do NOT** include `/api` at the end
4. Redeploy frontend after setting the variable

---

### Issue: CORS Errors

**Problem**: Backend blocking frontend requests.

**Solution**:
1. In Render, set `CORS_ALLOWED_ORIGINS` environment variable
2. Value should be your Vercel URL (e.g., `https://teddy-bridge-ai.vercel.app`)
3. Make sure it starts with `https://`
4. Redeploy backend after setting the variable

---

### Issue: Python Version Mismatch

**Problem**: Render using wrong Python version (e.g., 3.13 instead of 3.11.9).

**Solution**:
1. In Render Dashboard → Settings → Environment
2. Set `PYTHON_VERSION` to `3.11.9`
3. Or use `runtime.txt` file (already created in repo)
4. Redeploy service

---

### Issue: Build Fails with Package Errors

**Problem**: Python packages failing to install.

**Solution**:
1. Ensure Python version is 3.11.9 (not 3.13)
2. Check `requirements.txt` uses `>=` instead of `==` for flexibility
3. Update build command: `pip install --upgrade pip && pip install -r requirements.txt`

---

### Issue: Migrations Not Running

**Problem**: Database tables don't exist.

**Solution**:
1. Check start command includes: `python manage.py migrate --noinput`
2. The `--noinput` flag prevents interactive prompts
3. Ensure migrations run BEFORE gunicorn starts
4. Check Render logs for migration output

**Manual fix** (if needed):
- Use Railway.app (has free shell access with $5 credit)
- Or upgrade Render to paid tier for shell access
- Or manually redeploy to trigger migrations

---

### Issue: Superuser Not Created

**Problem**: Admin account doesn't exist.

**Solution**:
1. Set environment variables in Render:
   - `DJANGO_SUPERUSER_EMAIL`
   - `DJANGO_SUPERUSER_PASSWORD`
   - `DJANGO_SUPERUSER_USERNAME` (optional)
2. The `init_superuser` command runs automatically on deployment
3. Check logs for: "Successfully created superuser"

---

### Issue: Static Files Not Loading

**Problem**: CSS/JS files return 404.

**Solution**:
1. Ensure `whitenoise` is in `requirements.txt` ✅
2. Django settings should include WhiteNoise middleware
3. Run `python manage.py collectstatic` during build (if needed)

---

### Issue: Environment Variables Not Working

**Problem**: Variables not being read.

**Solution**:
1. Check variable names match exactly (case-sensitive)
2. In Render: Settings → Environment → Verify variables are set
3. Redeploy after adding/changing variables
4. Check logs to see if variables are being read

---

## Quick Health Checks

### Backend Health Check
Visit: `https://your-api.onrender.com/api/health`
Should return: `{"status": "healthy", ...}`

### Frontend API Connection
1. Open browser DevTools → Network tab
2. Try to register/login
3. Check if requests go to Render URL (not Vercel)
4. Check for CORS errors in console

### Database Status
- Check Render logs for migration messages
- Look for "Operations to perform: Apply all migrations"
- Verify no "no such table" errors

---

## Still Having Issues?

1. **Check Render Logs**: Dashboard → Your Service → Logs
2. **Check Vercel Logs**: Dashboard → Your Project → Deployments → View Logs
3. **Verify Environment Variables**: Both platforms
4. **Test API Directly**: Use Postman/curl to test backend
5. **Check CORS Settings**: Ensure frontend URL is in allowed origins

---

## Useful Commands (if you have shell access)

```bash
# Check migrations status
python manage.py showmigrations

# Run migrations manually
python manage.py migrate

# Create superuser manually
python manage.py createsuperuser

# Check Django version
python -m django --version

# Check Python version
python --version
```

---

## Contact & Support

If issues persist:
1. Check all environment variables are set correctly
2. Verify both services are deployed and running
3. Review logs for specific error messages
4. Ensure Python version matches (3.11.9)

