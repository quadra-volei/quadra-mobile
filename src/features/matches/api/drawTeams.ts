import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type ApiTeam,
  fetchTeams,
  postDraft,
  putTeamMember,
  toTeams,
} from '@/features/matches/api/gameApi';
import { liveGameQueryKey } from '@/features/matches/api/liveGame';
import { toMatchError } from '@/features/matches/api/matchesApi';
import { ApiError } from '@/lib/api/client';
import type { PresencePlayer } from '@/features/matches/types/matchDetail';
import type {
  DrawTeamsRequest,
  DrawTeamsResponse,
} from '@/features/matches/types/team';

/** Why the backend refused to draw or change the teams (the problem title), in pt-BR. */
const TEAMS_REFUSAL: Record<string, string> = {
  ConfirmationsNotOpen:
    'As confirmações ainda não abriram. Os times só podem ser montados depois que elas abrirem.',
  GameStarted: 'A partida já começou. Os times não podem mais mudar.',
  MatchOver: 'Esta partida já terminou ou foi cancelada.',
  NoConfirmedPlayers: 'Ninguém confirmou presença ainda. Sem confirmados não há times.',
  NotEnoughPlayers: 'Faltam jogadores: cada time precisa de pelo menos 1 confirmado.',
  InvalidOptions: 'Escolha de 2 a 4 times, com pelo menos 1 jogador por time.',
};

function toTeamsError(error: unknown, byStatus: Partial<Record<number, string>>): Error {
  if (error instanceof ApiError && error.detail && TEAMS_REFUSAL[error.detail]) {
    return new Error(TEAMS_REFUSAL[error.detail]);
  }
  return toMatchError(error, byStatus);
}

/** Query key of the drawn teams of a match (the backend keeps them until the game). */
export const matchTeamsQueryKey = (id: string) => ['matches', id, 'teams'] as const;

/**
 * The teams drawn for a match (`GET /matches/{id}/teams`), named from the match
 * roster. Empty until the organizer draws them; the draw and the moves below
 * write the backend's answer here, so the teams survive leaving the screen.
 */
export function useMatchTeams(
  id: string,
  players: PresencePlayer[],
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: matchTeamsQueryKey(id),
    queryFn: () => fetchTeams(id),
    select: (teams: ApiTeam[]) => toTeams(teams, players),
    enabled: id.length > 0 && (options.enabled ?? true),
  });
}

/** Keeps what the backend answered as the match's teams (and the game's, which shows them). */
function useStoreTeams(id: string) {
  const queryClient = useQueryClient();
  return (teams: ApiTeam[]) => {
    queryClient.setQueryData(matchTeamsQueryKey(id), teams);
    void queryClient.invalidateQueries({ queryKey: liveGameQueryKey(id) });
  };
}

export type DrawTeamsVariables = {
  /** The match roster (guests included), used to name the drawn players. */
  players: PresencePlayer[];
  request: DrawTeamsRequest;
};

/**
 * Draws the teams of a match on the backend (`POST /matches/{id}/teams/draft`)
 * and replaces any previous draw. "Automático" asks for teams balanced by
 * level; "Manual" (the organizer taps Sortear) asks for a random draw. Players
 * beyond `teamCount × perTeam` sit out.
 */
export function useDrawTeams(id: string) {
  const storeTeams = useStoreTeams(id);
  return useMutation<DrawTeamsResponse, Error, DrawTeamsVariables>({
    mutationFn: async ({ players, request }) => {
      try {
        const teams = await postDraft(id, {
          teamCount: request.teamCount,
          perTeam: request.perTeam,
          mode: request.drawMode === 'AUTO' ? 'Balanced' : 'Random',
        });
        storeTeams(teams);
        return { teams: toTeams(teams, players) };
      } catch (error) {
        throw toTeamsError(error, { 403: 'Só quem organiza a partida pode sortear os times.' });
      }
    },
  });
}

export type MovePlayerVariables = {
  players: PresencePlayer[];
  playerId: string;
  teamId: string;
};

/**
 * Moves one drawn player to another team after the draw
 * (`PUT /matches/{id}/teams/{teamId}/members/{playerId}`) and answers with
 * every team as it is now.
 */
export function useMovePlayer(id: string) {
  const storeTeams = useStoreTeams(id);
  return useMutation<DrawTeamsResponse, Error, MovePlayerVariables>({
    mutationFn: async ({ players, playerId, teamId }) => {
      try {
        const teams = await putTeamMember(id, teamId, playerId);
        storeTeams(teams);
        return { teams: toTeams(teams, players) };
      } catch (error) {
        throw toTeamsError(error, {
          403: 'Só quem organiza a partida pode mexer nos times.',
          404: 'Os times mudaram. Refaça o sorteio.',
        });
      }
    },
  });
}
