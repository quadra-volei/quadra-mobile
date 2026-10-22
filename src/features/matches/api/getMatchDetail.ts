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
async function getMatchDetail(id: string, inviteCode?: string): Promise<MatchDetail> {
  return toMatchDetail(await fetchMatchDetail(id, inviteCode), useAuthStore.getState().userId);
}

// How often an open match screen re-reads the match, so what the organizer
// does (guests, teams, starting the game) reaches everyone looking at it.
// ponytail: polling, not a push; a "MatchUpdated" message on the SignalR match
// room (like ScoreboardUpdated) would make it instant if 10 s is not enough.
export const MATCH_REFRESH_MS = 10_000;

/** Still changing: not cancelled and the summary not generated yet. */
function isOngoing(match: MatchDetail | undefined): boolean {
  return !!match && !match.cancelled && match.game !== 'SUMMARY';
}

/**
 * `inviteCode` comes from an invite link: it lets a private match show before
 * joining. `live`: re-read every MATCH_REFRESH_MS while the match is ongoing
 * (the match screen passes it while it is in view).
 */
export function useMatchDetail(id: string, inviteCode?: string, { live = false } = {}) {
  return useQuery({
    queryKey: matchDetailQueryKey(id),
    queryFn: () => getMatchDetail(id, inviteCode),
    enabled: id.length > 0,
    staleTime: 60_000,
    refetchInterval: (query) => (live && isOngoing(query.state.data) ? MATCH_REFRESH_MS : false),
  });
}
