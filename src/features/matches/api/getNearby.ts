import { useQuery } from '@tanstack/react-query';

import type { NearbyMatch } from '@/features/matches/types/match';

// MOCK: deterministic fake latency so RNTL can assert the loading placeholder,
// the populated grid, and navigation without flakiness. Tests may zero this via
// the param. No randomness, no network, no EXPO_PUBLIC_API_URL.
// Mirrors src/features/auth/api/requestOtp.ts / profile/api/createProfile.ts.
const MOCK_LATENCY_MS = 400;

/**
 * Geo input shape so the real F1.7 query slots in unchanged. While mocked the
 * params are accepted but ignored (no device location read on Home — see S5
 * spec "Permissions"; location lands with S17).
 */
export type NearbyMatchesParams = {
  lat: number;
  lon: number;
  radiusKm: number;
};

/** Query key (ARCHITECTURE convention). */
export const nearbyMatchesQueryKey = (params: NearbyMatchesParams) =>
  ['matches', 'nearby', params] as const;

// MOCK: fixed stub list of nearby matches.
// TODO(real-api): the real F1.7 geo-nearby payload replaces this.
const MOCK_NEARBY: NearbyMatch[] = [
  {
    id: 'near-1',
    name: 'Arena Sky Beach',
    format: '4X4',
    level: 'INTERMEDIARIO',
    distanceKm: 1.2,
    confirmed: 6,
    capacity: 8,
    priceLabel: 'R$ 25',
  },
  {
    id: 'near-2',
    name: 'Quadra do Parque',
    format: '6X6',
    level: 'INICIANTE',
    distanceKm: 2.6,
    confirmed: 9,
    capacity: 12,
    priceLabel: 'Grátis',
  },
  {
    id: 'near-3',
    name: 'Beach Vôlei SP',
    format: '2X2',
    level: 'AVANCADO',
    distanceKm: 3.4,
    confirmed: 2,
    capacity: 4,
    priceLabel: 'R$ 40',
  },
  {
    id: 'near-4',
    name: 'Centro Olímpico',
    format: '6X6',
    level: 'INTERMEDIARIO',
    distanceKm: 4.1,
    confirmed: 3,
    capacity: 12,
    priceLabel: 'R$ 18',
  },
];

/**
 * Fetches matches happening near the user.
 *
 * MOCK: this iteration ships fully mocked. The queryFn simulates ~400ms latency
 * and resolves a fixed stub list with no network call or backend path. The
 * `params` are accepted (so the signature is final) but ignored while mocked.
 *
 * TODO(real-api): replace the mock body below with the real F1.7 geo-nearby call
 * behind this unchanged hook signature, once the backend match module lands.
 * See S5 spec "Backend dependencies".
 */
async function getNearbyMatches(
  _params: NearbyMatchesParams,
  latencyMs: number,
): Promise<NearbyMatch[]> {
  // MOCK: fixed-latency resolve, no network. `_params` ignored while mocked.
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  // MOCK: fixed stub array.
  return MOCK_NEARBY;
}

export type UseNearbyMatchesOptions = {
  /** Override the mock latency (tests pass 0 to remove the fake delay). */
  latencyMs?: number;
};

export function useNearbyMatches(
  params: NearbyMatchesParams,
  options: UseNearbyMatchesOptions = {},
) {
  const latencyMs = options.latencyMs ?? MOCK_LATENCY_MS;
  return useQuery({
    queryKey: nearbyMatchesQueryKey(params),
    queryFn: () => getNearbyMatches(params, latencyMs),
    staleTime: 60_000,
  });
}
