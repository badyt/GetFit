export const BASE_URL = process.env.API_URL || "http://localhost:3000/api";
export const AUTH_URL = `${BASE_URL}/auth`;
export const HISTORY_URL = `${BASE_URL}/history`;
export const UPLOAD_URL = `${BASE_URL}/upload`;
export const SERVER_BASE = process.env.API_URL ? process.env.API_URL.replace('/api', '') : "http://localhost:3000";
