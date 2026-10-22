import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { PLAYER_ACTIONS, type PlayerActionKey } from '@/features/matches/lib/playerActions';
import type { MatchResult, RecentMatch } from '@/features/profile/types/profile';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

/** Query key (ARCHITECTURE convention). */
export const recentMatchesQueryKey = ['profile', 'recentMatches'] as const;
export const matchHistoryQueryKey = ['profile', 'matchHistory'] as const;

/** How many rows the profile's "partidas recentes" shows. */
export const RECENT_COUNT = 5;
/** Page size of the full history screen (the API allows up to 50). */
const HISTORY_PAGE_SIZE = 20;

const HISTORY_PATH = '/api/v1/profiles/me/match-history';

/** One item of `GET /api/v1/profiles/me/match-history`. */
type ApiMatchHistoryEntry = {
  matchId: string;
  matchName: string;
  matchDateTime: string;
  outcome: 'Win' | 'Loss' | 'Draw' | 'NoResult';
  wasMvp?: boolean;
  /** Null on matches recorded before the format / set score were tracked. */
  format: string | null;
  setsWon: number | null;
  setsLost: number | null;
  /** The player's recorded actions (API DECISIONS #85); null = no sheet, a null action = not recorded. */
  actions?: Partial<Record<PlayerActionKey, number | null>> | null;
};

type ApiMatchHistoryPage = {
  items: ApiMatchHistoryEntry[];
  totalCount?: number;
  hasNextPage?: boolean;
};

/** A page of the history: the rows, and how many matches the player has in all. */
export type MatchHistoryPage = { items: RecentMatch[]; total: number; hasNextPage: boolean };

const RESULT: Record<ApiMatchHistoryEntry['outcome'], MatchResult> = {
  Win: 'VITORIA',
  Loss: 'DERROTA',
  Draw: 'EMPATE',
  NoResult: 'SEM_PLACAR',
};

/** "8 CRT · 3 SAL": the recorded actions above zero, in the app's order. */
function toActionsLine(actions: ApiMatchHistoryEntry['actions']): string {
  return PLAYER_ACTIONS.filter(({ key }) => (actions?.[key] ?? 0) > 0)
    .map(({ key, short }) => `${actions?.[key]} ${short}`)
    .join(' · ');
}

const FORMATS: readonly string[] = ['2X2', '4X4', '6X6'];

export function toRecentMatch(entry: ApiMatchHistoryEntry): RecentMatch {
  return {
    id: entry.matchId,
    name: entry.matchName,
    playedAt: entry.matchDateTime,
    // A match with no declared format is shown as the default 6x6.
    format:
      entry.format && FORMATS.includes(entry.format)
        ? (entry.format as RecentMatch['format'])
        : '6X6',
    result: RESULT[entry.outcome] ?? 'DERROTA',
    setScore:
      entry.setsWon != null && entry.setsLost != null
        ? `${entry.setsWon}-${entry.setsLost}`
        : '',
    actionsLine: toActionsLine(entry.actions),
    isMvp: entry.wasMvp === true,
  };
}

async function getMatchHistoryPage(page: number, pageSize: number): Promise<MatchHistoryPage> {
  const res = await authorizedApiClient<ApiMatchHistoryPage>(
    `${HISTORY_PATH}?page=${page}&pageSize=${pageSize}`,
  );
  return {
    items: res.items.map(toRecentMatch),
    total: res.totalCount ?? res.items.length,
    hasNextPage: res.hasNextPage ?? false,
  };
}

/**
 * Fetches the user's most recent finished matches (newest first). A match shows
 * up here once its organizer generated the summary.
 */
export function getRecentMatches(): Promise<MatchHistoryPage> {
  return getMatchHistoryPage(1, RECENT_COUNT);
}

export function useRecentMatches() {
  return useQuery({
    queryKey: recentMatchesQueryKey,
    queryFn: getRecentMatches,
  });
}

/** Every finished match of the user, newest first, page by page ("Ver tudo"). */
export function useMatchHistory() {
  return useInfiniteQuery({
    queryKey: matchHistoryQueryKey,
    queryFn: ({ pageParam }) => getMatchHistoryPage(pageParam, HISTORY_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last, _all, lastPage) => (last.hasNextPage ? lastPage + 1 : undefined),
  });
}

/** A month of the history: "OUTUBRO 2026" and its matches, in the order given. */
export type MatchHistoryMonth = { title: string; data: RecentMatch[] };

/** Splits matches (newest first) into months, in the device's time zone. */
export function groupByMonth(matches: RecentMatch[]): MatchHistoryMonth[] {
  const months: MatchHistoryMonth[] = [];
  for (const match of matches) {
    const date = new Date(match.playedAt);
    const title = `${date.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()} ${date.getFullYear()}`;
    const current = months[months.length - 1];
    if (current?.title === title) current.data.push(match);
    else months.push({ title, data: [match] });
  }
  return months;
}
