import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Coarse push-notification preferences (S10 Notifications sub-screen).
 *
 * Exactly three on/off switches per SCOPE — no per-category granularity. All
 * default to `true`. Persisted to AsyncStorage (a NON-secret UI preference,
 * allowed per CLAUDE.md; auth tokens remain in expo-secure-store).
 */
type NotificationPrefsState = {
  invites: boolean;
  reminders: boolean;
  ranking: boolean;
  setInvites: (value: boolean) => void;
  setReminders: (value: boolean) => void;
  setRanking: (value: boolean) => void;
};

export const useNotificationPrefsStore = create<NotificationPrefsState>()(
  persist(
    (set) => ({
      invites: true,
      reminders: true,
      ranking: true,
      setInvites: (invites) => set({ invites }),
      setReminders: (reminders) => set({ reminders }),
      setRanking: (ranking) => set({ ranking }),
    }),
    {
      name: 'quadra.prefs.notifications',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
