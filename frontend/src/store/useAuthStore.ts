import AsyncStorage from "@react-native-async-storage/async-storage";
import {create} from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AUTH_URL } from "../constants/api";

type User = {
  id: string | number;
  name: string;
  email: string;
  role: string;
  isEmailVerified?: boolean;
  profilePicture?: string | null;
  createdAt?: string;
  trainerId?: string | null;
  trainer?: {
    id: string;
    name: string;
    profilePicture?: string | null;
  } | null;
};

type AuthState = {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<any>;
  logout: () => void;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  validateToken: () => Promise<void>;
  clearAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isHydrated: false,

      setToken: (token) => set(() => ({ token, isAuthenticated: !!token })),
      setUser: (user) => set(() => ({ user })),

      login: async (email, password) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const res = await fetch(`${AUTH_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const data = await res.json();

          if (!res.ok || !data.success) {
            // Create error with code if available
            const error: any = new Error(data.message || "Login failed");
            if (data.code) {
              error.code = data.code;
              error.email = data.email;
              error.name = data.name;
            }
            throw error;
          }

          set(() => ({ token: data.token, user: data.user, isAuthenticated: true }));
          return data;
        } catch (error: any) {
          if (error.name === 'AbortError') {
            throw new Error("Request timed out. Please check your connection.");
          }
          // Re-throw error with code preserved
          throw error;
        }
      },

      register: async (name, email, password, phone) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const res = await fetch(`${AUTH_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, phone }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.message || "Registration failed");
          }

          // Don't auto-login if email is not verified
          // User must verify email first
          set(() => ({ token: null, user: null, isAuthenticated: false }));
          return data;
        } catch (error: any) {
          if (error.name === 'AbortError') {
            throw new Error("Request timed out. Please check your connection.");
          }
          throw new Error(error.message || "Register error");
        }
      },

      logout: async () => {
        // Clear auth state
        set(() => ({ token: null, user: null, isAuthenticated: false }));
      },

      clearAuth: async () => {
        // Clear auth state - persist middleware will sync automatically
        console.log("Clearing all auth data");
        set(() => ({ token: null, user: null, isAuthenticated: false }));
      },

      refreshUser: async () => {
        const { token, user } = get();
        if (!token || !user) {
          return;
        }
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const res = await fetch(`${AUTH_URL}/me`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              set(() => ({ user: data.user }));
            } else {
              // Invalid response, clear auth
              console.log("Invalid user data, clearing auth");
              await get().clearAuth();
            }
          } else {
            // Request failed, clear auth
            console.log("Failed to refresh user, clearing auth");
            await get().clearAuth();
          }
        } catch (error) {
          console.log("Error refreshing user", error);
          await get().clearAuth();
        }
      },

      validateToken: async () => {
        const { token, clearAuth } = get();
        if (!token) {
          await clearAuth();
          return;
        }
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const res = await fetch(`${AUTH_URL}/validate`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // If validation fails, clear auth data
          if (!res.ok) {
            console.log("Token validation failed, clearing auth data");
            await clearAuth();
            return;
          }

          // If successful, update user data
          const data = await res.json();
          if (data.success && data.user) {
            set(() => ({ user: data.user, isAuthenticated: true }));
          } else {
            // Invalid response, clear auth
            console.log("Invalid validation response, clearing auth data");
            await clearAuth();
          }
        } catch (error) {
          console.log("Token validation error, clearing auth data", error);
          await clearAuth();
        }
      },
    }),
    {
      name: "getfit-auth",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);

export default useAuthStore;
