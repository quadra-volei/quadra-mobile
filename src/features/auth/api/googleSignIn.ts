import { useMutation } from '@tanstack/react-query';

export type GoogleSession = {
  token: string;
};

export type GoogleUser = {
  id: string;
  name: string;
  /** Whether the user already completed onboarding. Drives Onboarding vs Home. */
  hasProfile: boolean;
};

export type GoogleSignInResult = {
  session: GoogleSession;
  user: GoogleUser;
};

// MOCK: deterministic fake latency. Tests may shorten/zero this. No native SDK,
// no token exchange, no network, no EXPO_PUBLIC_API_URL.
const MOCK_LATENCY_MS = 600;

/**
 * Signs the user in with Google.
 *
 * MOCK: this iteration ships fully mocked auth. The mutationFn simulates ~600ms
 * latency and resolves an **existing** test user (`hasProfile: true`) so tapping
 * "Entrar com Google" lands straight on Home and skips onboarding — no native
 * Google SDK, no token exchange, no network. The id/name match the mocked
 * profile in `src/features/profile/api/getMyProfile.ts` (Renan, id "me").
 *
 * TODO(real-api): replace the mock body below with the real FA.2 Google exchange
 * (native Google sign-in + backend token exchange) behind this unchanged hook
 * signature. The real `hasProfile` will come from the backend profile lookup.
 */
async function googleSignIn(): Promise<GoogleSignInResult> {
  // MOCK: fixed-latency resolve with an existing (onboarded) test user, no network/SDK.
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  return {
    session: { token: 'mock-google-session' },
    user: { id: 'me', name: 'Renan', hasProfile: true },
  };
}

export function useGoogleSignIn() {
  return useMutation<GoogleSignInResult, Error, void>({
    mutationFn: googleSignIn,
  });
}
