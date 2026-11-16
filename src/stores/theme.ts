import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Appearance preference (S10 "Aparência"): light, dark or the phone's setting
 * (`system`). The root layout hands it to nativewind's `colorScheme.set`, which
 * switches the CSS variables of `global.css` and the `useThemeColors` values
 * (DECISIONS #203).
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
