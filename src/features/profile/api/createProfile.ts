import { useMutation, useQueryClient } from '@tanstack/react-query';

import { myProfileQueryKey } from '@/features/profile/api/getMyProfile';
import {
  putMyProfile,
  toApiDate,
  toApiLevel,
  toApiModality,
  toProfileError,
} from '@/features/profile/api/profileApi';
import type { OnboardingProfileInput } from '@/features/profile/schema/onboarding';

export type CreateProfileResult = {
  profile: { id: string } & OnboardingProfileInput;
};

/**
 * Completes onboarding (S4): saves the validated wizard input to the profile the
 * backend created at sign-up (`PUT /api/v1/profiles/me`). This is the only
 * moment the self-declared level is accepted; the backend derives the player's
 * starting skill ratings from it and from the position.
 *
 * Rejects with a pt-BR message ready for display — e.g. when the `@handle` is
 * already taken (409).
 */
async function createProfile(
  input: OnboardingProfileInput,
): Promise<CreateProfileResult> {
  try {
    const saved = await putMyProfile({
      firstName: input.firstName,
      lastName: input.lastName,
      handle: input.handle,
      birthDate: toApiDate(input.birthDate),
      position: input.position,
      modality: toApiModality(input.modality),
      level: toApiLevel(input.level),
      photoObjectKey: null,
    });
    return { profile: { ...input, id: saved.userId, handle: saved.handle ?? input.handle } };
  } catch (error) {
    throw toProfileError(error);
  }
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation<CreateProfileResult, Error, OnboardingProfileInput>({
    mutationFn: createProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: myProfileQueryKey });
    },
  });
}
