import { useQuery } from '@tanstack/react-query';

import type { MyProfile } from '@/features/profile/types/profile';

// MOCK: deterministic fake latency so RNTL can assert the loading placeholder,
// the populated header/progress card, and navigation without flakiness. Tests
// may zero this via the param. No randomness, no network, no EXPO_PUBLIC_API_URL.
// Mirrors src/features/matches/api/getUpcoming.ts.
const MOCK_LATENCY_MS = 400;

/** Query key (ARCHITECTURE convention). */
export const myProfileQueryKey = ['profile', 'me'] as const;

// MOCK: fixed stub of the current user's identity + progress.
// TODO(real-api): the real F2.1/F2.2 payload (profile + progress/level) replaces
// this. Keep the shape; swap only the body behind this hook signature.
const MOCK_PROFILE: MyProfile = {
  id: 'me',
  firstName: 'Renan',
  avatarUrl: 'https://i.pravatar.cc/200?img=15',
  overall: 68,
  level: 15,
  xp: 2450,
  xpToNext: 5000,
  // Edit-profile fields (S10) — additive mock values.
  lastName: 'Dias',
  handle: 'renan',
  birthDate: '14/03/1998',
  phone: '11984721130',
  position: 'LEV',
};

/**
 * Fetches the authenticated user's profile + progress.
 *
 * MOCK: this iteration ships fully mocked. The queryFn simulates ~400ms latency
 * and resolves a fixed stub with no network call or backend path.
 *
 * TODO(real-api): replace the mock body below with the real F2.1/F2.2 call
 * (profile + progress/level) behind this unchanged hook signature, once the
 * backend profile module lands. See S8 spec "Backend dependencies".
 */
async function getMyProfile(latencyMs: number): Promise<MyProfile> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  // MOCK: fixed stub.
  return MOCK_PROFILE;
}

export type UseMyProfileOptions = {
  /** Override the mock latency (tests pass 0 to remove the fake delay). */
  latencyMs?: number;
};

export function useMyProfile(options: UseMyProfileOptions = {}) {
  const latencyMs = options.latencyMs ?? MOCK_LATENCY_MS;
  return useQuery({
    queryKey: myProfileQueryKey,
    queryFn: () => getMyProfile(latencyMs),
  });
}
