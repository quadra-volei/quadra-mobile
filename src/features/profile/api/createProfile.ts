import { useMutation } from '@tanstack/react-query';

import type { OnboardingProfileInput } from '@/features/profile/schema/onboarding';

export type CreateProfileResult = {
  profile: { id: string } & OnboardingProfileInput;
};

// MOCK: deterministic fake latency so RNTL can assert the loading spinner and
// the success branch without flakiness. No randomness, no network, no
// EXPO_PUBLIC_API_URL. Mirrors the convention in src/features/auth/api/verifyOtp.ts.
const MOCK_LATENCY_MS = 600;

/**
 * Creates the player profile from the validated onboarding input.
 *
 * MOCK: this iteration ships fully mocked profile creation. The mutationFn
 * simulates ~600ms latency and always resolves a stub `{ profile }` echoing the
 * input. No network call, no Cognito, no backend path is asserted.
 *
 * TODO(real-api): replace the mock body below with the real F2.1 profile-create
 * call behind this unchanged hook signature. The real call is BLOCKED until the
 * backend Profile model gains `@handle`, `lastName`, `birthDate`, and
 * `modality` (see the S4 spec's "Backend alignment gate"). Do not wire until
 * the backend SCOPE is aligned.
 */
async function createProfile(
  input: OnboardingProfileInput,
): Promise<CreateProfileResult> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  // MOCK: stub profile echoing the validated input.
  return { profile: { id: 'mock-profile', ...input } };
}

export function useCreateProfile() {
  return useMutation<CreateProfileResult, Error, OnboardingProfileInput>({
    mutationFn: createProfile,
  });
}
