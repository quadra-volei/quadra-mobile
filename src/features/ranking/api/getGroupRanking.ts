import { useQuery } from '@tanstack/react-query';

import { positionLabel, type Position } from '@/features/profile/schema/onboarding';
import type { RankingRow } from '@/features/ranking/types/ranking';
import { authorizedApiClient } from '@/lib/api/authorizedClient';
import { useAuthStore } from '@/stores/auth';

/**
 * `preview` asks for the short list shown on the profile tab; otherwise the
 * full ranking screen.
 */
export type GroupRankingParams = {
  preview: boolean;
};

/** Query key (ARCHITECTURE convention). */
export const groupRankingQueryKey = (params: GroupRankingParams) =>
  ['ranking', 'group', params] as const;

const PREVIEW_SIZE = 4;
const FULL_SIZE = 50; // the backend's page-size cap

type ApiRankingEntry = {
  rank: number;
  userId: string;
  totalPoints: number;
  displayName: string | null;
  handle: string | null;
  position: string | null;
};

type ApiRanking = { items: ApiRankingEntry[] };

export function toRankingRow(entry: ApiRankingEntry, userId: string | null): RankingRow {
  const subtitle = [
    entry.handle ? `@${entry.handle}` : null,
    positionLabel((entry.position ?? undefined) as Position | undefined),
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    position: entry.rank,
    playerId: entry.userId,
    name: entry.displayName ?? 'Jogador',
    subtitle,
    score: entry.totalPoints,
    isMe: entry.userId === userId,
  };
}

/**
 * Fetches the ranking of the group the user plays in
 * (`GET /api/v1/rankings/mine`): the recurring match where they scored most
 * recently. Empty until they finish a recurring match — the backend answers
 * 204 then.
 */
async function getGroupRanking(params: GroupRankingParams): Promise<RankingRow[]> {
  const ranking = await authorizedApiClient<ApiRanking | undefined>(
    `/api/v1/rankings/mine?page=1&pageSize=${params.preview ? PREVIEW_SIZE : FULL_SIZE}`,
  );
  const userId = useAuthStore.getState().userId;
  return (ranking?.items ?? []).map((entry) => toRankingRow(entry, userId));
}

export type UseGroupRankingOptions = {
  /** @deprecated No effect — kept so existing callers compile. The query is real now. */
  latencyMs?: number;
};

export function useGroupRanking(
  params: GroupRankingParams,
  _options: UseGroupRankingOptions = {},
) {
  return useQuery({
    queryKey: groupRankingQueryKey(params),
    queryFn: () => getGroupRanking(params),
    staleTime: 60_000,
  });
}
