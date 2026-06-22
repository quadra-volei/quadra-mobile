import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

/** S10 "Aparência" preference — persisted effect wired when dark tokens land. */
export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'light',
  setMode: (mode) => set({ mode }),
}));
