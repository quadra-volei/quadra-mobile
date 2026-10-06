import { useMutation, useQueryClient } from '@tanstack/react-query';

import { matchDetailQueryKey } from '@/features/matches/api/getMatchDetail';
import {
  fetchMatchDetail,
  putMyPresence,
  toMatchError,
} from '@/features/matches/api/matchesApi';
import { ApiError } from '@/lib/api/client';

export type PresenceMutationResult = {
  match: { id: string };
  /** Set when the match was full and the player was queued instead. */
  waitingListPosition?: number;
};

/** What a join can carry: the invite code of a private match. */
export type JoinMatchInput = { inviteCode?: string };

/**
 * Confirms the signed-in user on a match (`PUT /matches/{id}/presences/me`).
 * Someone not on the list yet joins by confirming. A full match answers 409 and
 * queues the player: that is reported as a result (`waitingListPosition`), not
 * as a failure. The same 409 also means "confirmations are not open".
 */
async function confirm(id: string, inviteCode?: string): Promise<PresenceMutationResult> {
  try {
    await putMyPresence(id, 'Confirmed', inviteCode);
    return { match: { id } };
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      const detail = await fetchMatchDetail(id).catch(() => null);
      if (detail?.myWaitingListPosition != null) {
        return { match: { id }, waitingListPosition: detail.myWaitingListPosition };
      }
    }
    throw toMatchError(error, {
      403: inviteCode
        ? 'Código de convite inválido.'
        : 'Essa partida é só para convidados.',
      409: 'As confirmações dessa partida não estão abertas.',
    });
  }
}

/** Declines; declining a match you were never in is already the wanted state. */
async function decline(id: string): Promise<PresenceMutationResult> {
  try {
    await putMyPresence(id, 'Declined');
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw toMatchError(error, {
        409: 'As confirmações dessa partida já fecharam.',
      });
    }
  }
  return { match: { id } };
}

/**
 * Builds a presence mutation bound to a match id. Whatever the outcome it
 * refreshes the match detail (grid/footer) and the broader `['matches']` key
 * (S5 Home lists).
 */
function usePresenceMutation<TInput>(
  id: string,
  mutationFn: (input: TInput) => Promise<PresenceMutationResult>,
) {
  const queryClient = useQueryClient();
  return useMutation<PresenceMutationResult, Error, TInput>({
    mutationFn,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: matchDetailQueryKey(id) });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

/**
 * Confirms the current user's presence — this is what puts them in the confirmed
 * list. Used by players already on the list AND by the organizer, who does not
 * play unless they say so.
 */
export function useConfirmPresence(id: string) {
  return usePresenceMutation<void>(id, () => confirm(id));
}

/**
 * Declines the current user's presence — removes them from the confirmed list,
 * freeing the slot.
 */
export function useDeclinePresence(id: string) {
  return usePresenceMutation<void>(id, () => decline(id));
}

/** Joins a match the user is not part of yet; a private one needs its invite code. */
export function useJoinMatch(id: string) {
  return usePresenceMutation<JoinMatchInput | void>(id, (input) =>
    confirm(id, input?.inviteCode?.trim().toUpperCase()),
  );
}
