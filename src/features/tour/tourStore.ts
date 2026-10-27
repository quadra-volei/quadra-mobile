import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { TOUR_STEPS } from '@/features/tour/tourSteps';

/**
 * Where the tour is: closed, the welcome card (0) or a highlighted step
 * (1 … TOUR_STEPS.length). The number is also the `lastStep` sent to the API.
 */
export type TourPhase = 'closed' | number;

export const TOUR_LAST_PHASE = TOUR_STEPS.length;

type TourState = {
  phase: TourPhase;
  /**
   * Tour version each account already finished or skipped on this phone. The
   * API keeps the real record (`tour` on `profiles/me`); this copy stops the
   * tour from coming back while that record is loading or failed to save.
   */
  seen: Record<string, number>;
  open: () => void;
  next: () => void;
  close: () => void;
  markSeen: (userId: string, version: number) => void;
};

// Persisted to AsyncStorage: a non-secret UI preference (CLAUDE.md). Only `seen`.
export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      phase: 'closed',
      seen: {},
      open: () => set({ phase: 0 }),
      next: () =>
        set((s) => (typeof s.phase === 'number' && s.phase < TOUR_LAST_PHASE ? { phase: s.phase + 1 } : s)),
      close: () => set({ phase: 'closed' }),
      markSeen: (userId, version) => set((s) => ({ seen: { ...s.seen, [userId]: version } })),
    }),
    {
      name: 'quadra.prefs.tour',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ seen: s.seen }),
    },
  ),
);
