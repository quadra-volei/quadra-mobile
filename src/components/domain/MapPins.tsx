import type { ImageRequireSource } from 'react-native';

import type { MapArena } from '@/features/explore/api/mapItems';
import type { VenueKind } from '@/features/explore/api/venues';

/*
 * The map's pins, shared by the full map and the Explore preview so both look
 * the same (owner's 4th review, item 1).
 *
 * Every pin is a ready image (`assets/map-pins`, drawn from
 * `scripts/map-pins.html`), not a view (DECISIONS #176). Android draws a view
 * marker into a bitmap once, and with `tracksViewChanges` off (on, it crashed:
 * QUADRA-MOBILE-2, DECISIONS #171) it drew them before their children laid
 * out: half circles and black blobs. An image marker is one bitmap shared by
 * every pin that looks the same, drawn by Google Maps itself, with nothing for
 * React to render inside the map.
 */

/** How an arena pin looks: plain, or green with its game count (red ring while one is played). */
export type VenueActivity = 'none' | 'today' | 'live';

export function venueActivityFor(arena: Pick<MapArena, 'gamesCount' | 'live'>): VenueActivity {
  if (arena.live) return 'live';
  return arena.gamesCount > 0 ? 'today' : 'none';
}

// Index n - 1 holds the pin with n games; the last one reads "5+" (DECISIONS #179).
const VENUE_PINS: Record<VenueKind, { none: ImageRequireSource; games: ImageRequireSource[]; live: ImageRequireSource[] }> = {
  Court: {
    none: require('../../../assets/map-pins/venue-court.png'),
    games: [
      require('../../../assets/map-pins/venue-court-1.png'),
      require('../../../assets/map-pins/venue-court-2.png'),
      require('../../../assets/map-pins/venue-court-3.png'),
      require('../../../assets/map-pins/venue-court-4.png'),
      require('../../../assets/map-pins/venue-court-5plus.png'),
    ],
    live: [
      require('../../../assets/map-pins/venue-court-1-live.png'),
      require('../../../assets/map-pins/venue-court-2-live.png'),
      require('../../../assets/map-pins/venue-court-3-live.png'),
      require('../../../assets/map-pins/venue-court-4-live.png'),
      require('../../../assets/map-pins/venue-court-5plus-live.png'),
    ],
  },
  Sand: {
    none: require('../../../assets/map-pins/venue-sand.png'),
    games: [
      require('../../../assets/map-pins/venue-sand-1.png'),
      require('../../../assets/map-pins/venue-sand-2.png'),
      require('../../../assets/map-pins/venue-sand-3.png'),
      require('../../../assets/map-pins/venue-sand-4.png'),
      require('../../../assets/map-pins/venue-sand-5plus.png'),
    ],
    live: [
      require('../../../assets/map-pins/venue-sand-1-live.png'),
      require('../../../assets/map-pins/venue-sand-2-live.png'),
      require('../../../assets/map-pins/venue-sand-3-live.png'),
      require('../../../assets/map-pins/venue-sand-4-live.png'),
      require('../../../assets/map-pins/venue-sand-5plus-live.png'),
    ],
  },
  Park: {
    none: require('../../../assets/map-pins/venue-park.png'),
    games: [
      require('../../../assets/map-pins/venue-park-1.png'),
      require('../../../assets/map-pins/venue-park-2.png'),
      require('../../../assets/map-pins/venue-park-3.png'),
      require('../../../assets/map-pins/venue-park-4.png'),
      require('../../../assets/map-pins/venue-park-5plus.png'),
    ],
    live: [
      require('../../../assets/map-pins/venue-park-1-live.png'),
      require('../../../assets/map-pins/venue-park-2-live.png'),
      require('../../../assets/map-pins/venue-park-3-live.png'),
      require('../../../assets/map-pins/venue-park-4-live.png'),
      require('../../../assets/map-pins/venue-park-5plus-live.png'),
    ],
  },
};

/**
 * An arena: white with its kind's icon (ball for a court, palm tree for sand, tree for a park),
 * and the number of its games (1–4, then 5+) in a green corner badge when it has any; red ring
 * while one is played.
 * 48 dp square, centred on the coordinate.
 */
export function venuePinImage(arena: Pick<MapArena, 'kind' | 'gamesCount' | 'live'>): ImageRequireSource {
  const pins = VENUE_PINS[arena.kind] ?? VENUE_PINS.Court;
  if (arena.gamesCount <= 0) return pins.none;
  const set = arena.live ? pins.live : pins.games;
  return set[Math.min(arena.gamesCount, set.length) - 1] ?? pins.none;
}

/** The lime ring drawn under the selected arena (same 48 dp box, same centre). */
export const VENUE_HALO: ImageRequireSource = require('../../../assets/map-pins/venue-halo.png');

// Numbers are games, icons are places (designer, DECISIONS #183). Green: the games in a group, or
// "1" for a game with no arena. White: the places in a group with no game. 1–9, then 10+, 20+, 50+, 100+.
const CLUSTER_PINS: { games: Record<number, ImageRequireSource>; places: Record<number, ImageRequireSource> } = {
  games: {
    1: require('../../../assets/map-pins/cluster-games-1.png'),
    2: require('../../../assets/map-pins/cluster-games-2.png'),
    3: require('../../../assets/map-pins/cluster-games-3.png'),
    4: require('../../../assets/map-pins/cluster-games-4.png'),
    5: require('../../../assets/map-pins/cluster-games-5.png'),
    6: require('../../../assets/map-pins/cluster-games-6.png'),
    7: require('../../../assets/map-pins/cluster-games-7.png'),
    8: require('../../../assets/map-pins/cluster-games-8.png'),
    9: require('../../../assets/map-pins/cluster-games-9.png'),
    10: require('../../../assets/map-pins/cluster-games-10.png'),
    20: require('../../../assets/map-pins/cluster-games-20.png'),
    50: require('../../../assets/map-pins/cluster-games-50.png'),
    100: require('../../../assets/map-pins/cluster-games-100.png'),
  },
  places: {
    2: require('../../../assets/map-pins/cluster-places-2.png'),
    3: require('../../../assets/map-pins/cluster-places-3.png'),
    4: require('../../../assets/map-pins/cluster-places-4.png'),
    5: require('../../../assets/map-pins/cluster-places-5.png'),
    6: require('../../../assets/map-pins/cluster-places-6.png'),
    7: require('../../../assets/map-pins/cluster-places-7.png'),
    8: require('../../../assets/map-pins/cluster-places-8.png'),
    9: require('../../../assets/map-pins/cluster-places-9.png'),
    10: require('../../../assets/map-pins/cluster-places-10.png'),
    20: require('../../../assets/map-pins/cluster-places-20.png'),
    50: require('../../../assets/map-pins/cluster-places-50.png'),
    100: require('../../../assets/map-pins/cluster-places-100.png'),
  },
};

const CLUSTER_BUCKETS = [100, 50, 20, 10];

const bucket = (n: number, min: number) => (n < 10 ? Math.max(n, min) : CLUSTER_BUCKETS.find((b) => n >= b)!);

/** The image of a group: green with its games, or white with its places when none has a game. */
export function clusterImage(games: number, places: number): ImageRequireSource {
  return games > 0 ? CLUSTER_PINS.games[bucket(games, 1)]! : CLUSTER_PINS.places[bucket(places, 2)]!;
}

/** A game away from any arena: the green disc with "1", like a group with one game. */
export const MATCH_PIN: ImageRequireSource = CLUSTER_PINS.games[1]!;

/** A 44 dp disc with a 3 dp shadow: the disc's centre on the point (groups and games with no arena). */
export const CLUSTER_ANCHOR = { x: 22 / 47, y: 22 / 47 };
