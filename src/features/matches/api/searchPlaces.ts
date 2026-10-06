import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { Coords } from '@/features/matches/api/matchesApi';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

/** Backend address search (Geo module): a proxy over Google Places / OpenStreetMap. */
const PLACES_PATH = '/api/v1/places';

/** The backend refuses shorter queries. */
const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 350;

/**
 * One suggested venue/address. `latitude`/`longitude` are null when the
 * provider only gives them on the details call (`resolvePlace`).
 */
export type PlaceSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  latitude: number | null;
  longitude: number | null;
};

/** Text shown in the LOCAL field (and stored as the match address) once picked. */
export function placeLabel(place: PlaceSuggestion): string {
  return place.subtitle ? `${place.title} · ${place.subtitle}` : place.title;
}

/**
 * One id per typing session, sent with every keystroke and with the final
 * details call (Google bills that whole session as a single request).
 */
export function newPlaceSessionToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function useDebounced(value: string): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}

/**
 * Suggestions for what the user typed so far (`GET /places/autocomplete`),
 * debounced, closest to `near` first. Disabled until there is enough text. A
 * failed search simply yields no suggestions: the typed text is still a valid
 * location.
 */
export function usePlaceSuggestions(
  text: string,
  options: { near: Coords | null; sessionToken: string; enabled?: boolean },
) {
  const query = useDebounced(text.trim());
  const { near, sessionToken } = options;
  return useQuery({
    queryKey: ['places', query, near?.latitude, near?.longitude] as const,
    queryFn: async () => {
      const params = [
        `q=${encodeURIComponent(query)}`,
        near ? `lat=${near.latitude}&lon=${near.longitude}` : null,
        `sessionToken=${sessionToken}`,
      ].filter(Boolean);
      const { items } = await authorizedApiClient<{ items: PlaceSuggestion[] }>(
        `${PLACES_PATH}/autocomplete?${params.join('&')}`,
      );
      return items;
    },
    enabled: (options.enabled ?? true) && query.length >= MIN_QUERY_LENGTH,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/**
 * The coordinates of a picked suggestion: its own, or the ones from
 * `GET /places/{id}`. Null when they cannot be resolved — the match is then
 * created with the typed text only.
 */
export async function resolvePlace(
  place: PlaceSuggestion,
  sessionToken: string,
): Promise<Coords | null> {
  if (place.latitude != null && place.longitude != null) {
    return { latitude: place.latitude, longitude: place.longitude };
  }
  try {
    const details = await authorizedApiClient<Coords>(
      `${PLACES_PATH}/${encodeURIComponent(place.id)}?sessionToken=${sessionToken}`,
    );
    return { latitude: details.latitude, longitude: details.longitude };
  } catch {
    return null;
  }
}
