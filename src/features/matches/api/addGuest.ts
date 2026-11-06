import { useMutation, useQueryClient } from '@tanstack/react-query';

import { matchDetailQueryKey } from '@/features/matches/api/getMatchDetail';
import { MATCHES_PATH, postGuest, toMatchError } from '@/features/matches/api/matchesApi';
import { ApiError } from '@/lib/api/client';
import { authorizedApiClient } from '@/lib/api/authorizedClient';
import type { AddGuestInput } from '@/features/matches/schema/addGuest';
import type { PresencePlayer } from '@/features/matches/types/matchDetail';

export type AddGuestResult = {
  match: { id: string };
  guest: PresencePlayer;
};

/**
 * Adds an organizer-created guest (a player with no account) to an open slot
 * (`POST /api/v1/matches/{id}/guests`). The guest shows up in the match detail,
 * which is refreshed on success.
 */
export function useAddGuest(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation<AddGuestResult, Error, AddGuestInput>({
    mutationFn: async (input) => {
      try {
        const created = await postGuest(matchId, input);
        return {
          match: { id: matchId },
          guest: {
            id: created.id,
            name: created.name,
            status: 'CONFIRMADO',
            position: input.position,
            isGuest: true,
          },
        };
      } catch (error) {
        throw toMatchError(error, {
          403: 'Só quem organiza pode adicionar convidados.',
          409: 'A partida já está cheia.',
        });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: matchDetailQueryKey(matchId),
      });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

/**
 * The organizer takes someone off the match before the game starts: a player
 * (`DELETE /matches/{id}/presences/{playerId}`, the first one waiting takes the
 * slot) or a guest (`DELETE /matches/{id}/guests/{guestId}`). A player in a
 * drawn team goes to the bench first, so the teams never keep someone who left.
 */
export function useRemoveFromMatch(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, PresencePlayer>({
    mutationFn: async (player) => {
      try {
        await authorizedApiClient<unknown>(`${MATCHES_PATH}/${matchId}/teams/members/${player.id}`, {
          method: 'DELETE',
        }).catch((error: unknown) => {
          // No teams (yet, or not editable now) or not in one: nothing to take out.
          if (!(error instanceof ApiError && (error.status === 404 || error.status === 409))) throw error;
        });
        const kind = player.isGuest ? 'guests' : 'presences';
        await authorizedApiClient<void>(`${MATCHES_PATH}/${matchId}/${kind}/${player.id}`, { method: 'DELETE' });
      } catch (error) {
        throw toMatchError(error, {
          403: 'Só quem organiza pode tirar alguém da partida.',
          409: 'Depois que o jogo começa ninguém sai da lista.',
        });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchDetailQueryKey(matchId) });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
