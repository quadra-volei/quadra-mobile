import { useMutation, useQueryClient } from '@tanstack/react-query';

import { matchDetailQueryKey } from '@/features/matches/api/getMatchDetail';
import { postGuest, toMatchError } from '@/features/matches/api/matchesApi';
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
