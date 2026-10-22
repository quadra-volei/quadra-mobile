import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { MATCHES_PATH, toMatchError } from '@/features/matches/api/matchesApi';
import type { PlayerActions } from '@/features/matches/lib/playerActions';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

/** `GET/PUT /matches/{id}/player-stats` (API DECISIONS #84). */
type ApiPlayerStats = {
  matchId: string;
  /** The organizer can still change it: the game started and the summary is not out. */
  editable: boolean;
  players: ({ playerId: string } & PlayerActions)[];
};

/** The match's sheet: who has a row (a player without one had nothing recorded). */
export type MatchStatsSheet = {
  editable: boolean;
  byPlayer: Record<string, PlayerActions>;
};

export const playerStatsQueryKey = (matchId: string) => ['matches', matchId, 'player-stats'] as const;

function toSheet(api: ApiPlayerStats): MatchStatsSheet {
  return {
    editable: api.editable,
    byPlayer: Object.fromEntries(
      api.players.map(({ playerId, kills, blocks, aces, digs, assists }) => [
        playerId,
        { kills, blocks, aces, digs, assists },
      ]),
    ),
  };
}

const path = (matchId: string) => `${MATCHES_PATH}/${matchId}/player-stats`;

export function usePlayerStats(matchId: string, enabled = true) {
  return useQuery({
    queryKey: playerStatsQueryKey(matchId),
    queryFn: async () => toSheet(await authorizedApiClient<ApiPlayerStats>(path(matchId))),
    enabled: enabled && matchId.length > 0,
  });
}

/** Saves the whole sheet (organizer); a player left out has nothing recorded. */
export function useSavePlayerStats(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation<MatchStatsSheet, Error, Record<string, PlayerActions>>({
    mutationFn: async (byPlayer) => {
      try {
        const saved = await authorizedApiClient<ApiPlayerStats>(path(matchId), {
          method: 'PUT',
          body: JSON.stringify({
            players: Object.entries(byPlayer).map(([playerId, actions]) => ({ playerId, ...actions })),
          }),
        });
        return toSheet(saved);
      } catch (error) {
        throw toMatchError(error, {
          403: 'Só quem organiza a partida registra as estatísticas.',
          409: 'As estatísticas fecham quando o resumo da partida sai.',
          422: 'Só quem jogou a partida pode ter estatísticas.',
        });
      }
    },
    onSuccess: (sheet) => {
      queryClient.setQueryData(playerStatsQueryKey(matchId), sheet);
    },
  });
}
