import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  AssignTeamRequest,
  AssignTeamResponse,
  Team,
} from '@/features/matches/types/team';

// MOCK: deterministic fake latency for mutation simulation. No randomness, no
// network, no EXPO_PUBLIC_API_URL.
const MOCK_LATENCY_MS = 500;

/**
 * Mock assign-team implementation. Takes the current teams and applies the
 * requested player-to-team reassignments.
 *
 * MOCK: this iteration ships fully mocked. The mutationFn simulates ~500ms
 * latency and resolves a modified teams array with no network call or backend
 * path. The payload shape (AssignTeamResponse) is final.
 *
 * TODO(real-api): replace the mock body below with the real F1.3 assign-team
 * call behind this unchanged mutation signature, once the backend match module
 * lands and drag-based swaps are implemented.
 */
async function assignTeams(
  teams: Team[],
  request: AssignTeamRequest,
  latencyMs: number,
): Promise<AssignTeamResponse> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  // MOCK: rebuild teams with the new assignments
  const updatedTeams = teams.map((team) => ({
    ...team,
    players: team.players.filter(
      (p) => !request.assignments.some((a) => a.playerId === p.id),
    ),
  }));

  for (const assignment of request.assignments) {
    const targetTeam = updatedTeams.find((t) => t.id === assignment.teamId);
    const sourceTeam = teams.find((t) =>
      t.players.some((p) => p.id === assignment.playerId),
    );

    if (targetTeam && sourceTeam) {
      const player = sourceTeam.players.find((p) => p.id === assignment.playerId);
      if (player) {
        targetTeam.players.push(player);
      }
    }
  }

  return { teams: updatedTeams };
}

export type UseAssignTeamOptions = {
  /** Override the mock latency (tests pass 0 to remove the fake delay). */
  latencyMs?: number;
};

/**
 * Reassigns one or more players to new teams (F1.3, drag-based or manual swaps).
 *
 * Used by S13 when a player is dragged from one team column to another (if drag
 * is implemented). For now (MVP), this hook exists as a placeholder and the
 * screen does not call it.
 *
 * Future iteration: connect this to react-native-gesture-handler long-press and
 * pan gestures on player avatars in team rosters.
 */
export function useAssignTeam(
  teams: Team[],
  options: UseAssignTeamOptions = {},
) {
  const queryClient = useQueryClient();
  const latencyMs = options.latencyMs ?? MOCK_LATENCY_MS;

  return useMutation<AssignTeamResponse, Error, AssignTeamRequest>({
    mutationFn: (request) => assignTeams(teams, request, latencyMs),
    // Note: no onSuccess invalidation here; the screen manually updates local
    // state with the mutation result.
  });
}
