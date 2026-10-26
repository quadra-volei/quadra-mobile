import { useQuery } from '@tanstack/react-query';

import { positionLabel, type Position } from '@/features/profile/schema/onboarding';
import type { RankingRow } from '@/features/ranking/types/ranking';
import { authorizedApiClient } from '@/lib/api/authorizedClient';
import { useAuthStore } from '@/stores/auth';

// Season ranking (`GET /api/v1/rankings`, quadra-api DECISIONS #63, #95): points
// of recurring matches played in a month, in the player's network (who they
// follow and who follows them), in one group, or general.

export type RankingScope = 'friends' | 'group' | 'general';
export type RankingSort = 'points' | 'mvps' | 'wins';

export type RankingParams = {
  scope: RankingScope;
  /** Required when `scope` is `group`. */
  groupId?: string;
  /** Court position code (LEV, PON, OPO, CEN, LIB, COR); undefined = all. */
  position?: Position;
  /** Month as `yyyy-MM`; undefined = the current season. */
  season?: string;
  /** Undefined = points. */
  sort?: RankingSort;
};

export type Ranking = {
  rows: RankingRow[];
  /** The signed-in player's line, even when outside the list or not qualified yet. */
  me: RankingRow | null;
  /** The line right above mine: who I pass next. */
  nextUp: RankingRow | null;
  groupName: string | null;
  /** The group ranked (its first game's id), whatever game id was asked for. */
  groupId: string | null;
  /** Games needed this season to be ranked (3 in general, 1 elsewhere). */
  minMatches: number;
  /** First day of the season (ISO). */
  seasonStart: string;
  /** First day of the next season (ISO). */
  seasonEnd: string;
};

export type RankingGroup = { id: string; name: string };

type ApiRankingEntry = {
  rank: number | null;
  userId: string;
  displayName: string;
  handle: string | null;
  position: string | null;
  photoUrl: string | null;
  points: number;
  matches: number;
  wins?: number;
  mvps?: number;
  /** GERAL, the same number as the profile and the card (API DECISIONS #85). */
  overall?: number | null;
  votes?: number;
  attendancePoints?: number;
  winPoints?: number;
  mvpPoints?: number;
  previousRank?: number | null;
};

type ApiRanking = {
  groupId: string | null;
  groupName: string | null;
  minMatches: number;
  seasonStart: string;
  seasonEnd?: string;
  items: ApiRankingEntry[];
  callerEntry: ApiRankingEntry | null;
  nextUp?: ApiRankingEntry | null;
};

const PREVIEW_SIZE = 4;
const FULL_SIZE = 50; // the backend's page-size cap

function trendOf(entry: ApiRankingEntry): RankingRow['trend'] {
  if (entry.rank == null || entry.previousRank == null) return undefined;
  const delta = entry.previousRank - entry.rank;
  return { direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat', delta: Math.abs(delta) };
}

export function toRankingRow(entry: ApiRankingEntry, userId: string | null): RankingRow {
  const subtitle = [
    entry.handle ? `@${entry.handle}` : null,
    positionLabel((entry.position ?? undefined) as Position | undefined),
    `${entry.matches} ${entry.matches === 1 ? 'jogo' : 'jogos'}`,
    entry.overall != null ? `GERAL ${entry.overall}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    position: entry.rank,
    playerId: entry.userId,
    name: entry.displayName,
    subtitle,
    score: entry.points,
    photoUrl: entry.photoUrl ?? undefined,
    matches: entry.matches,
    wins: entry.wins,
    votes: entry.votes,
    mvps: entry.mvps,
    breakdown:
      entry.attendancePoints != null
        ? { attendance: entry.attendancePoints, wins: entry.winPoints ?? 0, mvp: entry.mvpPoints ?? 0 }
        : undefined,
    trend: trendOf(entry),
    isMe: entry.userId === userId,
  };
}

export const rankingQueryKey = (params: RankingParams, pageSize: number) =>
  ['ranking', params, pageSize] as const;

export async function getRanking(params: RankingParams, pageSize = FULL_SIZE): Promise<Ranking> {
  const query = new URLSearchParams({ scope: params.scope, page: '1', pageSize: String(pageSize) });
  if (params.groupId) query.set('groupId', params.groupId);
  if (params.position) query.set('position', params.position);
  if (params.season) query.set('season', params.season);
  if (params.sort && params.sort !== 'points') query.set('sort', params.sort);
  const ranking = await authorizedApiClient<ApiRanking>(`/api/v1/rankings?${query}`);
  const userId = useAuthStore.getState().userId;
  return {
    rows: ranking.items.map((entry) => toRankingRow(entry, userId)),
    me: ranking.callerEntry ? toRankingRow(ranking.callerEntry, userId) : null,
    nextUp: ranking.nextUp ? toRankingRow(ranking.nextUp, userId) : null,
    groupName: ranking.groupName,
    groupId: ranking.groupId,
    minMatches: ranking.minMatches,
    seasonStart: ranking.seasonStart,
    seasonEnd: ranking.seasonEnd ?? ranking.seasonStart,
  };
}

export function useRanking(params: RankingParams) {
  return useQuery({
    queryKey: rankingQueryKey(params, FULL_SIZE),
    queryFn: () => getRanking(params),
    enabled: params.scope !== 'group' || Boolean(params.groupId),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

/** The recurring games the player scored in (`GET /api/v1/rankings/groups`), most recent first. */
export function useRankingGroups() {
  return useQuery({
    queryKey: ['ranking', 'groups'] as const,
    queryFn: async () =>
      (await authorizedApiClient<{ groupId: string; name: string }[]>('/api/v1/rankings/groups')).map(
        (g): RankingGroup => ({ id: g.groupId, name: g.name }),
      ),
    staleTime: 60_000,
  });
}

// ── What one match gave me (`GET /rankings/matches/{id}/me`, 204 = nothing) ──

export type MatchPoints = {
  groupId: string;
  points: number;
  attendancePoints: number;
  winPoints: number;
  mvpPoints: number;
  gamesWon: number;
  votes: number;
  mvp: boolean;
};

export function useMatchPoints(matchId: string | undefined) {
  return useQuery({
    queryKey: ['ranking', 'match', matchId] as const,
    queryFn: async () =>
      (await authorizedApiClient<MatchPoints | undefined>(`/api/v1/rankings/matches/${matchId}/me`)) ?? null,
    enabled: Boolean(matchId),
    staleTime: 60_000,
  });
}

// ── Profile tab preview: the top of the network ranking ──

export type GroupRankingParams = { preview: boolean };

export const groupRankingQueryKey = (params: GroupRankingParams) =>
  rankingQueryKey({ scope: 'friends' }, params.preview ? PREVIEW_SIZE : FULL_SIZE);

export async function getGroupRanking(params: GroupRankingParams): Promise<RankingRow[]> {
  return (await getRanking({ scope: 'friends' }, params.preview ? PREVIEW_SIZE : FULL_SIZE)).rows;
}

export function useGroupRanking(params: GroupRankingParams) {
  return useQuery({
    queryKey: groupRankingQueryKey(params),
    queryFn: () => getGroupRanking(params),
    staleTime: 60_000,
  });
}
