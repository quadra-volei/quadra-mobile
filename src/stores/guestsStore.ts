import { create } from 'zustand';

import type { PresencePlayer } from '@/features/matches/types/matchDetail';

/**
 * Session store of guest players the organizer added to fill open slots, keyed
 * by match id.
 *
 * Guests have no app account, so they can't come from the (mocked) F1.2 payload
 * — they live here as the in-memory source of truth until F1.4 presence lands.
 * The read layer (`getMatchDetail`) merges a live snapshot of these into the
 * match's `players` at fetch time, for BOTH created matches and mock fixtures.
 * State lives only for the current app session (no persistence).
 */
interface GuestsState {
  /** guests[matchId] → the guest players added to that match. */
  guestsByMatch: Record<string, PresencePlayer[]>;
}

interface GuestsActions {
  addGuest: (matchId: string, guest: PresencePlayer) => void;
  removeGuest: (matchId: string, guestId: string) => void;
  getGuests: (matchId: string) => PresencePlayer[];
  reset: () => void;
}

const initialState: GuestsState = {
  guestsByMatch: {},
};

export const useGuestsStore = create<GuestsState & GuestsActions>(
  (set, get) => ({
    ...initialState,

    addGuest: (matchId, guest) =>
      set((state) => ({
        guestsByMatch: {
          ...state.guestsByMatch,
          [matchId]: [...(state.guestsByMatch[matchId] ?? []), guest],
        },
      })),

    removeGuest: (matchId, guestId) =>
      set((state) => ({
        guestsByMatch: {
          ...state.guestsByMatch,
          [matchId]: (state.guestsByMatch[matchId] ?? []).filter(
            (g) => g.id !== guestId,
          ),
        },
      })),

    getGuests: (matchId) => get().guestsByMatch[matchId] ?? [],

    reset: () => set(initialState),
  }),
);
