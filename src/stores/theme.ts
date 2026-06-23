import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Appearance preference (S10 "Aparência").
 *
 * Locked behavior: all three options are selectable and persisted; only `light`
 * actually re-themes the UI today (DESIGN_SYSTEM has no dark tokens yet).
 * `dark`/`system` persist the preference and carry an "Em breve" affordance on
 * their tiles.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

type ThemeState = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
};

// Persisted to AsyncStorage — a NON-secret UI preference (allowed per CLAUDE.md;
// auth tokens remain in expo-secure-store). Namespaced storage key.
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'quadra.prefs.theme',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
