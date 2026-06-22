import { useQuery } from '@tanstack/react-query';

import type { RankingRow } from '@/features/ranking/types/ranking';

// MOCK: deterministic fake latency so RNTL can assert the loading placeholder,
// the populated ranking card, and navigation without flakiness. Tests may zero
// this via the param. No randomness, no network, no EXPO_PUBLIC_API_URL.
// Mirrors src/features/matches/api/getUpcoming.ts.
const MOCK_LATENCY_MS = 400;

export type GroupRankingParams = {
  /** `true` → the S8 short preview (top rows + the user's row); `false` → S9 full list. */
  preview: boolean;
};

/** Query key (ARCHITECTURE convention). Shared with S9 (passes `preview: false`). */
export const groupRankingQueryKey = (params: GroupRankingParams) =>
  ['ranking', 'group', params] as const;

// MOCK: fixed stub of the weekly group ranking. `isMe` flags the current user's
// row for the highlight (the screen prefers the auth userId match in production).
// TODO(real-api): the real F2.3 payload (group ranking) replaces this. Keep the
// shape; swap only the body behind this hook signature.
const MOCK_RANKING: RankingRow[] = [
  { position: 1, playerId: 'p-guga', name: 'Guga', subtitle: 'Gustavo Lima', score: 81 },
  { position: 2, playerId: 'p-pistache', name: 'Pistache', subtitle: 'André Souza', score: 79 },
  { position: 3, playerId: 'p-cake', name: 'Cake', subtitle: 'Caio Keller', score: 74 },
  { position: 4, playerId: 'me', name: 'Você', subtitle: 'Renan Dias', score: 68, isMe: true },
];

/**
 * Fetches the weekly group ranking.
 *
 * MOCK: this iteration ships fully mocked. The queryFn simulates ~400ms latency
 * and resolves a fixed stub list with no network call or backend path. The
 * `preview` param is forwarded to the real call later (preview → short list).
 *
 * TODO(real-api): replace the mock body below with the real F2.3 group-ranking
 * call behind this unchanged hook signature, once the backend ranking module
 * lands. See S8 spec "Backend dependencies". Shared with S9 (full list).
 */
async function getGroupRanking(
  params: GroupRankingParams,
  latencyMs: number,
): Promise<RankingRow[]> {
  // MOCK: fixed-latency resolve, no network. `params.preview` is consumed by the
  // real F2.3 call later (it would request the short vs full list).
  void params;
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  // MOCK: fixed stub array.
  return MOCK_RANKING;
}

export type UseGroupRankingOptions = {
  /** Override the mock latency (tests pass 0 to remove the fake delay). */
  latencyMs?: number;
};

export function useGroupRanking(
  params: GroupRankingParams,
  options: UseGroupRankingOptions = {},
) {
  const latencyMs = options.latencyMs ?? MOCK_LATENCY_MS;
  return useQuery({
    queryKey: groupRankingQueryKey(params),
    queryFn: () => getGroupRanking(params, latencyMs),
    staleTime: 60_000,
  });
}
