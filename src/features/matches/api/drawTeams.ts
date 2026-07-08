import { useMutation } from '@tanstack/react-query';

import type {
  DrawTeamsRequest,
  DrawTeamsResponse,
  Team,
} from '@/features/matches/types/team';
import type { PresencePlayer } from '@/features/matches/types/matchDetail';

// MOCK: deterministic fake latency so RNTL can assert loading states without
// flakiness. Tests may zero this via the options param. No randomness, no
// network, no EXPO_PUBLIC_API_URL.
const MOCK_LATENCY_MS = 600;

/**
 * Mock draw-teams implementation. Seeded with confirmed players from the match,
 * randomly distributes them into N teams of perTeam size.
 *
 * MOCK: this iteration ships fully mocked. The queryFn simulates ~600ms latency
 * and resolves a generated fixture with no network call or backend path. The
 * payload shape (DrawTeamsResponse) is final.
 *
 * TODO(real-api): replace the mock body below with the real F1.3 draw-teams call
 * behind this unchanged hook signature, once the backend match module lands.
 */
async function drawTeams(
  id: string,
  players: PresencePlayer[],
  request: DrawTeamsRequest,
  latencyMs: number,
): Promise<DrawTeamsResponse> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  // MOCK: simple shuffle of players into teams
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const teams: Team[] = [];

  for (let teamIndex = 0; teamIndex < request.teamCount; teamIndex++) {
    const teamPlayers: PresencePlayer[] = [];
    for (let i = 0; i < request.perTeam; i++) {
      const playerIndex = teamIndex * request.perTeam + i;
      const player = shuffled[playerIndex];
      if (player) {
        teamPlayers.push(player);
      }
    }
    teams.push({
      id: `team-${teamIndex + 1}`,
      number: teamIndex + 1,
      name: `Time ${teamIndex + 1}`,
      players: teamPlayers,
    });
  }

  return { teams };
}

export type UseDrawTeamsOptions = {
  /** Override the mock latency (tests pass 0 to remove the fake delay). */
  latencyMs?: number;
};

/** Variables passed to `mutate` each time a draw is triggered. */
export type DrawTeamsVariables = {
  players: PresencePlayer[];
  request: DrawTeamsRequest;
};

/**
 * Draws teams from the match's confirmed players, distributing them into the
 * configured team count and per-team size.
 *
 * Modeled as a mutation (not a query) because a draw is an imperative action:
 * AUTO mode fires it once on mount, MANUAL mode fires it on each "Sortear" tap.
 * A disabled `useQuery` (the previous shape) is skipped by `refetchQueries` and
 * stays permanently `isPending`, which froze the MANUAL "Sortear" button.
 */
export function useDrawTeams(id: string, options: UseDrawTeamsOptions = {}) {
  const latencyMs = options.latencyMs ?? MOCK_LATENCY_MS;

  return useMutation<DrawTeamsResponse, Error, DrawTeamsVariables>({
    mutationFn: ({ players, request }) =>
      drawTeams(id, players, request, latencyMs),
  });
}
