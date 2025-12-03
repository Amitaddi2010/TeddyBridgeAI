// Firebase configuration
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: "teddybridge-f3f2c.firebaseapp.com",
  projectId: "teddybridge-f3f2c",
  storageBucket: "teddybridge-f3f2c.firebasestorage.app",
  messagingSenderId: "986791385024",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Validate Firebase configuration
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "") {
  console.error(
    "⚠️ Firebase API Key is missing!\n" +
    "Please set VITE_FIREBASE_API_KEY in your Vercel environment variables.\n" +
    "Get it from: Firebase Console → Project Settings → General → Your apps"
  );
}

if (!firebaseConfig.appId || firebaseConfig.appId === "") {
  console.error(
    "⚠️ Firebase App ID is missing!\n" +
    "Please set VITE_FIREBASE_APP_ID in your Vercel environment variables.\n" +
    "Get it from: Firebase Console → Project Settings → General → Your apps"
  );
}

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  console.log("✅ Firebase initialized successfully");
} catch (error) {
  console.error("❌ Firebase initialization failed:", error);
  // Create a minimal app even if initialization fails to prevent crashes
  try {
    app = initializeApp(firebaseConfig, 'fallback-app');
    auth = getAuth(app);
  } catch (fallbackError) {
    console.error("❌ Firebase fallback initialization also failed:", fallbackError);
    throw new Error("Firebase initialization failed. Please check your configuration.");
  }
}

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { auth };
export default app;

