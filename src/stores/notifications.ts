import { create } from 'zustand';

export type NotificationPrefKey = 'convites' | 'lembretes' | 'ranking';

type NotificationPrefs = Record<NotificationPrefKey, boolean>;

type NotificationState = NotificationPrefs & {
  setPref: (key: NotificationPrefKey, value: boolean) => void;
};

/** S10 coarse push notification toggles (convites, lembretes, ranking). */
export const useNotificationStore = create<NotificationState>((set) => ({
  convites: true,
  lembretes: true,
  ranking: true,
  setPref: (key, value) => set({ [key]: value }),
}));
