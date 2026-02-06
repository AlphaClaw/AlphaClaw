import { create } from "zustand";

export type AuthStore = {
  password: string;
  onboarding: boolean;
  setPassword: (password: string) => void;
  setOnboarding: (onboarding: boolean) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  password: "",
  onboarding: false,
  setPassword: (password) => set({ password }),
  setOnboarding: (onboarding) => set({ onboarding }),
}));
