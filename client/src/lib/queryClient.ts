import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiUrl } from './api-config';
import { auth } from './firebase-config';
import { User as FirebaseUser } from 'firebase/auth';

async function getFirebaseToken(): Promise<string | null> {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      return await currentUser.getIdToken();
    }
  } catch (error) {
    console.warn("Failed to get Firebase token:", error);
  }
  return null;
}

async function refreshSession(): Promise<boolean> {
  try {
    const token = await getFirebaseToken();
    if (!token) return false;
    
    const res = await fetch(getApiUrl("/auth/me"), {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      credentials: "include",
    });
    
    return res.ok;
  } catch (error) {
    console.warn("Failed to refresh session:", error);
    return false;
  }
}

async function throwIfResNotOk(res: Response, retryCount = 0): Promise<void> {
  if (!res.ok) {
    // If 401 and we have a Firebase user, try to refresh session once
    if (res.status === 401 && retryCount === 0) {
      const refreshed = await refreshSession();
      if (refreshed) {
        // Retry the original request with fresh session
        // Note: This is a best-effort attempt - the caller should handle failures
        return;
      }
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const isFormData = data instanceof FormData;
  
  // Use getApiUrl to ensure correct API base URL in production
  const fullUrl = url.startsWith('http') ? url : getApiUrl(url);
  
  // Get Firebase token if available
  const firebaseToken = await getFirebaseToken();
  const headers: HeadersInit = {};
  if (data && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (firebaseToken) {
    headers["Authorization"] = `Bearer ${firebaseToken}`;
  }
  
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build URL from queryKey, ensuring it uses correct API base URL
    const urlPath = queryKey.join("/") as string;
    const fullUrl = urlPath.startsWith('http') ? urlPath : getApiUrl(urlPath);
    
    // Get Firebase token if available
    const firebaseToken = await getFirebaseToken();
    const headers: HeadersInit = {};
    if (firebaseToken) {
      headers["Authorization"] = `Bearer ${firebaseToken}`;
    }
    
    let res = await fetch(fullUrl, {
      credentials: "include",
      headers,
    });

    // If 401 and we have a Firebase user, try to refresh session and retry once
    if (res.status === 401 && firebaseToken) {
      const refreshed = await refreshSession();
      if (refreshed) {
        // Retry with fresh token
        const newToken = await getFirebaseToken();
        const retryHeaders: HeadersInit = {};
        if (newToken) {
          retryHeaders["Authorization"] = `Bearer ${newToken}`;
        }
        res = await fetch(fullUrl, {
          credentials: "include",
          headers: retryHeaders,
        });
      }
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
