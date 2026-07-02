import { useQuery } from '@tanstack/react-query';

import type { MatchPlayer } from '@/features/matches/api/useMVPVote';

/** Match format literals — mirror the values used by MatchHistoryRow (S8). */
export type MatchFormat = '2X2' | '4X4' | '6X6';

/** Match outcome from the current user's perspective. */
export type MatchResult = 'VITORIA' | 'DERROTA';

/** A player row with their MVP vote count (MVP card + vote ranking rows). */
export type MatchSummaryPlayer = MatchPlayer & { votes: number };

/**
 * Full read-only match summary (F1.6). Returned by useMatchSummary.
 * result + final score + per-set breakdown + most-voted MVP + vote ranking.
 */
export type MatchSummary = {
  format: MatchFormat;
  result: MatchResult;
  name: string;
  venue: string;
  /** Pre-formatted pt-BR date, e.g. "10 jun 2026". */
  dateLabel: string;
  /** Sets won [mine, theirs]. */
  finalScore: [number, number];
  /** Per-set point scores, one tuple per set played. */
  setScores: Array<[number, number]>;
  /** The most-voted player, with their vote count. */
  mvp: MatchSummaryPlayer;
  /** Denominator for "N de M votos" (total votes cast). */
  totalVotes: number;
  /** Top-voted players, sorted descending by votes. */
  voteRanking: MatchSummaryPlayer[];
  /** = voteRanking[0].votes — used to scale the vote bars. */
  maxVotes: number;
};

// MOCK: deterministic fake latency so tests can assert the loading state and the
// populated state without flakiness. Tests may zero this via the options param.
const MOCK_LATENCY_MS = 300;

/** Query key (ARCHITECTURE convention): ['matches', id, 'summary']. */
export const matchSummaryQueryKey = (matchId: string) =>
  ['matches', matchId, 'summary'] as const;

// MOCK: fixed summary fixtures keyed by matchId, mirroring the MOCK_PLAYERS
// fixtures in useMVPVote.ts. In the real backend these are computed server-side
// from the concluded match (sets, scores, tallied MVP votes).
const MOCK_SUMMARIES: Record<string, MatchSummary> = {
  'mine-1': {
    format: '6X6',
    result: 'VITORIA',
    name: 'Vôlei de Quinta',
    venue: 'Arena Pinheiros',
    dateLabel: '10 jun 2026',
    finalScore: [3, 1],
    setScores: [
      [25, 19],
      [23, 25],
      [25, 21],
      [25, 18],
    ],
    mvp: {
      id: 'o2',
      name: 'Érica Moraes',
      handle: 'erica.vbs',
      position: 'CEN',
      avatarUrl: undefined,
      votes: 5,
    },
    totalVotes: 10,
    voteRanking: [
      { id: 'o2', name: 'Érica Moraes', handle: 'erica.vbs', position: 'CEN', avatarUrl: undefined, votes: 5 },
      { id: 'o3', name: 'Caio Drumond', handle: 'caio_op', position: 'OPO', avatarUrl: undefined, votes: 3 },
      { id: 'o5', name: 'Manu Castro', handle: 'manu_pon', position: 'PON', avatarUrl: undefined, votes: 2 },
    ],
    maxVotes: 5,
  },
  'near-1': {
    format: '4X4',
    result: 'DERROTA',
    name: 'Racha do Sábado',
    venue: 'Quadra Central',
    dateLabel: '13 jun 2026',
    finalScore: [1, 3],
    setScores: [
      [25, 22],
      [20, 25],
      [18, 25],
      [21, 25],
    ],
    mvp: {
      id: 'p1',
      name: 'Renan Dias',
      handle: 'renan_dias',
      position: 'LEV',
      avatarUrl: undefined,
      votes: 4,
    },
    totalVotes: 8,
    voteRanking: [
      { id: 'p1', name: 'Renan Dias', handle: 'renan_dias', position: 'LEV', avatarUrl: undefined, votes: 4 },
      { id: 'p2', name: 'Bia Fontes', handle: 'biaf', position: 'PON', avatarUrl: undefined, votes: 3 },
      { id: 'p3', name: 'Caio Drumond', handle: 'caio_op', position: 'OPO', avatarUrl: undefined, votes: 1 },
    ],
    maxVotes: 4,
  },
};

/**
 * Reads the read-only match summary for a concluded match (F1.6).
 *
 * MOCK: this iteration ships fully mocked. The queryFn simulates ~300ms latency
 * and resolves a fixed fixture chosen by `matchId` with no network call. In the
 * real backend, the summary is computed server-side once the match ends and MVP
 * voting concludes.
 *
 * TODO(real-api): F1.6 path TBD. Replace the mock body below with the real call
 * once the backend match module lands.
 * Endpoint (later): GET /api/v1/matches/{matchId}/summary -> MatchSummary
 */
async function getMatchSummary(
  matchId: string,
  latencyMs: number,
): Promise<MatchSummary> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  // MOCK: pick a fixture by matchId, defaulting to the 'mine-1' fixture.
  return MOCK_SUMMARIES[matchId] ?? MOCK_SUMMARIES['mine-1']!;
}

export type UseMatchSummaryOptions = {
  /** Override the mock latency (tests pass 0 to remove the fake delay). */
  latencyMs?: number;
};

/**
 * Query hook to fetch the read-only match summary (result, final score, per-set
 * breakdown, most-voted MVP, vote ranking). Consumed by S16.
 */
export function useMatchSummary(
  matchId: string,
  options: UseMatchSummaryOptions = {},
) {
  const latencyMs = options.latencyMs ?? MOCK_LATENCY_MS;
  return useQuery({
    queryKey: matchSummaryQueryKey(matchId),
    queryFn: () => getMatchSummary(matchId, latencyMs),
    staleTime: 60_000,
  });
}
