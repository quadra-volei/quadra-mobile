import { useMutation, useQueryClient } from '@tanstack/react-query';

import { myProfileQueryKey } from '@/features/profile/api/getMyProfile';
import type { EditProfileInput } from '@/features/profile/schema/editProfile';
import type { MyProfile } from '@/features/profile/types/profile';

const MOCK_LATENCY_MS = 600;

export type UpdateProfileResult = {
  profile: MyProfile;
};

/**
 * Updates the authenticated user's profile fields (S10 "Editar perfil").
 *
 * MOCK: simulates latency and patches the cached `MyProfile` stub. No network.
 *
 * TODO(real-api): replace with the real F2.1 profile-edit call behind this
 * unchanged hook signature once the backend Profile model is aligned.
 */
async function updateProfile(
  input: EditProfileInput,
  current: MyProfile | undefined,
): Promise<UpdateProfileResult> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  if (!current) {
    throw new Error('Perfil não carregado');
  }
  return {
    profile: {
      ...current,
      ...input,
    },
  };
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<UpdateProfileResult, Error, EditProfileInput>({
    mutationFn: (input) => {
      const current = queryClient.getQueryData<MyProfile>(myProfileQueryKey);
      return updateProfile(input, current);
    },
    onSuccess: ({ profile }) => {
      queryClient.setQueryData(myProfileQueryKey, profile);
    },
  });
}
