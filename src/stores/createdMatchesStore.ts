import { create } from 'zustand';

import type { CreatedMatch } from '@/features/matches/lib/buildMatchDetail';

/**
 * Session store of matches created by the current user.
 *
 * Holds the **full entered record** (`CreatedMatch`) — the raw form input plus
 * the fields resolved at create time — as the in-memory source of truth until
 * the F1.1 backend lands. The read layers derive their shapes from it:
 * `getMatchDetail` (S12) and `getUpcoming` (S5 home) map each record via the
 * pure helpers in `@/features/matches/lib/buildMatchDetail`. State lives only
 * for the current app session (no persistence).
 */
interface CreatedMatchesState {
  createdMatches: CreatedMatch[];
}

interface CreatedMatchesActions {
  addCreatedMatch: (match: CreatedMatch) => void;
  removeCreatedMatch: (matchId: string) => void;
  updateCreatedMatch: (
    matchId: string,
    updates: Partial<CreatedMatch>,
  ) => void;
  getCreatedMatch: (matchId: string) => CreatedMatch | undefined;
  getCreatedMatches: () => CreatedMatch[];
  reset: () => void;
}

const initialState: CreatedMatchesState = {
  createdMatches: [],
};

export const useCreatedMatchesStore = create<
  CreatedMatchesState & CreatedMatchesActions
>((set, get) => ({
  ...initialState,

  addCreatedMatch: (match) =>
    set((state) => ({
      createdMatches: [match, ...state.createdMatches],
    })),

  removeCreatedMatch: (matchId) =>
    set((state) => ({
      createdMatches: state.createdMatches.filter((m) => m.id !== matchId),
    })),

  updateCreatedMatch: (matchId, updates) =>
    set((state) => ({
      createdMatches: state.createdMatches.map((m) =>
        m.id === matchId ? { ...m, ...updates } : m,
      ),
    })),

  getCreatedMatch: (matchId) =>
    get().createdMatches.find((m) => m.id === matchId),

  getCreatedMatches: () => get().createdMatches,

  reset: () => set(initialState),
}));
