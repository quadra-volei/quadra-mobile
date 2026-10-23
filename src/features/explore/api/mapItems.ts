import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { VenueKind } from '@/features/explore/api/venues';
import { type ApiNearbyMatch, toNearbyMatch } from '@/features/matches/api/matchesApi';
import type { NearbyMatch } from '@/features/matches/types/match';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

/**
 * The map and its Explore preview (DECISIONS #179, API DECISIONS #93): one request per
 * rectangle gives the approved arenas with their games and the public games with no arena.
 * The API resolves which game is at which arena (`matches.arena_id`), so a game is drawn once:
 * inside its arena's pin, or as its own pin. Games of the next 7 days, plus the ones being played.
 */
type ApiArenaGame = {
  id: string;
  name: string;
  dateTime: string;
  live: boolean;
  full: boolean;
  confirmedCount: number;
  maxPlayers: number;
};
type ApiMapArena = {
  id: string;
  placeId: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
  kind: VenueKind;
  gamesCount: number;
  live: boolean;
  nextGames: ApiArenaGame[];
};
type ApiMapItems = {
  arenas: ApiMapArena[];
  games: ApiNearbyMatch[];
  arenaCount: number;
  gameCount: number;
  truncated: boolean;
};
type ApiArenaDetail = {
  id: string;
  placeId: string | null;
  latitude: number;
  longitude: number;
  kind: VenueKind;
  games: ApiArenaGame[];
};

/** A game at an arena: being played, or coming up (lotada = full, waiting list only). */
export type ArenaGame = {
  id: string;
  name: string;
  startsAt: string;
  live: boolean;
  full: boolean;
  confirmed: number;
  capacity: number;
};

/** An approved arena. Its name comes from Google on tap (`useVenueDetails(placeId)`), never stored. */
export type MapArena = {
  id: string;
  placeId: string | null;
  lat: number;
  lon: number;
  distanceKm: number;
  kind: VenueKind;
  /** Its games in the window: the pin's badge (1–4, then 5+). */
  gamesCount: number;
  live: boolean;
  /** Being played first, then the next ones; at most 3 (`useArenaDetail` has them all). */
  games: ArenaGame[];
};

export type MapItems = {
  arenas: MapArena[];
  /** Games with no arena, as Explore's cards. */
  games: NearbyMatch[];
  /** Over the whole rectangle, also what the API left out (`truncated`). */
  arenaCount: number;
  gameCount: number;
  truncated: boolean;
};

/** A rectangle in degrees. */
export type MapBox = { south: number; west: number; north: number; east: number };

/** What the API accepts across, each way (API DECISIONS #93). */
export const MAX_BOX_DEGREES = 2;

const toGame = (g: ApiArenaGame): ArenaGame => ({
  id: g.id,
  name: g.name,
  startsAt: g.dateTime,
  live: g.live,
  full: g.full,
  confirmed: g.confirmedCount,
  capacity: g.maxPlayers,
});

export function toMapItems(api: ApiMapItems): MapItems {
  return {
    arenas: api.arenas.map((a) => ({
      id: a.id,
      placeId: a.placeId,
      lat: a.latitude,
      lon: a.longitude,
      distanceKm: a.distanceKm,
      kind: a.kind,
      gamesCount: a.gamesCount,
      live: a.live,
      games: a.nextGames.map(toGame),
    })),
    games: api.games.map(toNearbyMatch),
    arenaCount: api.arenaCount,
    gameCount: api.gameCount,
    truncated: api.truncated,
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * The rectangle the map and the Explore preview open with: about 11 km around the user, so the
 * map's first look comes from the preview's cache.
 */
export function initialMapBox(center: { latitude: number; longitude: number }): MapBox {
  return {
    south: round(center.latitude - 0.1),
    west: round(center.longitude - 0.1),
    north: round(center.latitude + 0.1),
    east: round(center.longitude + 0.1),
  };
}

/**
 * The rectangle to load for what the map shows: the loaded one while it still covers the view,
 * so panning and zooming inside it cost no request; else the view plus half its size on every
 * side (at most `MAX_BOX_DEGREES` across), on a 0.01° grid so close views share a request.
 * `truncated`: the loaded one hit the API's limits, so zooming well into it loads again.
 */
export function boxToFetch(loaded: MapBox, view: MapBox, truncated = false): MapBox {
  const covers =
    loaded.south <= view.south && loaded.west <= view.west && loaded.north >= view.north && loaded.east >= view.east;
  const zoomedIn = (view.north - view.south) * 2 < loaded.north - loaded.south;
  if (covers && !(truncated && zoomedIn)) return loaded;

  const half = (span: number) => Math.min(span * 2, MAX_BOX_DEGREES) / 2;
  const lat = (view.south + view.north) / 2;
  const lon = (view.west + view.east) / 2;
  const dLat = half(view.north - view.south);
  const dLon = half(view.east - view.west);
  return {
    south: Math.floor((lat - dLat) * 100) / 100,
    west: Math.floor((lon - dLon) * 100) / 100,
    north: Math.ceil((lat + dLat) * 100) / 100,
    east: Math.ceil((lon + dLon) * 100) / 100,
  };
}

export type MapItemsParams = MapBox & {
  /** Only these kinds of arena; all when empty. A game with no arena is not a kind, so it hides. */
  kinds: VenueKind[];
  /** Where the user is: the list's order by distance. */
  lat: number;
  lon: number;
};

async function getMapItems(params: MapItemsParams): Promise<MapItems> {
  const query = new URLSearchParams({
    south: String(params.south),
    west: String(params.west),
    north: String(params.north),
    east: String(params.east),
    lat: String(params.lat),
    lon: String(params.lon),
  });
  if (params.kinds.length > 0) query.set('kinds', params.kinds.join(','));
  return toMapItems(await authorizedApiClient<ApiMapItems>(`/api/v1/map/items?${query}`));
}

export function useMapItems(params: MapItemsParams, enabled = true) {
  return useQuery({
    queryKey: ['map', 'items', params] as const,
    queryFn: () => getMapItems(params),
    enabled,
    staleTime: 60_000,
    // Keep the pins on screen while another area loads.
    placeholderData: keepPreviousData,
  });
}

/** Every upcoming public game of an arena, for its card (no screen of its own in v1: D9). */
export function useArenaDetail(arenaId: string | null) {
  return useQuery({
    queryKey: ['map', 'arena', arenaId] as const,
    queryFn: async () =>
      (await authorizedApiClient<ApiArenaDetail>(`/api/v1/arenas/${encodeURIComponent(arenaId ?? '')}`)).games.map(toGame),
    enabled: arenaId !== null,
    staleTime: 60_000,
  });
}
