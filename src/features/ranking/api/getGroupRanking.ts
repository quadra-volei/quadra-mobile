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
// Each `subtitle` follows the S9 `@handle · Posição` shape; `trend` carries the
// movement-since-last-period indicator the S9 list renders (↑/↓/—).
// `score` is the player's OVR (overall rating) — the same number shown as GERAL
// on the profile — so the ranking sorts by OVR and the "me" row (68) matches the
// profile's GERAL. TODO(real-api): the real F2.3 payload (group ranking) replaces
// this. Keep the shape; swap only the body behind this hook signature.
const MOCK_RANKING_FULL: RankingRow[] = [
  { position: 1, playerId: 'p-erica', name: 'Érica', subtitle: '@erica · Oposto', score: 81, level: 18, trend: { direction: 'up', delta: 1 } },
  { position: 2, playerId: 'p-caio', name: 'Caio', subtitle: '@caio · Central', score: 79, level: 15, trend: { direction: 'flat', delta: 0 } },
  { position: 3, playerId: 'p-manu', name: 'Manu', subtitle: '@manu · Líbero', score: 74, level: 14, trend: { direction: 'down', delta: 1 } },
  { position: 4, playerId: 'me', name: 'Renan Dias', subtitle: '@renan · Levantador', score: 68, level: 15, isMe: true, trend: { direction: 'up', delta: 5 } },
  { position: 5, playerId: 'p-duda', name: 'Duda Reis', subtitle: '@dudareis · Ponteiro', score: 65, level: 11, trend: { direction: 'flat', delta: 0 } },
  { position: 6, playerId: 'p-bia', name: 'Bia Fontes', subtitle: '@biaf · Líbero', score: 62, level: 9, trend: { direction: 'up', delta: 2 } },
  { position: 7, playerId: 'p-theo', name: 'Theo Nunes', subtitle: '@theon · Ponteiro', score: 58, level: 7, trend: { direction: 'down', delta: 2 } },
  { position: 8, playerId: 'p-vini', name: 'Vini Sales', subtitle: '@vsales · Central', score: 54, level: 6, trend: { direction: 'up', delta: 1 } },
];

// MOCK: the S8 short preview — the top rows plus the current user's row
// (positions 1–4 of the full list).
const MOCK_RANKING_PREVIEW: RankingRow[] = MOCK_RANKING_FULL.slice(0, 4);

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
  // MOCK: fixed-latency resolve, no network. `params.preview` branches the stub
  // (preview → S8 short list; full → S9 podium + position-4+ list). The real F2.3
  // call later requests the short vs full list off the same flag.
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  // MOCK: fixed stub array, branched on preview.
  return params.preview ? MOCK_RANKING_PREVIEW : MOCK_RANKING_FULL;
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
