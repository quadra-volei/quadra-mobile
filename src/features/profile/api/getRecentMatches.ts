import { useQuery } from '@tanstack/react-query';

import { PLAYER_ACTIONS, type PlayerActionKey } from '@/features/matches/lib/playerActions';
import type { MatchResult, RecentMatch } from '@/features/profile/types/profile';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

/** Query key (ARCHITECTURE convention). */
export const recentMatchesQueryKey = ['profile', 'recentMatches'] as const;

/** How many rows the profile's "partidas recentes" shows. */
const RECENT_COUNT = 5;

/** One item of `GET /api/v1/profiles/me/match-history`. */
type ApiMatchHistoryEntry = {
  matchId: string;
  matchName: string;
  matchDateTime: string;
  outcome: 'Win' | 'Loss' | 'Draw' | 'NoResult';
  /** Null on matches recorded before the format / set score were tracked. */
  format: string | null;
  setsWon: number | null;
  setsLost: number | null;
  /** The player's recorded actions (API DECISIONS #85); null = no sheet, a null action = not recorded. */
  actions?: Partial<Record<PlayerActionKey, number | null>> | null;
};

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
  };
}

/**
 * Fetches the user's most recent finished matches
 * (`GET /api/v1/profiles/me/match-history`, newest first). A match shows up
 * here once its organizer generated the summary.
 */
export async function getRecentMatches(): Promise<RecentMatch[]> {
  const { items } = await authorizedApiClient<{ items: ApiMatchHistoryEntry[] }>(
    `/api/v1/profiles/me/match-history?page=1&pageSize=${RECENT_COUNT}`,
  );
  return items.map(toRecentMatch);
}

export function useRecentMatches() {
  return useQuery({
    queryKey: recentMatchesQueryKey,
    queryFn: getRecentMatches,
  });
}
