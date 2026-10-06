import { useQuery } from '@tanstack/react-query';

import {
  fetchMatchSummary,
  fetchMvpVoting,
  gamePlayersById,
} from '@/features/matches/api/gameApi';
import { fetchMatchDetail, toMatchDetail } from '@/features/matches/api/matchesApi';
import type { MatchPlayer } from '@/features/matches/api/useMVPVote';
import { useAuthStore } from '@/stores/auth';

/** Match format literals — mirror the values used by MatchHistoryRow (S8). */
export type MatchFormat = '2X2' | '4X4' | '6X6';

/** Match outcome from the current user's perspective. */
export type MatchResult = 'VITORIA' | 'DERROTA';

/** A player row with their MVP vote count (MVP card + vote ranking rows). */
export type MatchSummaryPlayer = MatchPlayer & { votes: number };

/**
 * The signed-in player's own performance in this match (F1.6, "MEU DESEMPENHO").
 * Read-only, computed server-side; self-reported stats input stays OUT of MVP.
 */
export type MatchPerformance = {
  /** XP earned from this match, added to level progress. */
  xpGained: number;
  points: number;
  blocks: number;
  defenses: number;
  aces: number;
};

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
  /** Sets won [mine, theirs] (the two teams of the last set when teams rotated). */
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
  /** The signed-in player's own performance ("MEU DESEMPENHO"). */
  myPerformance: MatchPerformance;
};

/** Query key (ARCHITECTURE convention): ['matches', id, 'summary']. */
export const matchSummaryQueryKey = (matchId: string) =>
  ['matches', matchId, 'summary'] as const;

/** Shown while the organizer has not closed the voting / generated the summary. */
export const SUMMARY_NOT_READY =
  'O resumo sai quando quem organiza encerrar a votação do MVP.';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-06-10T22:30:00Z" → "10 jun 2026". */
function toDateLabel(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// PLACEHOLDER: nobody votes → the MVP card has nobody to show.
const NO_MVP: MatchSummaryPlayer = { id: '', name: '—', handle: '', position: 'COR', votes: 0 };

// PLACEHOLDER: the backend records no per-player actions (points, blocks…) and
// has no XP yet, so "MEU DESEMPENHO" shows zeros.
// TODO(real-api): replace once the backend tracks per-player stats and XP.
const NO_PERFORMANCE: MatchPerformance = { xpGained: 0, points: 0, blocks: 0, defenses: 0, aces: 0 };

/**
 * Reads the summary of a concluded match (`GET /matches/{id}/summary`), from the
 * signed-in player's side: the result is a win when their team won, and scores
 * are shown as [mine, theirs]. Names come from the match roster and the vote
 * ranking from the closed MVP voting.
 */
async function getMatchSummary(matchId: string): Promise<MatchSummary> {
  const [summary, detail, voting] = await Promise.all([
    fetchMatchSummary(matchId),
    fetchMatchDetail(matchId),
    fetchMvpVoting(matchId),
  ]);
  if (!summary) {
    throw new Error(SUMMARY_NOT_READY);
  }

  const userId = useAuthStore.getState().userId;
  const match = toMatchDetail(detail, userId);
  const players = gamePlayersById(detail);
  const myTeamId = summary.teams.find((team) => userId != null && team.playerIds.includes(userId))?.teamId;
  // Show my team first; someone who sat out the last set sees it as recorded.
  const flip = myTeamId === summary.teamBId;
  const pair = (a: number, b: number): [number, number] => (flip ? [b, a] : [a, b]);

  const voteRanking: MatchSummaryPlayer[] = (voting?.results ?? [])
    .map((tally) => {
      const player = players.get(tally.playerId);
      return player ? { ...player, votes: tally.votes } : null;
    })
    .filter((row): row is MatchSummaryPlayer => row !== null)
    .sort((a, b) => b.votes - a.votes);
  const mvpPlayer = summary.mvpPlayerId ? players.get(summary.mvpPlayerId) : undefined;

  return {
    format: match.format,
    result: myTeamId != null && myTeamId === summary.winnerTeamId ? 'VITORIA' : 'DERROTA',
    name: match.name,
    venue: match.venue,
    dateLabel: toDateLabel(summary.endedAt),
    finalScore: pair(summary.teamASetsWon, summary.teamBSetsWon),
    setScores: summary.sets.map((set) => pair(set.teamAPoints, set.teamBPoints)),
    mvp: mvpPlayer ? { ...mvpPlayer, votes: summary.mvpVoteCount ?? 0 } : NO_MVP,
    totalVotes: summary.mvpTotalVotes,
    voteRanking,
    maxVotes: voteRanking[0]?.votes ?? 0,
    myPerformance: NO_PERFORMANCE,
  };
}

export type UseMatchSummaryOptions = {
  /** @deprecated No effect — kept so existing callers compile. The query is real now. */
  latencyMs?: number;
};

/**
 * Query hook to fetch the read-only match summary (result, final score, per-set
 * breakdown, most-voted MVP, vote ranking). Consumed by S16.
 */
export function useMatchSummary(matchId: string, _options: UseMatchSummaryOptions = {}) {
  return useQuery({
    queryKey: matchSummaryQueryKey(matchId),
    queryFn: () => getMatchSummary(matchId),
    enabled: matchId.length > 0,
    staleTime: 60_000,
    retry: false,
  });
}
