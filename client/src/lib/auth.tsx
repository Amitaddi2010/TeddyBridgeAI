import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Doctor, Patient } from "@shared/schema";
import { getApiUrl } from "./api-config";
import { auth, googleProvider } from "./firebase-config";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider
} from "firebase/auth";

interface AuthUser extends User {
  doctor?: Doctor;
  patient?: Patient;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: "doctor" | "patient") => Promise<void>;
  loginWithGoogle: (role: "doctor" | "patient") => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async (firebaseToken?: string) => {
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (firebaseToken) {
        headers["Authorization"] = `Bearer ${firebaseToken}`;
      }
      
      const res = await fetch(getApiUrl("/auth/me"), { 
        credentials: "include",
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        // 401 is expected when not logged in - don't log as error
        if (res.status !== 401) {
          console.warn("Failed to fetch user:", res.status, res.statusText);
        }
        setUser(null);
      }
    } catch (error) {
      // Silently handle network errors - user is just not authenticated
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Get Firebase ID token and fetch user from backend
        const token = await firebaseUser.getIdToken();
        await fetchUser(token);
      } else {
        // Firebase user is signed out, clear local user
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Try Firebase first (for users who registered with email/password through Firebase)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      
      // Send token to backend for verification and user data
      const res = await fetch(getApiUrl("/auth/login"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      
      if (!res.ok) {
        let errorData: any;
        try {
          errorData = await res.json();
        } catch {
          const errorText = await res.text();
          errorData = { error: errorText };
        }
        
        // Check for Google-signup error
        if (errorData.error === 'GOOGLE_SIGNUP_REQUIRED') {
          const error: any = new Error(errorData.message || "This account was created using Google Sign-In. Please continue with Google or create a password using Forgot Password.");
          error.googleSignupRequired = true;
          throw error;
        }
        
        throw new Error(errorData.message || errorData.error || "Login failed");
      }
      
      await fetchUser(token);
      // After successful login, redirect will be handled by the component
      return;
    } catch (error: any) {
      // If Firebase auth fails, fallback to Django auth
      if (error.code && error.code.startsWith('auth/')) {
        // Check for configuration errors
        if (error.code === 'auth/invalid-api-key' || error.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
          throw new Error("Firebase API key is invalid. Please contact the administrator.");
        }
        if (error.code === 'auth/configuration-not-found') {
          throw new Error("Firebase is not properly configured. Please contact the administrator.");
        }
        
        // Firebase error - try Django auth as fallback
        const res = await fetch(getApiUrl("/auth/login"), {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        });
        
        if (!res.ok) {
          let errorData: any;
          try {
            errorData = await res.json();
          } catch {
            const errorText = await res.text();
            errorData = { error: errorText };
          }
          
          // Check for Google-signup error
          if (errorData.error === 'GOOGLE_SIGNUP_REQUIRED') {
            const error: any = new Error(errorData.message || "This account was created using Google Sign-In. Please continue with Google or create a password using Forgot Password.");
            error.googleSignupRequired = true;
            throw error;
          }
          
          // Provide user-friendly error message
          if (error.code === 'auth/user-not-found') {
            throw new Error("User not found. Please register first.");
          } else if (error.code === 'auth/wrong-password') {
            throw new Error("Incorrect password. Please try again.");
          } else if (error.code === 'auth/invalid-email') {
            throw new Error("Invalid email address.");
          }
          
          throw new Error(errorData.message || errorData.error || error.message || "Login failed");
        }
        
        await fetchUser();
      } else if (error.googleSignupRequired) {
        // Re-throw Google-signup errors
        throw error;
      } else {
        throw error;
      }
    }
  };

  const register = async (email: string, password: string, name: string, role: "doctor" | "patient") => {
    // Create user in Firebase
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    
    // Register with backend (additional fields)
    const res = await fetch(getApiUrl("/auth/register"), {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ email, password, name, role, firebaseUid: userCredential.user.uid }),
      credentials: "include",
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || "Registration failed");
    }
    await fetchUser(token);
  };

  const loginWithGoogle = async (role?: "doctor" | "patient") => {
    try {
      // Sign in with Google via Firebase
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential) {
        throw new Error("Google sign-in failed");
      }
      
      const token = await result.user.getIdToken();
      const email = result.user.email;
      const name = result.user.displayName || result.user.email?.split("@")[0] || "User";
      const photoUrl = result.user.photoURL;
      
      // Register/login with backend (don't send role if not provided - let backend detect new user)
      const res = await fetch(getApiUrl("/auth/google"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          email,
          name,
          ...(role && { role }),  // Only include role if provided
          firebaseUid: result.user.uid,
          photoUrl
        }),
        credentials: "include",
      });
      
      const data = await res.json();
      
      // Handle error responses
      if (!res.ok) {
        // 503 Service Unavailable usually means Firebase is not configured
        if (res.status === 503) {
          const errorMessage = data.message || data.error || "Firebase authentication is not configured on the server. Please contact support.";
          const error: any = new Error(errorMessage);
          error.isConfigurationError = true;
          throw error;
        }
        const errorMessage = data.message || data.error || "Google sign-in failed";
        throw new Error(errorMessage);
      }
      
      // Check if user needs to select role
      if (data.requiresRoleSelection || (data.isNewUser && !role)) {
        // Store Firebase user info in sessionStorage to complete registration
        sessionStorage.setItem('googleSignInData', JSON.stringify({
          email,
          name,
          photoUrl,
          firebaseToken: token,
          firebaseUid: result.user.uid
        }));
        // Throw a special error that the UI can handle
        const error: any = new Error("ROLE_SELECTION_REQUIRED");
        error.requiresRoleSelection = true;
        error.email = email;
        error.name = name;
        throw error;
      }
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Google sign-in failed");
      }
      
      await fetchUser(token);
    } catch (error: any) {
      // Handle Firebase popup errors gracefully
      if (error.code === "auth/popup-closed-by-user") {
        throw new Error("Sign-in was cancelled");
      } else if (error.code === "auth/popup-blocked") {
        throw new Error("Popup was blocked. Please allow popups and try again.");
      } else if (error.code === "auth/invalid-api-key" || error.code === "auth/api-key-not-valid.-please-pass-a-valid-api-key.") {
        throw new Error("Firebase API key is invalid. Please contact the administrator.");
      } else if (error.code === "auth/configuration-not-found") {
        throw new Error("Firebase is not properly configured. Please contact the administrator.");
      } else if (error.message && error.message.includes("Cross-Origin-Opener-Policy")) {
        // COOP error - still try to proceed if we have user data
        console.warn("COOP warning (non-fatal):", error.message);
        // Continue with the flow if possible
      }
      throw error;
    }
  };

  const logout = async () => {
    // Sign out from Firebase
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      // Ignore Firebase sign-out errors if Firebase is not configured
      console.warn("Firebase sign-out error (ignored):", error);
    }
    // Sign out from backend
    try {
      await fetch(getApiUrl("/auth/logout"), { method: "POST", credentials: "include" });
    } catch (error) {
      // Ignore backend sign-out errors
      console.warn("Backend sign-out error (ignored):", error);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, loginWithGoogle, logout, refetch: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
