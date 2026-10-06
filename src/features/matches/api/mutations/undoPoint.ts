import { useMutation, useQueryClient } from '@tanstack/react-query';
import { currentSetQueryKey } from '@/features/matches/api/getCurrentSet';

// MOCK: deterministic fake latency
const MOCK_LATENCY_MS = 200;

/**
 * Response shape for the undo-point operation (F1.4).
 */
export type UndoPointResponse = {
  /** Updated scores after the undo */
  scores: [number, number];
};

/**
 * Mock undoPoint implementation. Undoes the last point scored in the set.
 *
 * MOCK: this iteration ships fully mocked. The mutationFn simulates ~200ms latency
 * and resolves with mock data (no network call or backend path).
 *
 * TODO(real-api): replace the mock body below with the real F1.4 undo-point call
 * behind this unchanged hook signature, once the backend match module lands.
 * Endpoint: POST /api/v1/matches/{matchId}/sets/{setNumber}/undo
 * Body: (empty)
 * Response: UndoPointResponse
 */
async function undoPoint(
  matchId: string,
  setNumber: number,
  currentScores: [number, number],
  latencyMs: number,
): Promise<UndoPointResponse> {
  // MOCK: fixed-latency resolve
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  // MOCK: simple undo — decrement the team that has more points
  const newScores: [number, number] = [...currentScores] as [number, number];
  if (newScores[0] > newScores[1]) {
    newScores[0]--;
  } else if (newScores[1] > newScores[0]) {
    newScores[1]--;
  }
  // If equal, no-op (shouldn't happen in practice, but safe)

  return { scores: newScores };
}

export type UseUndoPointMutationOptions = {
  /** Override the mock latency (tests pass 0 to remove the fake delay). */
  latencyMs?: number;
};

/**
 * Mutation hook to undo the last point scored in the current set.
 *
 * Called by S14 when the organizer taps "Desfazer". On success:
 * - Syncs the display score with the backend state
 * - Fails if no points have been scored yet (button is disabled)
 *
 * Usage:
 * ```tsx
 * const mutation = useUndoPointMutation(matchId, setNumber);
 * mutation.mutate({ currentScores: [5, 3] });
 * ```
 */
export function useUndoPointMutation(
  matchId: string,
  setNumber: number,
  options: UseUndoPointMutationOptions = {},
) {
  const queryClient = useQueryClient();
  const latencyMs = options.latencyMs ?? MOCK_LATENCY_MS;

  return useMutation({
    mutationFn: (payload: { currentScores: [number, number] }) =>
      undoPoint(matchId, setNumber, payload.currentScores, latencyMs),
    onSuccess: () => {
      // Invalidate the current set query so it re-fetches with updated scores
      void queryClient.invalidateQueries({
        queryKey: currentSetQueryKey(matchId, setNumber),
      });
    },
  });
}
