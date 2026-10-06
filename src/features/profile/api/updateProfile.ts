import { useMutation, useQueryClient } from '@tanstack/react-query';

import { myProfileQueryKey } from '@/features/profile/api/getMyProfile';
import {
  fetchMyProfile,
  putMyProfile,
  toApiDate,
  toProfileError,
  uploadProfilePhoto,
} from '@/features/profile/api/profileApi';
import type { EditProfileInput } from '@/features/profile/schema/editProfile';

export type UpdateProfileResult = {
  profile: { id: string } & EditProfileInput;
};

/**
 * Saves the edit-profile form (S10) with `PUT /api/v1/profiles/me`.
 *
 * Two form fields are not persisted yet:
 *  - `phone` — it is the login identity and belongs to the Auth backend; the
 *    profile endpoint has no phone, so the value is echoed back unchanged.
 *  - `avatarUri` — photo upload is not wired (the backend's photo storage is
 *    optional and currently off); the current photo is kept.
 *
 * Rejects with a pt-BR message ready for display — e.g. when the `@handle` is
 * already taken (409).
 *
 * TODO(real-api): upload `avatarUri` through POST /api/v1/profiles/me/photo/upload-url
 * once photo storage is configured.
 */
async function updateProfile(
  input: EditProfileInput,
): Promise<UpdateProfileResult> {
  try {
    // The PUT replaces the photo reference, so the current one is sent back.
    const current = await fetchMyProfile();
    // A newly picked photo is uploaded first; without photo storage the current one stays.
    const uploadedKey = input.avatarUri ? await uploadProfilePhoto(input.avatarUri) : null;
    const saved = await putMyProfile({
      firstName: input.firstName,
      lastName: input.lastName,
      handle: input.handle,
      birthDate: toApiDate(input.birthDate),
      position: input.position,
      // Not editable in S10: null keeps the modality; the level cannot change.
      modality: null,
      level: null,
      photoObjectKey: uploadedKey ?? current.photoObjectKey,
    });
    return { profile: { ...input, id: saved.userId, handle: saved.handle ?? input.handle } };
  } catch (error) {
    throw toProfileError(error);
  }
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<UpdateProfileResult, Error, EditProfileInput>({
    mutationFn: updateProfile,
    onSuccess: () => {
      // Refresh the cached profile so the settings summary reflects the edit.
      void queryClient.invalidateQueries({ queryKey: myProfileQueryKey });
    },
  });
}
