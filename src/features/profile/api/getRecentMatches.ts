import { useQuery } from '@tanstack/react-query';

import type { RecentMatch } from '@/features/profile/types/profile';

// MOCK: deterministic fake latency so RNTL can assert the loading placeholder,
// the populated history list, and navigation without flakiness. Tests may zero
// this via the param. No randomness, no network, no EXPO_PUBLIC_API_URL.
// Mirrors src/features/matches/api/getUpcoming.ts.
const MOCK_LATENCY_MS = 400;

/** Query key (ARCHITECTURE convention). */
export const recentMatchesQueryKey = ['profile', 'recentMatches'] as const;

// MOCK: fixed stub of the user's recent match results.
// TODO(real-api): the real F1.6 payload (match history) replaces this. Keep the
// shape; swap only the body behind this hook signature.
const MOCK_RECENT: RecentMatch[] = [
  {
    id: 'rm-1',
    name: 'Vôlei de Quinta',
    playedAt: '2026-06-18T19:30:00-03:00',
    format: '6X6',
    result: 'VITORIA',
    setScore: '3-1',
  },
  {
    id: 'rm-2',
    name: 'Racha da Galera',
    playedAt: '2026-06-16T20:00:00-03:00',
    format: '4X4',
    result: 'DERROTA',
    setScore: '1-3',
  },
  {
    id: 'rm-3',
    name: 'Treino Misto',
    playedAt: '2026-06-13T18:00:00-03:00',
    format: '6X6',
    result: 'VITORIA',
    setScore: '3-0',
  },
];

/**
 * Fetches the user's recent match history (read-only).
 *
 * MOCK: this iteration ships fully mocked. The queryFn simulates ~400ms latency
 * and resolves a fixed stub list with no network call or backend path.
 *
 * TODO(real-api): replace the mock body below with the real F1.6 history call
 * behind this unchanged hook signature, once the backend match module lands.
 * See S8 spec "Backend dependencies".
 */
async function getRecentMatches(latencyMs: number): Promise<RecentMatch[]> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  // MOCK: fixed stub array.
  return MOCK_RECENT;
}

export type UseRecentMatchesOptions = {
  /** Override the mock latency (tests pass 0 to remove the fake delay). */
  latencyMs?: number;
};

export function useRecentMatches(options: UseRecentMatchesOptions = {}) {
  const latencyMs = options.latencyMs ?? MOCK_LATENCY_MS;
  return useQuery({
    queryKey: recentMatchesQueryKey,
    queryFn: () => getRecentMatches(latencyMs),
  });
}
