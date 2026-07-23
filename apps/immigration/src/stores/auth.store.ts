import { create } from "zustand";
import { loginAgent } from "@/infrastructure/auth/http-auth.repository";

const API_URL = import.meta.env.VITE_PASSEPORT_API_URL as string | undefined;

interface AuthState {
  isLoading: boolean;
  error: string | null;
  login: (badge: string, password: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  isLoading: false,
  error: null,

  login: async (badge, password) => {
    if (!API_URL) {
      set({ error: "VITE_PASSEPORT_API_URL n'est pas configuré." });
      return false;
    }
    set({ isLoading: true, error: null });
    try {
      const { access_token } = await loginAgent(API_URL, badge, password);
      localStorage.setItem("auth_token", access_token);
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      return false;
    }
  },
}));
