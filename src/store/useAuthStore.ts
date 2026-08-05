import { create } from "zustand";

interface AuthState {
  token: string | null;
  user: {
    id: number;
    email: string;
    name?: string;
    role: string;
    account_id: number;
  } | null;
  setAuth: (token: string, user: AuthState["user"]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("xatwoot_token") : null,
  user:
    typeof window !== "undefined" && localStorage.getItem("xatwoot_user")
      ? JSON.parse(localStorage.getItem("xatwoot_user")!)
      : null,
  setAuth: (token, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("xatwoot_token", token);
      localStorage.setItem("xatwoot_user", JSON.stringify(user));
    }
    set({ token, user });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("xatwoot_token");
      localStorage.removeItem("xatwoot_user");
    }
    set({ token: null, user: null });
  },
}));
