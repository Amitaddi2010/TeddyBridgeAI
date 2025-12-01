/**
 * API Configuration
 * 
 * In development: Uses Vite proxy (relative URLs work)
 * In production: Uses VITE_API_URL environment variable
 */

const getApiBaseUrl = (): string => {
  // In production, use VITE_API_URL if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In development, use relative URLs (Vite proxy handles it)
  // In production without VITE_API_URL, default to relative (for same-origin)
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper to build full API URLs
export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If API_BASE_URL ends with /api, we need to handle the endpoint properly
  if (API_BASE_URL.endsWith('/api')) {
    return `${API_BASE_URL}/${cleanEndpoint}`;
  }
  
  // If API_BASE_URL is a full URL, ensure proper formatting
  if (API_BASE_URL.startsWith('http')) {
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    return `${base}/api/${cleanEndpoint}`;
  }
  
  // Default: relative URL
  return `/api/${cleanEndpoint}`;
};

