import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { MapBox } from '@/features/explore/api/mapItems';
import type { VenueKind } from '@/features/explore/api/venues';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

/**
 * The team's arena curation (DECISIONS #181, API DECISIONS #94). Only the team's accounts reach
 * these routes; the API checks it on every call, the app only hides the entry for everyone else.
 */
type ApiCandidate = {
  placeId: string;
  latitude: number;
  longitude: number;
  kind: VenueKind;
  distanceKm: number;
  gamesNearby: number;
  neighbors: string[];
  expiresAt: string;
};
type ApiArena = { id: string; placeId: string | null; latitude: number; longitude: number; kind: VenueKind };
type ApiCandidates = { candidates: ApiCandidate[]; arenas: ApiArena[]; pendingCount: number; truncated: boolean };

/** A Google place nobody decided on yet. Its name comes from `useVenueDetails(placeId)`, never stored. */
export type Candidate = {
  placeId: string;
  lat: number;
  lon: number;
  /** Which of our searches found it: a guess the reviewer confirms. */
  kind: VenueKind;
  distanceKm: number;
  /** Upcoming public games within 100 m: these come first. */
  gamesNearby: number;
  /** Other pending places within 100 m: probably the same place. */
  neighbors: string[];
  /** When its Google coordinates go (30 days), unless the area is searched again. */
  expiresAt: string;
};

/** An approved arena, to say "it is the same arena as…". */
export type CuratedArena = { id: string; placeId: string | null; lat: number; lon: number; kind: VenueKind };

export type Candidates = { candidates: Candidate[]; arenas: CuratedArena[]; pendingCount: number; truncated: boolean };

export function toCandidates(api: ApiCandidates): Candidates {
  return {
    candidates: api.candidates.map((c) => ({
      placeId: c.placeId,
      lat: c.latitude,
      lon: c.longitude,
      kind: c.kind,
      distanceKm: c.distanceKm,
      gamesNearby: c.gamesNearby,
      neighbors: c.neighbors,
      expiresAt: c.expiresAt,
    })),
    arenas: api.arenas.map((a) => ({ id: a.id, placeId: a.placeId, lat: a.latitude, lon: a.longitude, kind: a.kind })),
    pendingCount: api.pendingCount,
    truncated: api.truncated,
  };
}

/** Whether this account is on the team: the entry to curation shows only then. */
export function useAdminAccess() {
  return useQuery({
    queryKey: ['admin', 'access'] as const,
    queryFn: async () => (await authorizedApiClient<{ admin: boolean }>('/api/v1/admin/access')).admin,
    staleTime: 10 * 60_000,
  });
}

export type CandidatesParams = MapBox & { lat: number; lon: number };

export function useCandidates(params: CandidatesParams, enabled = true) {
  return useQuery({
    queryKey: ['curation', 'candidates', params] as const,
    queryFn: async () => {
      const query = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)] as [string, string]),
      );
      return toCandidates(await authorizedApiClient<ApiCandidates>(`/api/v1/admin/arenas/candidates?${query}`));
    },
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

/** One decision on a candidate (API DECISIONS #94). */
export type Decision =
  | { action: 'Approve'; placeId: string; kind: VenueKind; latitude: number; longitude: number; pinMoved: boolean }
  | { action: 'Reject'; placeId: string }
  | { action: 'Link'; placeId: string; arenaId: string };

/** After a decision or an undo, the candidates and the map (an approved arena shows there) reload. */
function useRefreshCuration() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['curation'] });
    void queryClient.invalidateQueries({ queryKey: ['map'] });
  };
}

export function useDecide() {
  const refresh = useRefreshCuration();
  return useMutation({
    mutationFn: (decision: Decision) =>
      authorizedApiClient<{ arenaId: string | null }>('/api/v1/admin/arenas/decisions', {
        method: 'POST',
        body: JSON.stringify(decision),
      }),
    onSuccess: refresh,
  });
}

export function useUndoDecision() {
  const refresh = useRefreshCuration();
  return useMutation({
    mutationFn: (placeId: string) =>
      authorizedApiClient<void>(`/api/v1/admin/arenas/decisions/${encodeURIComponent(placeId)}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
}

/** Searches Google around a point (paid: the team asks for it). Resolves with how many grid cells were searched. */
export function useDiscover() {
  const refresh = useRefreshCuration();
  return useMutation({
    mutationFn: async (area: { lat: number; lon: number; radiusKm: number }) =>
      (await authorizedApiClient<{ cellsSearched: number }>('/api/v1/admin/arenas/discover', {
        method: 'POST',
        body: JSON.stringify(area),
      })).cellsSearched,
    onSuccess: refresh,
  });
}

/** Opens the place on Google Maps (the browser or app; free), to check it before deciding. */
export function googleMapsUrl(candidate: Pick<Candidate, 'lat' | 'lon' | 'placeId'>): string {
  return `https://www.google.com/maps/search/?api=1&query=${candidate.lat},${candidate.lon}&query_place_id=${encodeURIComponent(candidate.placeId)}`;
}
