/**
 * S10 — Appearance theme store (`src/stores/theme.ts`).
 *
 * Covers the persistence half of the S10 acceptance criterion:
 *  "the choice persists via useThemeStore (AsyncStorage) across app restarts."
 *
 * Uses the REAL zustand store with the package's official in-memory AsyncStorage
 * mock, so the persist middleware is exercised end-to-end: a chosen theme is
 * written to the namespaced AsyncStorage key, and a persisted value rehydrates
 * back into the store (the "restart" path).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useThemeStore } from '@/stores/theme';

const STORAGE_KEY = 'quadra.prefs.theme';

// Flush the persist middleware's async setItem write.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  await AsyncStorage.clear();
  useThemeStore.setState({ theme: 'light' });
});

describe('useThemeStore', () => {
  it('defaults to the "light" appearance', () => {
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('setTheme updates the in-memory state', () => {
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('persists the chosen theme to the namespaced AsyncStorage key', async () => {
    useThemeStore.getState().setTheme('system');
    await flush();

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).state.theme).toBe('system');
  });

  it('rehydrates a persisted theme on restart', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { theme: 'dark' }, version: 0 }),
    );

    await useThemeStore.persist.rehydrate();

    expect(useThemeStore.getState().theme).toBe('dark');
  });
});
