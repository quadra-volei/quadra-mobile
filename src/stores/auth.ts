import { create } from 'zustand';

type AuthState = {
  isAuthenticated: boolean;
  hasProfile: boolean;
  userId: string | null;
  accessToken: string | null;
  setAuth: (params: {
    userId: string;
    accessToken: string;
    hasProfile: boolean;
  }) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  hasProfile: false,
  userId: null,
  accessToken: null,
  setAuth: ({ userId, accessToken, hasProfile }) =>
    set({ isAuthenticated: true, userId, accessToken, hasProfile }),
  clearAuth: () =>
    set({ isAuthenticated: false, hasProfile: false, userId: null, accessToken: null }),
}));
