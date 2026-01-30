import AsyncStorage from "@react-native-async-storage/async-storage";
import {create} from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AUTH_URL } from "../constants/api";

type User = {
  id: string | number;
  name: string;
  email: string;
  role: string;
};

type AuthState = {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: string) => Promise<any>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<any>;
  logout: () => void;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setToken: (token) => set(() => ({ token, isAuthenticated: !!token })),
      setUser: (user) => set(() => ({ user })),

      login: async (email, password, role) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const res = await fetch(`${AUTH_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, role }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const data = await res.json();

          if (!res.ok || !data.success) {
            throw new Error(data.message || "Login failed");
          }

          set(() => ({ token: data.token, user: data.user, isAuthenticated: true }));
          return data;
        } catch (error: any) {
          if (error.name === 'AbortError') {
            throw new Error("Request timed out. Please check your connection.");
          }
          throw new Error(error.message || "Login error");
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

          set(() => ({ token: data.token, user: data.user, isAuthenticated: true }));
          return data;
        } catch (error: any) {
          if (error.name === 'AbortError') {
            throw new Error("Request timed out. Please check your connection.");
          }
          throw new Error(error.message || "Register error");
        }
      },

      logout: () => set(() => ({ token: null, user: null, isAuthenticated: false })),
    }),
    {
      name: "getfit-auth",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useAuthStore;
