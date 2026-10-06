import { useQuery } from '@tanstack/react-query';

import { fetchMyMatches, toUpcomingMatch } from '@/features/matches/api/matchesApi';
import type { UpcomingMatch } from '@/features/matches/types/match';

/** Query key (ARCHITECTURE convention). */
export const upcomingMatchesQueryKey = ['matches', 'upcoming'] as const;

/**
 * Fetches the current user's upcoming matches (`GET /api/v1/matches/mine`): the
 * ones they organize or joined, soonest first.
 */
async function getUpcomingMatches(): Promise<UpcomingMatch[]> {
  return (await fetchMyMatches()).map(toUpcomingMatch);
}

export function useUpcomingMatches() {
  return useQuery({
    queryKey: upcomingMatchesQueryKey,
    queryFn: getUpcomingMatches,
  });
}
