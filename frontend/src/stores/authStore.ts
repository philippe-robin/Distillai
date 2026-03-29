import { create } from "zustand";
import * as authApi from "@/api/auth";
import type { UserResponse } from "@/types/api";

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem("auth_token"),
  user: null,
  isLoading: false,
  error: null,
  get isAuthenticated() {
    return get().token !== null;
  },

  async login(email, password) {
    set({ isLoading: true, error: null });
    try {
      const { access_token } = await authApi.login(email, password);
      localStorage.setItem("auth_token", access_token);
      set({ token: access_token, isLoading: false });
      await get().fetchUser();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  async register(email, password, fullName) {
    set({ isLoading: true, error: null });
    try {
      const { access_token } = await authApi.register(
        email,
        password,
        fullName,
      );
      localStorage.setItem("auth_token", access_token);
      set({ token: access_token, isLoading: false });
      await get().fetchUser();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout() {
    localStorage.removeItem("auth_token");
    set({ token: null, user: null });
  },

  async fetchUser() {
    try {
      const user = await authApi.getMe();
      set({ user });
    } catch {
      // Token may be invalid
      get().logout();
    }
  },

  clearError() {
    set({ error: null });
  },
}));
