import { useQuery } from '@tanstack/react-query';

import { authorizedApiClient } from '@/lib/api/authorizedClient';

/**
 * Arenas' kinds and names (DECISIONS #145, #179; API DECISIONS #87, #93). The arenas themselves
 * come from the map's request (`mapItems.ts`); their name comes from Google through the backend
 * when one is tapped, and is never stored.
 */
export type VenueKind = 'Court' | 'Sand' | 'Park';

/** The kinds of place, in the order the map's filter lists them, with how they show on pins and chips. */
export const VENUE_KINDS: { kind: VenueKind; label: string; emoji: string }[] = [
  { kind: 'Court', label: 'Quadras', emoji: '🏐' },
  { kind: 'Sand', label: 'Areia', emoji: '🏖️' },
  { kind: 'Park', label: 'Parques', emoji: '🌳' },
];

export type VenueDetails = { title: string; address: string };

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

type ApiNearbyArena = { id: string; placeId: string | null; distanceMeters: number; kind: VenueKind; linked: boolean };

/**
 * The approved arena to ask about for a place picked in the match form ("É no …?", API DECISIONS
 * #92), with its name. Null when the place is itself one of an arena's entries (the API links the
 * game on its own), when no approved arena is within 100 m, or on any error: the place alone is
 * still a valid location. The name is only shown, never saved (Google's terms).
 */
export async function findArenaToConfirm(
  coords: { latitude: number; longitude: number },
  placeId?: string,
): Promise<{ id: string; name: string } | null> {
  try {
    const query = new URLSearchParams({ lat: String(coords.latitude), lon: String(coords.longitude) });
    if (placeId) query.set('placeId', placeId);
    const { items } = await authorizedApiClient<{ items: ApiNearbyArena[] }>(`/api/v1/arenas/near?${query}`);
    const [first] = items;
    if (!first || first.linked || !first.placeId) return null;
    const details = await authorizedApiClient<VenueDetails>(`/api/v1/places/${encodeURIComponent(first.placeId)}`);
    return { id: first.id, name: details.title };
  } catch {
    return null;
  }
}
