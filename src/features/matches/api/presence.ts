import { useMutation, useQueryClient } from '@tanstack/react-query';

import { matchDetailQueryKey } from '@/features/matches/api/getMatchDetail';

// MOCK: deterministic fake latency so RNTL can assert the footer CTA loading
// state and the post-mutation invalidation without flakiness. No randomness, no
// network, no EXPO_PUBLIC_API_URL. Mirrors createMatch.ts / getMatchDetail.ts.
const MOCK_LATENCY_MS = 500;

export type PresenceMutationResult = {
  match: { id: string };
};

/**
 * Confirms / declines / joins are all the same MOCK shape: simulate latency,
 * then resolve a stub echoing the match id. No network, no backend path.
 *
 * TODO(real-api): replace each mock body below with the real F1.4 presence calls
 * behind these unchanged hook signatures, once the backend match module lands.
 */
async function mockPresenceWrite(id: string): Promise<PresenceMutationResult> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  // MOCK: stub echoing the match id.
  return { match: { id } };
}

/**
 * Builds a presence mutation bound to a match id. On success it invalidates the
 * match detail query (so the grid/footer refresh) and the broader `['matches']`
 * key (so S5 Home lists refresh too).
 */
function usePresenceMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation<PresenceMutationResult, Error, void>({
    // MOCK (F1.4): swap this mutationFn for the real presence call later.
    mutationFn: () => mockPresenceWrite(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchDetailQueryKey(id) });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

/** Confirms the current user's presence on a Regular match (F1.4). */
export function useConfirmPresence(id: string) {
  return usePresenceMutation(id);
}

/** Declines the current user's presence on a Regular match (F1.4). */
export function useDeclinePresence(id: string) {
  return usePresenceMutation(id);
}

/** Joins an open drop-in slot (non-Regular user, window closed) (F1.4). */
export function useJoinMatch(id: string) {
  return usePresenceMutation(id);
}
