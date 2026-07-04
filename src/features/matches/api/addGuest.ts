import { useMutation, useQueryClient } from '@tanstack/react-query';

import { matchDetailQueryKey } from '@/features/matches/api/getMatchDetail';
import type { AddGuestInput } from '@/features/matches/schema/addGuest';
import type { PresencePlayer } from '@/features/matches/types/matchDetail';
import { useGuestsStore } from '@/stores/guestsStore';

// MOCK: deterministic fake latency so RNTL can assert the sheet's submit loading
// state and the post-mutation grid refresh without flakiness. No network, no
// backend path. Mirrors presence.ts / createMatch.ts.
const MOCK_LATENCY_MS = 500;

export type AddGuestResult = {
  match: { id: string };
  guest: PresencePlayer;
};

/** Session-unique guest id (no backend id source yet). */
function makeGuestId(): string {
  return `guest-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

/**
 * Adds an organizer-created guest player to an open slot on a match.
 *
 * MOCK: simulates latency, appends the guest to the session `guestsStore`, and
 * resolves a stub. `getMatchDetail` merges the store's guests into the match's
 * `players` at fetch time, so invalidating the detail query refreshes the grid.
 *
 * TODO(real-api): replace the mock body with the real F1.4 add-guest call behind
 * this unchanged hook signature, once the backend match module lands.
 */
export function useAddGuest(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation<AddGuestResult, Error, AddGuestInput>({
    mutationFn: async (input) => {
      // MOCK: fixed-latency resolve, no network.
      await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
      const guest: PresencePlayer = {
        id: makeGuestId(),
        name: input.name,
        status: 'CONFIRMADO',
        position: input.position,
        isGuest: true,
      };
      useGuestsStore.getState().addGuest(matchId, guest);
      return { match: { id: matchId }, guest };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: matchDetailQueryKey(matchId),
      });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
