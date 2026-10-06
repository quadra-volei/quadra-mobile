import { useQuery } from '@tanstack/react-query';

import { fetchNearbyMatches, toNearbyMatch } from '@/features/matches/api/matchesApi';
import type { NearbyMatch } from '@/features/matches/types/match';

/** Centre and radius of the search. The backend caps the radius at 50 km. */
export type NearbyMatchesParams = {
  lat: number;
  lon: number;
  radiusKm: number;
};

/** Query key (ARCHITECTURE convention). */
export const nearbyMatchesQueryKey = (params: NearbyMatchesParams) =>
  ['matches', 'nearby', params] as const;

/**
 * Fetches the open matches happening near a point
 * (`GET /api/v1/matches/nearby`), closest first. Private matches are never listed.
 */
async function getNearbyMatches(params: NearbyMatchesParams): Promise<NearbyMatch[]> {
  return (await fetchNearbyMatches(params)).map(toNearbyMatch);
}

export type UseNearbyMatchesOptions = {
  /** @deprecated No effect — kept so existing callers compile. The query is real now. */
  latencyMs?: number;
};

export function useNearbyMatches(
  params: NearbyMatchesParams,
  _options: UseNearbyMatchesOptions = {},
) {
  return useQuery({
    queryKey: nearbyMatchesQueryKey(params),
    queryFn: () => getNearbyMatches(params),
    staleTime: 60_000,
  });
}
