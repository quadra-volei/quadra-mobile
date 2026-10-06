import { useMutation } from '@tanstack/react-query';

import { postDraft, toTeams } from '@/features/matches/api/gameApi';
import { toMatchError } from '@/features/matches/api/matchesApi';
import type { PresencePlayer } from '@/features/matches/types/matchDetail';
import type {
  DrawTeamsRequest,
  DrawTeamsResponse,
} from '@/features/matches/types/team';

export type UseDrawTeamsOptions = {
  /** @deprecated No effect — kept so existing callers compile. The draw is real now. */
  latencyMs?: number;
};

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
export function useDrawTeams(id: string, _options: UseDrawTeamsOptions = {}) {
  return useMutation<DrawTeamsResponse, Error, DrawTeamsVariables>({
    mutationFn: async ({ players, request }) => {
      try {
        const teams = await postDraft(id, {
          teamCount: request.teamCount,
          perTeam: request.perTeam,
          mode: request.drawMode === 'AUTO' ? 'Balanced' : 'Random',
        });
        return { teams: toTeams(teams, players) };
      } catch (error) {
        throw toMatchError(error, {
          403: 'Só quem organiza a partida pode sortear os times.',
          409: 'Ainda não dá para sortear: confirme os jogadores e aguarde as confirmações abrirem.',
        });
      }
    },
  });
}
