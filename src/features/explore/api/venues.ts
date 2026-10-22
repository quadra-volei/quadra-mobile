import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { authorizedApiClient } from '@/lib/api/authorizedClient';

/**
 * Arenas on the map (DECISIONS #145, API DECISIONS #82): the backend finds them on Google Places
 * and keeps only their id and coordinates; the name comes from `GET /places/{id}` when one is
 * tapped. Each has a kind (court, sand, park: API DECISIONS #87) the map filters by.
 */
type ApiVenueMatch = { id: string; name: string; dateTime: string; live: boolean };
type ApiNearbyVenue = {
  placeId: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  matches: ApiVenueMatch[];
  /** Absent on an API from before kinds: a court. */
  kind?: VenueKind;
};

export type VenueKind = 'Court' | 'Sand' | 'Park';

/** The kinds of place, in the order the map's filter lists them, with how they show on pins and chips. */
export const VENUE_KINDS: { kind: VenueKind; label: string; emoji: string }[] = [
  { kind: 'Court', label: 'Quadras', emoji: '🏐' },
  { kind: 'Sand', label: 'Areia', emoji: '🏖️' },
  { kind: 'Park', label: 'Parques', emoji: '🌳' },
];

export const VENUE_KIND_EMOJI: Record<VenueKind, string> = { Court: '🏐', Sand: '🏖️', Park: '🌳' };

/** A public game at the arena today, or one being played now. */
export type VenueMatch = { id: string; name: string; startsAt: string; live: boolean };

export type NearbyVenue = {
  placeId: string;
  lat: number;
  lon: number;
  distanceKm: number;
  matches: VenueMatch[];
  kind: VenueKind;
};

/** The arenas of an area; `hasMore` when the API kept only the closest ones. */
export type NearbyVenues = { venues: NearbyVenue[]; hasMore: boolean };

export type VenueDetails = { title: string; address: string };

export type NearbyVenuesParams = { lat: number; lon: number; radiusKm: number };

async function getNearbyVenues(params: NearbyVenuesParams): Promise<NearbyVenues> {
  const { items, hasMore } = await authorizedApiClient<{ items: ApiNearbyVenue[]; hasMore?: boolean }>(
    `/api/v1/venues/nearby?lat=${params.lat}&lon=${params.lon}&radiusKm=${params.radiusKm}`,
  );
  return {
    hasMore: hasMore ?? false,
    venues: items.map((v) => ({
      placeId: v.placeId,
      lat: v.latitude,
      lon: v.longitude,
      distanceKm: v.distanceKm,
      kind: v.kind ?? 'Court',
      matches: v.matches.map((m) => ({ id: m.id, name: m.name, startsAt: m.dateTime, live: m.live })),
    })),
  };
}

/**
 * Arenas in the area the map shows. Optional on the map: while loading or on error the
 * screen simply has no arena pins.
 */
export function useNearbyVenues(params: NearbyVenuesParams, enabled = true) {
  return useQuery({
    queryKey: ['venues', 'nearby', params] as const,
    queryFn: () => getNearbyVenues(params),
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

/** Name and address of a tapped arena, straight from Google through the backend. */
export function useVenueDetails(placeId: string | null) {
  return useQuery({
    queryKey: ['venues', 'details', placeId] as const,
    queryFn: () =>
      authorizedApiClient<VenueDetails>(`/api/v1/places/${encodeURIComponent(placeId ?? '')}`),
    enabled: placeId !== null,
    // Kept in memory only, never persisted (Google's terms).
    staleTime: 10 * 60_000,
  });
}

/** Ids of the games shown inside an arena pin, so the map does not draw them twice. */
export function matchIdsAtVenues(venues: NearbyVenue[]): Set<string> {
  return new Set(venues.flatMap((v) => v.matches.map((m) => m.id)));
}

/**
 * The known arena at a picked spot (within 100 m, the same distance the API uses to put
 * games under an arena), with its name and address. Null when there is none or on any
 * error: the typed or picked address is still a valid location.
 */
export async function findArenaAt(coords: { latitude: number; longitude: number }): Promise<VenueDetails | null> {
  try {
    const [closest] = (await getNearbyVenues({ lat: coords.latitude, lon: coords.longitude, radiusKm: 0.2 })).venues
      .filter((v) => v.distanceKm <= 0.1)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    if (!closest) return null;
    return await authorizedApiClient<VenueDetails>(`/api/v1/places/${encodeURIComponent(closest.placeId)}`);
  } catch {
    return null;
  }
}
