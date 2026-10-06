import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchTeams,
  type GamePlayer,
  gamePlayersById,
  postFinishMatch,
  postMvpVote,
} from '@/features/matches/api/gameApi';
import { matchDetailQueryKey } from '@/features/matches/api/getMatchDetail';
import { matchSummaryQueryKey } from '@/features/matches/api/getMatchSummary';
import { fetchMatchDetail, toMatchError } from '@/features/matches/api/matchesApi';
import { useAuthStore } from '@/stores/auth';

/** A player that can be voted MVP (someone with an account who was on a team). */
export type MatchPlayer = GamePlayer;

export type VoteMVPPayload = {
  votedForPlayerId: string;
};

export type VoteMVPResponse = {
  success: true;
  votedForPlayerId: string;
  votedForName: string;
};

/** What the MVP screen needs: who can be voted, and whether the viewer runs the match. */
export type MatchPlayersData = MatchPlayer[] & { isOrganizer?: boolean };

/** Query key for the MVP candidates of a match. */
export const matchPlayersQueryKey = (id: string) => ['matches', id, 'players'] as const;

/**
 * The players that took part in the game (`GET /teams` crossed with the match
 * roster for names). Guests are left out: they have no account to vote or to
 * be voted for.
 */
async function getMatchPlayers(matchId: string): Promise<MatchPlayer[]> {
  const [detail, teams] = await Promise.all([fetchMatchDetail(matchId), fetchTeams(matchId)]);
  const byId = gamePlayersById(detail);
  return teams
    .flatMap((team) => team.members)
    .filter((member) => !member.isGuest)
    .map((member) => byId.get(member.playerId))
    .filter((player): player is MatchPlayer => player !== undefined);
}

export function useMatchPlayers(matchId: string) {
  return useQuery({
    queryKey: matchPlayersQueryKey(matchId),
    queryFn: () => getMatchPlayers(matchId),
    enabled: matchId.length > 0,
    staleTime: 60_000,
  });
}

/**
 * Votes for the MVP (`POST /matches/{id}/mvp-voting/votes`). Voting again
 * replaces the previous vote while the voting is open.
 */
export function useVoteMVPMutation(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation<VoteMVPResponse, Error, string>({
    mutationFn: async (votedForPlayerId) => {
      try {
        await postMvpVote(matchId, votedForPlayerId);
      } catch (error) {
        throw toMatchError(error, {
          403: 'Só quem jogou a partida pode votar.',
          404: 'A votação ainda não está disponível para esse voto.',
          409: 'A votação já foi encerrada.',
          422: 'Esse voto não é válido.',
        });
      }
      const voted = queryClient
        .getQueryData<MatchPlayer[]>(matchPlayersQueryKey(matchId))
        ?.find((player) => player.id === votedForPlayerId);
      return {
        success: true,
        votedForPlayerId,
        votedForName: voted?.name ?? 'Jogador',
      };
    },
  });
}

/** Whether the signed-in user organizes the match (they close the voting). */
export function useIsOrganizer(matchId: string): boolean {
  const userId = useAuthStore((state) => state.userId);
  const { data } = useQuery({
    queryKey: ['matches', matchId, 'organizer'] as const,
    queryFn: async () => (await fetchMatchDetail(matchId)).match.organizerId,
    enabled: matchId.length > 0,
    staleTime: 5 * 60_000,
  });
  return data != null && data === userId;
}

/**
 * Organizer only: closes the MVP voting and generates the match summary, which
 * is what records the result in everyone's stats and in the ranking.
 */
export function useFinishMatch(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      try {
        await postFinishMatch(matchId);
      } catch (error) {
        throw toMatchError(error, {
          403: 'Só quem organiza a partida pode encerrar a votação.',
          409: 'A partida ainda não terminou.',
        });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchSummaryQueryKey(matchId) });
      void queryClient.invalidateQueries({ queryKey: matchDetailQueryKey(matchId) });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
