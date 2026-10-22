import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthResponse, User } from "@/lib/types";

interface AuthState {
  token: string | null;
  user: User | null;
  expiresAt: number | null;
  signIn: (auth: AuthResponse) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      expiresAt: null,
      signIn: (auth) =>
        set({
          token: auth.accessToken,
          user: auth.user,
          expiresAt: Date.now() + auth.expiresInSeconds * 1000,
        }),
      logout: () => set({ token: null, user: null, expiresAt: null }),
    }),
    {
      name: "afrismart-auth",
      onRehydrateStorage: () => (state) => {
        if (state?.expiresAt && state.expiresAt < Date.now()) state.logout();
      },
    },
  ),
);
