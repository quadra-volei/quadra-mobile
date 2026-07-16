import { create } from 'zustand';

import type {
  ParticipationType,
  PresenceStatus,
} from '@/features/matches/types/matchDetail';

/**
 * Session store of the CURRENT USER's own presence, keyed by match id.
 *
 * The (mocked) F1.2 payload is a fixed fixture, so a presence write has nowhere
 * to land until F1.4 presence lands — this store is that in-memory source of
 * truth. The read layer (`getMatchDetail`) merges a live snapshot at fetch time:
 * a CONFIRMADO entry puts the user into the match's `players` (they show up in
 * the confirmed grid), and anything else takes them back out. Mirrors
 * `guestsStore`, which does the same for organizer-added guests.
 *
 * Single-user by construction: the app has one signed-in user per session, so
 * keying by match id alone is enough. State lives only for the current session.
 */
export type MyPresence = {
  status: PresenceStatus;
  /**
   * Set when the user took an open drop-in slot (`useJoinMatch`) rather than
   * being an invited Regular. Promotes `myParticipationType` on merge, so the
   * join CTA doesn't reappear after joining.
   */
  participation?: ParticipationType;
};

interface PresenceState {
  /** presenceByMatch[matchId] → the current user's presence on that match. */
  presenceByMatch: Record<string, MyPresence>;
}

interface PresenceActions {
  setPresence: (matchId: string, presence: MyPresence) => void;
  getPresence: (matchId: string) => MyPresence | undefined;
  reset: () => void;
}

const initialState: PresenceState = {
  presenceByMatch: {},
};

export const usePresenceStore = create<PresenceState & PresenceActions>(
  (set, get) => ({
    ...initialState,

    setPresence: (matchId, presence) =>
      set((state) => ({
        presenceByMatch: { ...state.presenceByMatch, [matchId]: presence },
      })),

    getPresence: (matchId) => get().presenceByMatch[matchId],

    reset: () => set(initialState),
  }),
);
