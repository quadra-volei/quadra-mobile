import { useQuery } from '@tanstack/react-query';
import type { Team } from '@/features/matches/types/team';
import type { PresencePlayer } from '@/features/matches/types/matchDetail';

// MOCK: deterministic fake latency so tests can assert loading states without flakiness.
const MOCK_LATENCY_MS = 400;

/**
 * Current set state for the in-game scoreboard (F1.4 read).
 */
export type CurrentSetState = {
  /** ISO timestamp when the set started */
  startedAt: string;
  /** The two playing teams */
  teams: Team[];
  /** Current scores for each team (index 0 = team 0, index 1 = team 1) */
  scores: [number, number];
  /** Whether the current user is the organizer */
  isOrganizer: boolean;
  /** Number of points scored so far (for undo eligibility) */
  pointsScoredCount: number;
};

/**
 * Query key (ARCHITECTURE convention): ['matches', id, 'set', setNumber].
 */
export const currentSetQueryKey = (matchId: string, setNumber: number) =>
  ['matches', matchId, 'set', setNumber] as const;

/**
 * Mock getCurrentSet implementation. Returns a fixture representing the current
 * set state with two playing teams, current scores, and organizer status.
 *
 * MOCK: this iteration ships fully mocked. The queryFn simulates ~400ms latency
 * and resolves a generated fixture with no network call or backend path.
 *
 * TODO(real-api): replace the mock body below with the real F1.4 read-set-state call
 * behind this unchanged hook signature, once the backend match module lands.
 * Endpoint: GET /api/v1/matches/{matchId}/sets/{setNumber}
 * Response: CurrentSetState
 */
async function getCurrentSet(
  matchId: string,
  setNumber: number,
  selectedTeamIds: [string, string],
  latencyMs: number,
): Promise<CurrentSetState> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  // MOCK: construct two playing teams from the selection
  const team1: Team = {
    id: selectedTeamIds[0],
    name: selectedTeamIds[0].includes('1') ? 'Time Azul' : 'Time ' + selectedTeamIds[0],
    number: 1,
    players: [],
  };

  const team2: Team = {
    id: selectedTeamIds[1],
    name: selectedTeamIds[1].includes('2') ? 'Time Lima' : 'Time ' + selectedTeamIds[1],
    number: 2,
    players: [],
  };

  // MOCK: return fixture with zero scores and timestamp ~now
  return {
    startedAt: new Date().toISOString(),
    teams: [team1, team2],
    scores: [0, 0],
    isOrganizer: true, // MOCK: assume current user is organizer for MVP
    pointsScoredCount: 0,
  };
}

export type UseCurrentSetOptions = {
  /** Override the mock latency (tests pass 0 to remove the fake delay). */
  latencyMs?: number;
  /** Whether to immediately fetch on mount */
  enabled?: boolean;
};

/**
 * Query hook to fetch the current set state (teams, scores, elapsed time, organizer status).
 *
 * Called by S14 on mount to bootstrap the scoreboard display. Updates via mutations
 * (addPoint, undoPoint) invalidate this query, triggering a refetch.
 *
 * Usage:
 * ```tsx
 * const query = useCurrentSet(matchId, setNumber, selectedTeamIds);
 * ```
 */
export function useCurrentSet(
  matchId: string,
  setNumber: number,
  selectedTeamIds: [string, string],
  options: UseCurrentSetOptions = {},
) {
  const latencyMs = options.latencyMs ?? MOCK_LATENCY_MS;
  const enabled = options.enabled ?? true;

  return useQuery({
    queryKey: currentSetQueryKey(matchId, setNumber),
    queryFn: () => getCurrentSet(matchId, setNumber, selectedTeamIds, latencyMs),
    staleTime: 10_000, // 10s before re-fetch
    enabled,
  });
}
