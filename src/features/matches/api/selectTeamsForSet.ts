import { useMutation } from '@tanstack/react-query';

// MOCK: deterministic fake latency so RNTL can assert loading states without
// flakiness. Tests may zero this via the options param. No randomness, no
// network, no EXPO_PUBLIC_API_URL.
const MOCK_LATENCY_MS = 400;

/**
 * Response shape for the select-teams-for-set operation (F1.4).
 */
export type SelectTeamsForSetResponse = {
  success: true;
  setNumber: number;
};

/**
 * Mock select-teams-for-set implementation. Called when the organizer selects
 * 2 of 3+ teams and taps "Começar partida" on S13.5.
 *
 * MOCK: this iteration ships fully mocked. The mutationFn simulates ~400ms latency
 * and resolves a success response with no network call or backend path. The
 * payload shape (SelectTeamsForSetResponse) is final.
 *
 * TODO(real-api): replace the mock body below with the real F1.4 select-teams-for-set
 * call behind this unchanged hook signature, once the backend match module lands.
 * Endpoint: POST /api/v1/matches/{matchId}/sets/{setNumber}/select-teams
 * Body: { teamIds: [string, string] }
 */
async function selectTeamsForSet(
  matchId: string,
  setNumber: number,
  teamIds: [string, string],
  latencyMs: number,
): Promise<SelectTeamsForSetResponse> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  // MOCK: echo back the setNumber as confirmation.
  return { success: true, setNumber };
}

export type UseSelectTeamsForSetOptions = {
  /** Override the mock latency (tests pass 0 to remove the fake delay). */
  latencyMs?: number;
};

/**
 * Mutation hook to select 2 of 3+ teams for the current set before starting live scoring.
 *
 * Called by S13.5 when the organizer taps "Começar partida" after selecting exactly 2 teams.
 * On success, the same route re-renders to S14 scoreboard (conditional logic in the screen).
 *
 * Usage:
 * ```tsx
 * const mutation = useSelectTeamsForSet(matchId, setNumber);
 * mutation.mutate([team1.id, team2.id]);
 * ```
 */
export function useSelectTeamsForSet(
  matchId: string,
  setNumber: number,
  options: UseSelectTeamsForSetOptions = {},
) {
  const latencyMs = options.latencyMs ?? MOCK_LATENCY_MS;

  return useMutation({
    mutationFn: (teamIds: [string, string]) =>
      selectTeamsForSet(matchId, setNumber, teamIds, latencyMs),
  });
}
