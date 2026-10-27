import { useMutation, useQueryClient } from '@tanstack/react-query';

import { myProfileQueryKey } from '@/features/profile/api/getMyProfile';
import type { ApiTour } from '@/features/profile/api/profileApi';
import type { MyProfile } from '@/features/profile/types/profile';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

export type TourRecord = {
  version: number;
  outcome: ApiTour['outcome'];
  /** The last phase seen: 0 = the welcome card, then one per step. */
  lastStep: number;
};

/**
 * Records how the player left the tour (`PUT /api/v1/profiles/me/tour`, API
 * DECISIONS #97). Fire and forget: a failure only means the server does not
 * know; the phone already remembers (`useTourStore.seen`).
 */
export function useRecordTour() {
  const queryClient = useQueryClient();
  return useMutation<ApiTour, Error, TourRecord>({
    mutationFn: (record) =>
      authorizedApiClient<ApiTour>('/api/v1/profiles/me/tour', {
        method: 'PUT',
        body: JSON.stringify(record),
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData<MyProfile>(myProfileQueryKey, (profile) =>
        profile ? { ...profile, tour: saved } : profile,
      );
    },
  });
}
