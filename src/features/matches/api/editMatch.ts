import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteMatch,
  fetchMatchDetail,
  putMatch,
  toApiUpdateMatch,
  toEditMatchDefaults,
  toMatchError,
} from '@/features/matches/api/matchesApi';
import { resolveMatchStartsAt } from '@/features/matches/lib/buildMatchDetail';
import type { EditMatchInput } from '@/features/matches/schema/editMatch';
import { uploadProfilePhoto } from '@/features/profile/api/profileApi';

/**
 * The edit form's starting values, read from `GET /matches/{id}/detail`, plus the
 * players already in (the slots cannot go below them) and the current cover.
 */
export function useMatchEditDefaults(id: string) {
  return useQuery({
    queryKey: ['matches', id, 'edit'] as const,
    queryFn: async () => {
      const api = await fetchMatchDetail(id);
      return {
        values: toEditMatchDefaults(api),
        confirmedCount: api.confirmedCount,
        isRecurring: api.match.type === 'Recurring',
        coverUrl: api.coverUrl ?? undefined,
      };
    },
    enabled: id.length > 0,
    staleTime: 0,
  });
}

export type EditMatchPayload = EditMatchInput & {
  /** Local URI of a newly picked cover; without it the current cover stays. */
  coverUri?: string;
};

/** `PUT /matches/{id}`. A new cover is uploaded first, as at creation. */
export function useEditMatch(id: string) {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, EditMatchPayload>({
    mutationFn: async (payload) => {
      const startsAt = resolveMatchStartsAt({
        type: 'OneOff',
        whenType: 'date',
        customDate: payload.date,
        time: payload.time,
      });
      if (new Date(startsAt).getTime() <= Date.now()) {
        throw new Error('Esse horário já passou. Escolha um horário no futuro.');
      }
      try {
        const coverKey = payload.coverUri ? await uploadProfilePhoto(payload.coverUri) : null;
        return await putMatch(id, toApiUpdateMatch(payload, startsAt, coverKey));
      } catch (error) {
        throw toMatchError(error, {
          400: 'Confira os dados da partida e tente de novo.',
          403: 'Só quem organiza pode editar a partida.',
          409: 'A partida não pode mais ser editada ou tem menos vagas do que confirmados.',
        });
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['matches'] }),
  });
}

/** `DELETE /matches/{id}`: cancels the match (it stays visible as cancelled). */
export function useCancelMatch(id: string) {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, void>({
    mutationFn: async () => {
      try {
        return await deleteMatch(id);
      } catch (error) {
        throw toMatchError(error, {
          403: 'Só quem organiza pode cancelar a partida.',
          409: 'O jogo já começou; a partida não pode mais ser cancelada.',
        });
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['matches'] }),
  });
}
