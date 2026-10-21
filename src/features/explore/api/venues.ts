import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { authorizedApiClient } from '@/lib/api/authorizedClient';

/**
 * Arenas on the map (DECISIONS #145, API DECISIONS #82): the backend finds them on Google Places
 * and keeps only their id and coordinates; the name comes from `GET /places/{id}` when one is
 * tapped. Every arena is "basic" for now.
 */
type ApiVenueMatch = { id: string; name: string; dateTime: string; live: boolean };
type ApiNearbyVenue = {
  placeId: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  matches: ApiVenueMatch[];
};

/** A public game at the arena today, or one being played now. */
export type VenueMatch = { id: string; name: string; startsAt: string; live: boolean };

export type NearbyVenue = {
  placeId: string;
  lat: number;
  lon: number;
  distanceKm: number;
  matches: VenueMatch[];
};

export type VenueDetails = { title: string; address: string };

export type NearbyVenuesParams = { lat: number; lon: number; radiusKm: number };

async function getNearbyVenues(params: NearbyVenuesParams): Promise<NearbyVenue[]> {
  const { items } = await authorizedApiClient<{ items: ApiNearbyVenue[] }>(
    `/api/v1/venues/nearby?lat=${params.lat}&lon=${params.lon}&radiusKm=${params.radiusKm}`,
  );
  return items.map((v) => ({
    placeId: v.placeId,
    lat: v.latitude,
    lon: v.longitude,
    distanceKm: v.distanceKm,
    matches: v.matches.map((m) => ({ id: m.id, name: m.name, startsAt: m.dateTime, live: m.live })),
  }));
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
    const [closest] = (await getNearbyVenues({ lat: coords.latitude, lon: coords.longitude, radiusKm: 0.2 }))
      .filter((v) => v.distanceKm <= 0.1)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    if (!closest) return null;
    return await authorizedApiClient<VenueDetails>(`/api/v1/places/${encodeURIComponent(closest.placeId)}`);
  } catch {
    return null;
  }
}
