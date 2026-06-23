/**
 * S10 — Notification preferences store (`src/stores/notificationPrefs.ts`).
 *
 * Covers the persistence half of the S10 acceptance criterion:
 *  "toggling each persists via useNotificationPrefsStore (AsyncStorage) and the
 *   saved state is reflected after restart."
 *
 * Uses the REAL zustand store with the official in-memory AsyncStorage mock so the
 * persist middleware is exercised end-to-end.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useNotificationPrefsStore } from '@/stores/notificationPrefs';

const STORAGE_KEY = 'quadra.prefs.notifications';

// Flush the persist middleware's async setItem write.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  await AsyncStorage.clear();
  useNotificationPrefsStore.setState({
    invites: true,
    reminders: true,
    ranking: true,
  });
});

describe('useNotificationPrefsStore', () => {
  it('defaults all three coarse preferences to on', () => {
    const { invites, reminders, ranking } =
      useNotificationPrefsStore.getState();
    expect({ invites, reminders, ranking }).toEqual({
      invites: true,
      reminders: true,
      ranking: true,
    });
  });

  it('each setter updates only its own preference', () => {
    useNotificationPrefsStore.getState().setReminders(false);
    const { invites, reminders, ranking } =
      useNotificationPrefsStore.getState();
    expect({ invites, reminders, ranking }).toEqual({
      invites: true,
      reminders: false,
      ranking: true,
    });
  });

  it('persists toggled preferences to the namespaced AsyncStorage key', async () => {
    useNotificationPrefsStore.getState().setInvites(false);
    useNotificationPrefsStore.getState().setRanking(false);
    await flush();

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const persisted = JSON.parse(raw as string).state;
    expect(persisted.invites).toBe(false);
    expect(persisted.reminders).toBe(true);
    expect(persisted.ranking).toBe(false);
  });

  it('rehydrates persisted preferences on restart', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: { invites: false, reminders: true, ranking: false },
        version: 0,
      }),
    );

    await useNotificationPrefsStore.persist.rehydrate();

    const { invites, reminders, ranking } =
      useNotificationPrefsStore.getState();
    expect({ invites, reminders, ranking }).toEqual({
      invites: false,
      reminders: true,
      ranking: false,
    });
  });
});
