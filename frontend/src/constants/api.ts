const isBrowser = typeof window !== "undefined";
const isDev = typeof __DEV__ !== "undefined" && __DEV__;

// Development (Expo dev server): use absolute URL to backend on port 3000.
// Production (built & served via nginx/ingress): use relative "/api".
// API_URL env var can always override.
export const BASE_URL =
  process.env.API_URL ||
  (isDev ? "http://localhost:3000/api" : isBrowser ? "/api" : "http://localhost:3000/api");

export const AUTH_URL = `${BASE_URL}/auth`;
export const HISTORY_URL = `${BASE_URL}/history`;
export const UPLOAD_URL = `${BASE_URL}/upload`;
export const ADMIN_URL = `${BASE_URL}/admin`;

// Base URL for static assets (profile pictures, uploads).
// When API_URL is set, derive the origin from it.
// In dev mode, point to the backend directly.
// In production browser, use same origin (ingress routes /uploads etc.).
export const SERVER_BASE = process.env.API_URL
  ? process.env.API_URL.replace("/api", "")
  : isDev
    ? "http://localhost:3000"
    : isBrowser
      ? window.location.origin
      : "http://localhost:3000";
