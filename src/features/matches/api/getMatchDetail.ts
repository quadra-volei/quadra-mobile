import { useQuery } from '@tanstack/react-query';

import { fetchMatchDetail, toMatchDetail } from '@/features/matches/api/matchesApi';
import type { MatchDetail } from '@/features/matches/types/matchDetail';
import { useAuthStore } from '@/stores/auth';

/** Query key (ARCHITECTURE convention): ['matches', id, 'detail']. */
export const matchDetailQueryKey = (id: string) =>
  ['matches', id, 'detail'] as const;

/**
 * Reads a single match's full detail (`GET /api/v1/matches/{id}/detail`): the
 * match, its organizer, the roster with guests, and the signed-in user's own
 * standing (presence, waiting-list position, whether they may join).
 */
async function getMatchDetail(id: string): Promise<MatchDetail> {
  return toMatchDetail(await fetchMatchDetail(id), useAuthStore.getState().userId);
}

export function useMatchDetail(id: string) {
  return useQuery({
    queryKey: matchDetailQueryKey(id),
    queryFn: () => getMatchDetail(id),
    enabled: id.length > 0,
    staleTime: 60_000,
  });
}
