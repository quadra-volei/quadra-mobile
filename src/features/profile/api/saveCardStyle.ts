import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CardTitleCode } from '@/features/profile/card/cardTitles';
import { myProfileQueryKey } from '@/features/profile/api/getMyProfile';
import type { ApiCardStyle } from '@/features/profile/api/profileApi';
import type { MyProfile } from '@/features/profile/types/profile';
import { ApiError } from '@/lib/api/client';
import { authorizedApiClient } from '@/lib/api/authorizedClient';
import type { CardFinish } from '@/theme/cardFinish';

export type CardStyleChange = {
  finish: CardFinish;
  title: CardTitleCode | null;
};

/**
 * Saves the card's finish and title on the account
 * (`PUT /api/v1/profiles/me/card-style`, API DECISIONS #65). The card shows the
 * profile photo, so the old card-photo key only goes back unchanged.
 */
async function saveCardStyle(change: CardStyleChange, current: MyProfile['cardStyle']): Promise<ApiCardStyle> {
  return authorizedApiClient<ApiCardStyle>('/api/v1/profiles/me/card-style', {
    method: 'PUT',
    body: JSON.stringify({
      finish: change.finish,
      title: change.title,
      photoObjectKey: current.photoObjectKey,
    }),
  });
}

/**
 * Equips a finish or title at once (the cached profile changes before the
 * request, and goes back if it fails). Rejects with a pt-BR message.
 */
export function useSaveCardStyle() {
  const queryClient = useQueryClient();
  return useMutation<ApiCardStyle, Error, CardStyleChange, { previous?: MyProfile }>({
    mutationFn: async (change) => {
      const current = queryClient.getQueryData<MyProfile>(myProfileQueryKey)?.cardStyle
        ?? { finish: 'Prisma', title: null, photoObjectKey: null };
      try {
        return await saveCardStyle(change, current);
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error('Não foi possível salvar sua carta. Tente de novo.');
        }
        if (error instanceof TypeError) {
          throw new Error('Sem conexão. Verifique sua internet e tente de novo.');
        }
        throw error;
      }
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: myProfileQueryKey });
      const previous = queryClient.getQueryData<MyProfile>(myProfileQueryKey);
      if (previous) {
        queryClient.setQueryData<MyProfile>(myProfileQueryKey, {
          ...previous,
          cardStyle: { ...previous.cardStyle, finish: change.finish, title: change.title },
        });
      }
      return { previous };
    },
    onError: (_error, _change, context) => {
      if (context?.previous) {
        queryClient.setQueryData(myProfileQueryKey, context.previous);
      }
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<MyProfile>(myProfileQueryKey, (profile) =>
        profile
          ? {
              ...profile,
              cardStyle: {
                finish: saved.finish,
                title: saved.title,
                photoUrl: saved.photoUrl ?? undefined,
                photoObjectKey: saved.photoObjectKey,
              },
            }
          : profile,
      );
    },
  });
}
