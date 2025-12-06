# 🗄️ Database Setup Guide - Fix Data Reset Issue

## 🚨 Problem

Your data (users, patients, doctors, links) keeps getting reset because:
- SQLite database files are stored on ephemeral filesystem
- Render's free tier filesystem gets wiped on every deployment/restart
- All data is lost when the service restarts

## ✅ Solution: Use PostgreSQL (Free on Render)

PostgreSQL provides a **persistent database** that survives deployments and restarts.

---

## 📋 Step-by-Step Setup

### Step 1: Create PostgreSQL Database on Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +"** → **"PostgreSQL"**
3. **Configure**:
   - **Name**: `teddybridge-db` (or any name)
   - **Database**: `teddybridge` (or leave default)
   - **User**: Leave default
   - **Region**: Same region as your web service
   - **PostgreSQL Version**: 15 (or latest)
   - **Plan**: **Free**
4. **Click "Create Database"**
5. **Wait 2-3 minutes** for database to be created
6. **Copy the "Internal Database URL"** - it looks like:
   ```
   postgresql://user:password@dpg-xxxxx-a.oregon-postgres.render.com/dbname
   ```

### Step 2: Link Database to Your Web Service

1. **Go to your Web Service** (`teddybridge-api`)
2. **Click "Link"** → Select your PostgreSQL database
3. The `DATABASE_URL` environment variable will be automatically added

**OR Manually Add Environment Variable:**

1. **Go to your Web Service** → **Settings** → **Environment**
2. **Add Environment Variable**:
   - **Key**: `DATABASE_URL`
   - **Value**: Paste the "Internal Database URL" from Step 1

### Step 3: Redeploy Your Service

1. **Go to your Web Service** → **Manual Deploy** → **Deploy latest commit**
2. **Wait for deployment** (5-10 minutes)
3. ✅ Your database will now persist!

---

## 🔄 Migration Steps (After Setup)

After the database is configured, you need to run migrations:

### Option 1: Automatic (Recommended)
The start command already includes migrations:
```bash
python manage.py migrate --noinput
```
This runs automatically on every deployment.

### Option 2: Manual (if needed)
If you need to run migrations manually:
1. Go to Render Dashboard
2. Open your Web Service
3. Go to **Shell** tab (if available) or use **Manual Deploy**
4. Run: `python manage.py migrate`

---

## 📝 Environment Variables Summary

After setup, your Render Web Service should have:

```env
DATABASE_URL=postgresql://user:password@host:port/dbname  # Auto-added when linked
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=False
ALLOWED_HOSTS=teddybridge-api.onrender.com
# ... other environment variables
```

---

## 🧪 Verify Database is Working

1. **Check Render Logs**:
   - Go to your Web Service → **Logs**
   - Look for: `Operations to perform: Apply all migrations`
   - Should see: `Running migrations...` and `OK`

2. **Test Registration**:
   - Try registering a new user
   - Restart your service
   - Login should still work (data persisted!)

3. **Check Database** (Optional):
   - Go to PostgreSQL service → **Connect**
   - Use any PostgreSQL client to verify tables exist

---

## 🔧 Local Development

For local development, SQLite is still used (no `DATABASE_URL` set):

- **Development**: SQLite (`db.sqlite3`)
- **Production**: PostgreSQL (via `DATABASE_URL`)

This is configured automatically in `settings.py`!

---

## 🆘 Troubleshooting

### Issue: "No module named 'dj_database_url'"

**Solution**: Make sure `dj-database-url>=2.1.0` is in `requirements.txt` (already added!)

### Issue: "Could not connect to database"

**Solutions**:
1. Make sure `DATABASE_URL` environment variable is set correctly
2. Use "Internal Database URL" (not External) for Render services
3. Make sure database is in same region as web service
4. Check that database service is running (green status)

### Issue: "database does not exist"

**Solution**: Run migrations:
```bash
python manage.py migrate --noinput
```

### Issue: Data still resets

**Solutions**:
1. Make sure `DATABASE_URL` is set (check environment variables)
2. Verify database is linked to web service
3. Check logs to confirm PostgreSQL is being used (not SQLite)
4. Make sure database service is on "Free" plan (not trial)

---

## ✅ Success Checklist

- [ ] PostgreSQL database created on Render
- [ ] Database linked to web service (or `DATABASE_URL` manually set)
- [ ] Service redeployed with new configuration
- [ ] Migrations ran successfully (check logs)
- [ ] Tested registration/login - data persists after restart
- [ ] Verified database connection in logs

---

## 📚 Additional Resources

- **Render PostgreSQL Docs**: https://render.com/docs/databases
- **Django + PostgreSQL**: https://docs.djangoproject.com/en/stable/ref/databases/#postgresql-notes
- **dj-database-url**: https://pypi.org/project/dj-database-url/

---

## 💡 Why PostgreSQL?

- ✅ **Persistent storage** - Data survives deployments
- ✅ **Free tier** - Render offers free PostgreSQL
- ✅ **Production-ready** - Used by millions of apps
- ✅ **Automatic backups** - Render handles backups
- ✅ **Scalable** - Easy to upgrade later

Your data will now **persist** across deployments! 🎉

