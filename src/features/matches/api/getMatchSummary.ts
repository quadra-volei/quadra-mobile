import { useQuery } from '@tanstack/react-query';

import {
  fetchMatchSummary,
  fetchMvpVoting,
  type GamePlayer,
  gamePlayersById,
} from '@/features/matches/api/gameApi';
import { fetchMatchDetail, toMatchDetail } from '@/features/matches/api/matchesApi';
import type { MatchPlayer } from '@/features/matches/api/useMVPVote';
import { matchPoints, type PlayerActions } from '@/features/matches/lib/playerActions';
import { teamName } from '@/features/matches/lib/teamColors';
import { MATCHES_PATH } from '@/features/matches/api/matchesApi';
import { authorizedApiClient } from '@/lib/api/authorizedClient';
import { useAuthStore } from '@/stores/auth';

/** Match format literals — mirror the values used by MatchHistoryRow (S8). */
export type MatchFormat = '2X2' | '4X4' | '6X6';

/** Match outcome from the current user's perspective; SEM_PLACAR: no fixed teams, nobody wins. */
export type MatchResult = 'VITORIA' | 'DERROTA' | 'SEM_PLACAR';

/** A player row with their MVP vote count (MVP card + vote ranking rows). */
export type MatchSummaryPlayer = MatchPlayer & { votes: number };

/**
 * The signed-in player's own performance in this match (F1.6, "MEU DESEMPENHO"):
 * the points it gave and the actions the organizer recorded (API DECISIONS #84).
 */
export type MatchPerformance = {
  /** Points earned from this match (attendance +10, win +15, MVP +25). */
  xpGained: number;
  /** Null when nothing was recorded for the player (not zeros). */
  actions: PlayerActions | null;
};

/** A row of the match's stats sheet. */
export type SheetRow = { player: GamePlayer; actions: PlayerActions };

/** A team in the final standings. `colorIndex` follows the scoreboard's team colors. */
export type SummaryTeam = {
  id: string;
  name: string;
  wins: number;
  colorIndex: number;
  mine: boolean;
  winner: boolean;
};

/** A game of the session: its winner and the points as [winner, loser]. */
export type SummaryGame = {
  number: number;
  /** Null when the game ended tied (forced end). */
  winner: SummaryTeam | null;
  points: [number, number];
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
  /** The winning team's name; null when nobody won (ended on a tie). */
  winnerName: string | null;
  /** Every team with the games it won, most wins first. */
  standings: SummaryTeam[];
  /** One row per game played, with who won it. */
  games: SummaryGame[];
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
  /** No fixed teams (API DECISIONS #86): no standings, no games, no winner. */
  free: boolean;
  /** Everyone with recorded actions, most cortadas first. */
  sheet: SheetRow[];
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

/** The match's stats sheet; null when the caller may not read it. */
async function fetchSheet(matchId: string): Promise<({ playerId: string } & PlayerActions)[] | null> {
  try {
    const sheet = await authorizedApiClient<{ players: ({ playerId: string } & PlayerActions)[] }>(
      `${MATCHES_PATH}/${matchId}/player-stats`,
    );
    return sheet.players;
  } catch {
    return null;
  }
}

/**
 * Reads the summary of a concluded match (`GET /matches/{id}/summary`), from the
 * signed-in player's side: the result is a win when their team won. Every score
 * carries its team: games won per team, and each game's winner. Names come from the match roster and the vote
 * ranking from the closed MVP voting.
 */
async function getMatchSummary(matchId: string): Promise<MatchSummary> {
  const [summary, detail, voting, sheetRows] = await Promise.all([
    fetchMatchSummary(matchId),
    fetchMatchDetail(matchId),
    fetchMvpVoting(matchId),
    fetchSheet(matchId),
  ]);
  if (!summary) {
    throw new Error(SUMMARY_NOT_READY);
  }

  const userId = useAuthStore.getState().userId;
  const match = toMatchDetail(detail, userId);
  const players = gamePlayersById(detail);
  const myTeamId = summary.teams.find((team) => userId != null && team.playerIds.includes(userId))?.teamId;
  // Teams come sorted by name, the same order the scoreboard colors them in.
  const teams: SummaryTeam[] = summary.teams.map((team, colorIndex) => ({
    id: team.teamId,
    // By place, like the live game (older teams were "Team A"…).
    name: teamName(colorIndex),
    wins: summary.sets.filter((set) => set.winnerTeamId === team.teamId).length,
    colorIndex,
    mine: team.teamId === myTeamId,
    winner: team.teamId === summary.winnerTeamId,
  }));
  const games: SummaryGame[] = summary.sets.map((set) => ({
    number: set.setNumber,
    winner: teams.find((team) => team.id === set.winnerTeamId) ?? null,
    points: [Math.max(set.teamAPoints, set.teamBPoints), Math.min(set.teamAPoints, set.teamBPoints)],
  }));

  const voteRanking: MatchSummaryPlayer[] = (voting?.results ?? [])
    .map((tally) => {
      const player = players.get(tally.playerId);
      return player ? { ...player, votes: tally.votes } : null;
    })
    .filter((row): row is MatchSummaryPlayer => row !== null)
    .sort((a, b) => b.votes - a.votes);
  const mvpPlayer = summary.mvpPlayerId ? players.get(summary.mvpPlayerId) : undefined;
  const free = summary.format === 'Free';
  const result: MatchResult = free
    ? 'SEM_PLACAR'
    : myTeamId != null && myTeamId === summary.winnerTeamId
      ? 'VITORIA'
      : 'DERROTA';
  const mine = sheetRows?.find((row) => row.playerId === userId);
  const sheet: SheetRow[] = (sheetRows ?? [])
    .map(({ playerId, ...actions }) => {
      const player = players.get(playerId);
      return player ? { player, actions } : null;
    })
    .filter((row): row is SheetRow => row !== null)
    .sort((a, b) => b.actions.kills - a.actions.kills);

  return {
    format: match.format,
    result,
    free,
    sheet,
    name: match.name,
    venue: match.venue,
    dateLabel: toDateLabel(summary.endedAt),
    winnerName: free ? null : (teams.find((team) => team.winner)?.name ?? null),
    standings: free ? [] : [...teams].sort((a, b) => Number(b.winner) - Number(a.winner) || b.wins - a.wins),
    games: free ? [] : games,
    mvp: mvpPlayer ? { ...mvpPlayer, votes: summary.mvpVoteCount ?? 0 } : NO_MVP,
    totalVotes: summary.mvpTotalVotes,
    voteRanking,
    maxVotes: voteRanking[0]?.votes ?? 0,
    myPerformance: {
      xpGained: matchPoints(result === 'VITORIA', userId != null && summary.mvpPlayerId === userId),
      actions: mine ? { kills: mine.kills, blocks: mine.blocks, aces: mine.aces, digs: mine.digs, assists: mine.assists } : null,
    },
  };
}

/**
 * Query hook to fetch the read-only match summary (result, final score, per-set
 * breakdown, most-voted MVP, vote ranking). Consumed by S16.
 */
export function useMatchSummary(matchId: string) {
  return useQuery({
    queryKey: matchSummaryQueryKey(matchId),
    queryFn: () => getMatchSummary(matchId),
    enabled: matchId.length > 0,
    staleTime: 60_000,
    retry: false,
  });
}
