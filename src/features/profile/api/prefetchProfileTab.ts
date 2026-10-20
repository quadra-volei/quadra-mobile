import type { QueryClient } from '@tanstack/react-query';

import { getMyProfile, myProfileQueryKey } from '@/features/profile/api/getMyProfile';
import {
  getRecentMatches,
  recentMatchesQueryKey,
} from '@/features/profile/api/getRecentMatches';
import {
  getGroupRanking,
  groupRankingQueryKey,
} from '@/features/ranking/api/getGroupRanking';

/**
 * Loads what the profile tab shows (profile, recent matches, ranking preview)
 * before the tab is opened, so it renders from the cache instead of starting
 * its requests on first open. `prefetchQuery` never throws; the screen's own
 * queries retry and show their error state.
 */
export function prefetchProfileTab(queryClient: QueryClient): void {
  const preview = { preview: true };
  void queryClient.prefetchQuery({ queryKey: myProfileQueryKey, queryFn: getMyProfile });
  void queryClient.prefetchQuery({
    queryKey: recentMatchesQueryKey,
    queryFn: getRecentMatches,
  });
  void queryClient.prefetchQuery({
    queryKey: groupRankingQueryKey(preview),
    queryFn: () => getGroupRanking(preview),
  });
}
