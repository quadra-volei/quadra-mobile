import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/** Player data for MVP voting (subset of PresencePlayer, with handle added). */
export type MatchPlayer = {
  id: string;
  name: string;
  handle: string;
  position: 'LEV' | 'PON' | 'OPO' | 'CEN' | 'LIB' | 'COR';
  avatarUrl?: string;
};

/** MVP vote submission payload. */
export type VoteMVPPayload = {
  votedForPlayerId: string;
};

/** MVP vote submission response. */
export type VoteMVPResponse = {
  success: true;
  votedForPlayerId: string;
  votedForName: string;
};

// MOCK: deterministic fake latency so tests can assert the loading state, populated state,
// and submission without flakiness. Tests may zero this via the options param.
const MOCK_LATENCY_MS = 300;

/** Query key (ARCHITECTURE convention): ['matches', id, 'players']. */
export const matchPlayersQueryKey = (id: string) => ['matches', id, 'players'] as const;

// MOCK: fixed players from the match detail fixture. In a real backend, these would be
// fetched from the match's roster, possibly filtered to exclude the current user (though
// that filtering happens client-side in the screen for flexibility).
const MOCK_PLAYERS: Record<string, MatchPlayer[]> = {
  'near-1': [
    { id: 'p1', name: 'Renan Dias', handle: 'renan_dias', position: 'LEV', avatarUrl: undefined },
    { id: 'p2', name: 'Bia Fontes', handle: 'biaf', position: 'PON', avatarUrl: undefined },
    { id: 'p3', name: 'Caio Drumond', handle: 'caio_op', position: 'OPO', avatarUrl: undefined },
    { id: 'p4', name: 'Duda Reis', handle: 'dudareís', position: 'LIB', avatarUrl: undefined },
  ],
  'mine-1': [
    { id: 'o1', name: 'Renan', handle: 'renan_dias', position: 'LEV', avatarUrl: undefined },
    { id: 'o2', name: 'Érica', handle: 'erica_cen', position: 'CEN', avatarUrl: undefined },
    { id: 'o3', name: 'Caio', handle: 'caio_op', position: 'OPO', avatarUrl: undefined },
    { id: 'o4', name: 'Duda', handle: 'duda_lib', position: 'LIB', avatarUrl: undefined },
    { id: 'o5', name: 'Manu', handle: 'manu_pon', position: 'PON', avatarUrl: undefined },
    { id: 'o6', name: 'Theo', handle: 'theo_op', position: 'OPO', avatarUrl: undefined },
    { id: 'o7', name: 'Bia', handle: 'bia_pon', position: 'PON', avatarUrl: undefined },
    { id: 'o8', name: 'Vini', handle: 'vini_cor', position: 'COR', avatarUrl: undefined },
  ],
};

/**
 * Fetches the eligible voters (all confirmed players) for the match MVP voting.
 * F1.5 (read eligible voters).
 *
 * MOCK: this iteration ships fully mocked. The queryFn simulates ~300ms latency
 * and resolves a fixed fixture chosen by `id` with no network call. In the real
 * backend, these will be the confirmed/participating players from the match.
 *
 * TODO(real-api): F1.5 path TBD. Replace the mock body below with the real
 * call once the backend voting module lands.
 */
async function getMatchPlayers(
  matchId: string,
  latencyMs: number,
): Promise<MatchPlayer[]> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  // MOCK: pick a fixture by matchId, or return empty array if not found.
  return MOCK_PLAYERS[matchId] ?? [];
}

export type UseMatchPlayersOptions = {
  /** Override the mock latency (tests pass 0 to remove the fake delay). */
  latencyMs?: number;
};

/**
 * Query hook to fetch match players for MVP voting.
 * Enables single-select radio behavior and vote submission.
 */
export function useMatchPlayers(
  matchId: string,
  options: UseMatchPlayersOptions = {},
) {
  const latencyMs = options.latencyMs ?? MOCK_LATENCY_MS;
  return useQuery({
    queryKey: matchPlayersQueryKey(matchId),
    queryFn: () => getMatchPlayers(matchId, latencyMs),
    staleTime: 60_000,
  });
}

/**
 * Submits an MVP vote for a player.
 * F1.5 (write vote).
 *
 * MOCK: this iteration ships fully mocked. The mutationFn simulates ~300ms latency
 * and resolves a success response with no network call. In the real backend, this
 * will POST to the match's voting endpoint and return the confirmed vote.
 *
 * TODO(real-api): F1.5 path TBD. Replace the mock body below with the real
 * call once the backend voting module lands.
 */
async function submitMVPVote(
  matchId: string,
  votedForPlayerId: string,
  latencyMs: number,
): Promise<VoteMVPResponse> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  // MOCK: find the player's name in the fixture to echo back in the response.
  const allPlayers = Object.values(MOCK_PLAYERS).flat();
  const votedPlayer = allPlayers.find((p) => p.id === votedForPlayerId);
  const votedForName = votedPlayer?.name ?? 'Jogador desconhecido';
  return {
    success: true,
    votedForPlayerId,
    votedForName,
  };
}

export type UseMVPVoteMutationOptions = {
  /** Override the mock latency (tests pass 0 to remove the fake delay). */
  latencyMs?: number;
};

/**
 * Mutation hook to submit an MVP vote.
 * On success, resets the query cache to trigger a refetch (or updates the match
 * state to reflect the vote, depending on backend flow).
 */
export function useVoteMVPMutation(
  matchId: string,
  options: UseMVPVoteMutationOptions = {},
) {
  const latencyMs = options.latencyMs ?? MOCK_LATENCY_MS;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (votedForPlayerId: string) =>
      submitMVPVote(matchId, votedForPlayerId, latencyMs),
    onSuccess: () => {
      // MOCK: invalidate the players list to reflect potential changes.
      // In the real backend, the response may indicate the vote was counted,
      // or the screen may poll for results.
      queryClient.invalidateQueries({
        queryKey: matchPlayersQueryKey(matchId),
      });
    },
  });
}
