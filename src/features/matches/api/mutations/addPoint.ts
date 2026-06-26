import { useMutation, useQueryClient } from '@tanstack/react-query';
import { currentSetQueryKey } from '@/features/matches/api/getCurrentSet';

// MOCK: deterministic fake latency
const MOCK_LATENCY_MS = 200;

/**
 * Response shape for the add-point operation (F1.4).
 */
export type AddPointResponse = {
  /** Updated scores after the point */
  scores: [number, number];
  /** Whether the set has ended (a team won) */
  setEnded: boolean;
  /** ID of the winning team if setEnded is true */
  setWinnerId?: string;
  /** Whether the match is completely over (all best-of sets done) */
  matchOver?: boolean;
};

/**
 * Mock addPoint implementation. Increments the score for the specified team
 * and checks if the set has ended.
 *
 * MOCK: this iteration ships fully mocked. The mutationFn simulates ~200ms latency
 * and resolves with mock data (no network call or backend path).
 *
 * TODO(real-api): replace the mock body below with the real F1.4 add-point call
 * behind this unchanged hook signature, once the backend match module lands.
 * Endpoint: POST /api/v1/matches/{matchId}/sets/{setNumber}/score
 * Body: { teamId: string }
 * Response: AddPointResponse
 */
async function addPoint(
  matchId: string,
  setNumber: number,
  teamId: string,
  currentScores: [number, number],
  latencyMs: number,
): Promise<AddPointResponse> {
  // MOCK: fixed-latency resolve
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  // MOCK: determine which team (0 or 1) and increment
  const teamIndex = teamId.includes('2') ? 1 : 0;
  const newScores: [number, number] = [...currentScores] as [number, number];
  newScores[teamIndex]++;

  // MOCK: check for set-end condition (simplified: 3+ points ahead, or 25/15 points with 2pt margin)
  // In real implementation, backend enforces volleyball rules (25 pts or 15 pts, 2pt margin minimum)
  const score1 = newScores[0];
  const score2 = newScores[1];
  const minPoints = 15; // Simplified for MVP
  const setEnded =
    (score1 >= minPoints || score2 >= minPoints) && Math.abs(score1 - score2) >= 2;

  return {
    scores: newScores,
    setEnded,
    setWinnerId: setEnded ? (score1 > score2 ? teamId : undefined) : undefined,
    matchOver: false, // MOCK: always false for now
  };
}

export type UseAddPointMutationOptions = {
  /** Override the mock latency (tests pass 0 to remove the fake delay). */
  latencyMs?: number;
};

/**
 * Mutation hook to add a point to a team's score during the live scoreboard.
 *
 * Called by S14 when the organizer taps "+ ponto" for a team. On success:
 * - Updates the local display score optimistically
 * - On error, rolls back the optimistic update and shows a toast
 *
 * Usage:
 * ```tsx
 * const mutation = useAddPointMutation(matchId, setNumber);
 * mutation.mutate(teamId);
 * ```
 */
export function useAddPointMutation(
  matchId: string,
  setNumber: number,
  options: UseAddPointMutationOptions = {},
) {
  const queryClient = useQueryClient();
  const latencyMs = options.latencyMs ?? MOCK_LATENCY_MS;

  return useMutation({
    mutationFn: (payload: { teamId: string; currentScores: [number, number] }) =>
      addPoint(matchId, setNumber, payload.teamId, payload.currentScores, latencyMs),
    onSuccess: () => {
      // Invalidate the current set query so it re-fetches with updated scores
      void queryClient.invalidateQueries({
        queryKey: currentSetQueryKey(matchId, setNumber),
      });
    },
  });
}
