import { useMutation, useQueryClient } from '@tanstack/react-query';

import { matchDetailQueryKey } from '@/features/matches/api/getMatchDetail';
import type { MyPresence } from '@/stores/presenceStore';
import { usePresenceStore } from '@/stores/presenceStore';

// MOCK: deterministic fake latency so RNTL can assert the footer CTA loading
// state and the post-mutation invalidation without flakiness. No randomness, no
// network, no EXPO_PUBLIC_API_URL. Mirrors createMatch.ts / getMatchDetail.ts.
const MOCK_LATENCY_MS = 500;

export type PresenceMutationResult = {
  match: { id: string };
};

/**
 * Confirms / declines / joins share one MOCK shape: simulate latency, record the
 * new presence in the session `presenceStore`, then resolve a stub echoing the
 * match id. No network, no backend path.
 *
 * The store write is what makes the mutation *mean* something: `getMatchDetail`
 * merges that store at fetch time, so confirming adds the user to the confirmed
 * grid and declining removes them. Without it the invalidation below would just
 * refetch the same fixed fixture and nothing would change on screen.
 *
 * TODO(real-api): replace each mock body below with the real F1.4 presence calls
 * behind these unchanged hook signatures, once the backend match module lands.
 * The store write goes away with the mock — the server becomes the truth.
 */
async function mockPresenceWrite(
  id: string,
  presence: MyPresence,
): Promise<PresenceMutationResult> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  // MOCK: the session store stands in for the backend's presence record.
  usePresenceStore.getState().setPresence(id, presence);
  // MOCK: stub echoing the match id.
  return { match: { id } };
}

/**
 * Builds a presence mutation bound to a match id. On success it invalidates the
 * match detail query (so the grid/footer refresh) and the broader `['matches']`
 * key (so S5 Home lists refresh too).
 */
function usePresenceMutation(id: string, presence: MyPresence) {
  const queryClient = useQueryClient();
  return useMutation<PresenceMutationResult, Error, void>({
    // MOCK (F1.4): swap this mutationFn for the real presence call later.
    mutationFn: () => mockPresenceWrite(id, presence),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchDetailQueryKey(id) });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

/**
 * Confirms the current user's presence (F1.4) — this is what puts them in the
 * confirmed list. Used by invited Regulars AND by the organizer, who does not
 * play unless they say so.
 */
export function useConfirmPresence(id: string) {
  return usePresenceMutation(id, { status: 'CONFIRMADO' });
}

/**
 * Declines the current user's presence (F1.4) — removes them from the confirmed
 * list, freeing the slot. Available whether or not they had confirmed, and to
 * the organizer as well.
 */
export function useDeclinePresence(id: string) {
  return usePresenceMutation(id, { status: 'RECUSADO' });
}

/** Joins an open drop-in slot (non-Regular user, window closed) (F1.4). */
export function useJoinMatch(id: string) {
  return usePresenceMutation(id, {
    status: 'CONFIRMADO',
    participation: 'DROPIN',
  });
}
