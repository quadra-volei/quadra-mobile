import { useMutation, useQueryClient } from '@tanstack/react-query';

import { myProfileQueryKey } from '@/features/profile/api/getMyProfile';
import type { EditProfileInput } from '@/features/profile/schema/editProfile';

export type UpdateProfileResult = {
  profile: { id: string } & EditProfileInput;
};

// MOCK: deterministic fake latency so RNTL can assert the CTA loading state and
// the success branch without flakiness. No randomness, no network, no
// EXPO_PUBLIC_API_URL. Mirrors src/features/profile/api/createProfile.ts.
const MOCK_LATENCY_MS = 600;

/**
 * Updates the authenticated user's profile from the validated edit input.
 *
 * MOCK: this iteration ships fully mocked. The mutationFn simulates ~600ms
 * latency and resolves a stub `{ profile }` echoing the input (including the
 * picked `avatarUri`). No network call, no backend path is asserted.
 *
 * TODO(real-api): replace the mock body below with the real `PATCH
 * /api/v1/profile/me` call behind this unchanged hook signature. The real call
 * is BLOCKED until the backend Profile model gains `@handle`, `lastName`,
 * `birthDate`, `modality`/`position`, and an avatar upload field (see the S4
 * spec's "Backend alignment gate"). Do not wire until the backend SCOPE aligns.
 */
async function updateProfile(
  input: EditProfileInput,
): Promise<UpdateProfileResult> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  // MOCK: stub profile echoing the validated input (incl. avatarUri).
  return { profile: { id: 'mock-profile', ...input } };
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
