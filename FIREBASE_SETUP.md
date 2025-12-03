# Firebase Authentication Setup Guide

This guide explains how to set up Firebase Authentication for the TeddyBridge application.

## Project Details
- **Project Name**: teddybridge
- **Project ID**: teddybridge-f3f2c
- **Project Number**: 986791385024

## Frontend Setup (Vercel)

### 1. Get Firebase Configuration Keys

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `teddybridge-f3f2c`
3. Click on the gear icon ⚙️ → Project settings
4. Scroll down to "Your apps" section
5. If you haven't created a web app, click "Add app" → Web (</>) icon
6. Register your app and copy the configuration keys

### 2. Set Environment Variables in Vercel

Go to your Vercel project settings → Environment Variables and add:

```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

**Note**: The `authDomain`, `projectId`, `storageBucket`, and `messagingSenderId` are already configured in `client/src/lib/firebase-config.ts` using the project details provided.

### 3. Enable Authentication Methods in Firebase Console

1. Go to Firebase Console → Authentication → Sign-in method
2. Enable **Email/Password** authentication
3. Enable **Google** authentication
   - Click on Google → Enable
   - Add your authorized domains (e.g., `teddy-bridge-ai.vercel.app`, `localhost`)

## Backend Setup (Render)

### 1. Generate Firebase Service Account Key

1. Go to Firebase Console → Project settings → Service accounts
2. Click "Generate new private key"
3. Download the JSON file (this contains your credentials)

### 2. Set Environment Variables in Render

Go to your Render service → Environment and add:

**Option 1: JSON String (Recommended for Render)**
```
FIREBASE_CREDENTIALS_JSON={"type":"service_account","project_id":"teddybridge-f3f2c",...}
```
Copy the entire contents of the downloaded JSON file as a single-line JSON string.

**Option 2: File Path (If storing file on server)**
```
FIREBASE_CREDENTIALS_PATH=/path/to/service-account-key.json
```

### 3. Install Firebase Admin SDK

The `firebase-admin` package is already added to `requirements.txt`. After deployment, it will be automatically installed.

## Features Implemented

### ✅ Email/Password Authentication
- Users can register with email and password
- Users can login with email and password
- Passwords are securely stored in Firebase

### ✅ Google Sign-In
- Users can sign in with their Google account
- Available on both login and register pages
- Automatically creates user account if doesn't exist
- Supports role selection (doctor/patient) during registration

### ✅ Backend Token Verification
- Backend verifies Firebase ID tokens
- User accounts are synced between Firebase and Django database
- Session-based authentication for Django compatibility

## How It Works

1. **Frontend (Firebase Client SDK)**
   - User signs in with email/password or Google via Firebase
   - Firebase returns an ID token
   - Token is sent to backend in `Authorization: Bearer <token>` header

2. **Backend (Firebase Admin SDK)**
   - Receives the ID token
   - Verifies token with Firebase
   - Creates/updates user in Django database
   - Creates Django session for API access

3. **API Requests**
   - Include Firebase token in Authorization header
   - Backend verifies token and authenticates user
   - Django session is used for subsequent requests

## Troubleshooting

### Frontend: "Firebase: Error (auth/configuration-not-found)"
- Make sure `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_APP_ID` are set in Vercel environment variables
- Verify the values match your Firebase project settings

### Backend: "Firebase authentication not configured"
- Check that `FIREBASE_CREDENTIALS_JSON` or `FIREBASE_CREDENTIALS_PATH` is set in Render
- Verify the JSON is valid and contains all required fields
- Check Render logs for Firebase initialization errors

### Google Sign-In Popup Blocked
- Make sure your domain is added to authorized domains in Firebase Console
- Check browser popup blocker settings
- Verify Firebase project is correctly configured

## Testing

1. **Email/Password Registration**
   - Go to `/register`
   - Fill in email, password, name, and role
   - Submit form
   - Should create account in both Firebase and Django

2. **Google Sign-In**
   - Click "Continue with Google" on login or register page
   - Select Google account
   - Should sign in and redirect to dashboard

3. **Email/Password Login**
   - Go to `/login`
   - Enter email and password
   - Should authenticate and redirect to dashboard

## Security Notes

- Firebase ID tokens expire after 1 hour
- Backend automatically refreshes tokens when needed
- All API endpoints verify tokens before processing requests
- User passwords are never sent to Django backend (handled by Firebase)

