import type { ImageRequireSource } from 'react-native';

import type { NearbyVenue, VenueKind } from '@/features/explore/api/venues';

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

export function venueActivityFor(games: NearbyVenue['matches']): VenueActivity {
  if (games.some((m) => m.live)) return 'live';
  return games.length > 0 ? 'today' : 'none';
}

// Index n - 1 holds the pin with n games; the last one reads "9+".
const VENUE_PINS: Record<VenueKind, { none: ImageRequireSource; today: ImageRequireSource[]; live: ImageRequireSource[] }> = {
  Court: {
    none: require('../../../assets/map-pins/venue-court.png'),
    today: [
      require('../../../assets/map-pins/venue-court-1.png'),
      require('../../../assets/map-pins/venue-court-2.png'),
      require('../../../assets/map-pins/venue-court-3.png'),
      require('../../../assets/map-pins/venue-court-4.png'),
      require('../../../assets/map-pins/venue-court-5.png'),
      require('../../../assets/map-pins/venue-court-6.png'),
      require('../../../assets/map-pins/venue-court-7.png'),
      require('../../../assets/map-pins/venue-court-8.png'),
      require('../../../assets/map-pins/venue-court-9.png'),
      require('../../../assets/map-pins/venue-court-10.png'),
    ],
    live: [
      require('../../../assets/map-pins/venue-court-1-live.png'),
      require('../../../assets/map-pins/venue-court-2-live.png'),
      require('../../../assets/map-pins/venue-court-3-live.png'),
      require('../../../assets/map-pins/venue-court-4-live.png'),
      require('../../../assets/map-pins/venue-court-5-live.png'),
      require('../../../assets/map-pins/venue-court-6-live.png'),
      require('../../../assets/map-pins/venue-court-7-live.png'),
      require('../../../assets/map-pins/venue-court-8-live.png'),
      require('../../../assets/map-pins/venue-court-9-live.png'),
      require('../../../assets/map-pins/venue-court-10-live.png'),
    ],
  },
  Sand: {
    none: require('../../../assets/map-pins/venue-sand.png'),
    today: [
      require('../../../assets/map-pins/venue-sand-1.png'),
      require('../../../assets/map-pins/venue-sand-2.png'),
      require('../../../assets/map-pins/venue-sand-3.png'),
      require('../../../assets/map-pins/venue-sand-4.png'),
      require('../../../assets/map-pins/venue-sand-5.png'),
      require('../../../assets/map-pins/venue-sand-6.png'),
      require('../../../assets/map-pins/venue-sand-7.png'),
      require('../../../assets/map-pins/venue-sand-8.png'),
      require('../../../assets/map-pins/venue-sand-9.png'),
      require('../../../assets/map-pins/venue-sand-10.png'),
    ],
    live: [
      require('../../../assets/map-pins/venue-sand-1-live.png'),
      require('../../../assets/map-pins/venue-sand-2-live.png'),
      require('../../../assets/map-pins/venue-sand-3-live.png'),
      require('../../../assets/map-pins/venue-sand-4-live.png'),
      require('../../../assets/map-pins/venue-sand-5-live.png'),
      require('../../../assets/map-pins/venue-sand-6-live.png'),
      require('../../../assets/map-pins/venue-sand-7-live.png'),
      require('../../../assets/map-pins/venue-sand-8-live.png'),
      require('../../../assets/map-pins/venue-sand-9-live.png'),
      require('../../../assets/map-pins/venue-sand-10-live.png'),
    ],
  },
  Park: {
    none: require('../../../assets/map-pins/venue-park.png'),
    today: [
      require('../../../assets/map-pins/venue-park-1.png'),
      require('../../../assets/map-pins/venue-park-2.png'),
      require('../../../assets/map-pins/venue-park-3.png'),
      require('../../../assets/map-pins/venue-park-4.png'),
      require('../../../assets/map-pins/venue-park-5.png'),
      require('../../../assets/map-pins/venue-park-6.png'),
      require('../../../assets/map-pins/venue-park-7.png'),
      require('../../../assets/map-pins/venue-park-8.png'),
      require('../../../assets/map-pins/venue-park-9.png'),
      require('../../../assets/map-pins/venue-park-10.png'),
    ],
    live: [
      require('../../../assets/map-pins/venue-park-1-live.png'),
      require('../../../assets/map-pins/venue-park-2-live.png'),
      require('../../../assets/map-pins/venue-park-3-live.png'),
      require('../../../assets/map-pins/venue-park-4-live.png'),
      require('../../../assets/map-pins/venue-park-5-live.png'),
      require('../../../assets/map-pins/venue-park-6-live.png'),
      require('../../../assets/map-pins/venue-park-7-live.png'),
      require('../../../assets/map-pins/venue-park-8-live.png'),
      require('../../../assets/map-pins/venue-park-9-live.png'),
      require('../../../assets/map-pins/venue-park-10-live.png'),
    ],
  },};

/**
 * An arena: green with the number of games (9+) and its kind (🏐 court, 🏖️ sand,
 * 🌳 park) in a corner badge, red ring while one is played; white with its kind
 * when it has none. 48 dp square, centred on the coordinate.
 */
export function venuePinImage(venue: NearbyVenue, games: number): ImageRequireSource {
  const pins = VENUE_PINS[venue.kind] ?? VENUE_PINS.Court;
  if (games <= 0) return pins.none;
  const set = venueActivityFor(venue.matches) === 'live' ? pins.live : pins.today;
  return set[Math.min(games, set.length) - 1] ?? pins.none;
}

/** The lime ring drawn under the selected arena (same 48 dp box, same centre). */
export const VENUE_HALO: ImageRequireSource = require('../../../assets/map-pins/venue-halo.png');

// A game away from any arena: a drop (square with three round corners turned
// 45°, sharp corner down) with a navy shadow shifted like HARD_SHADOW.
const PIN_HEAD = 32;
const PIN_SHADOW = 3;
const PIN_TIP_Y = PIN_HEAD / 2 + PIN_HEAD * Math.SQRT1_2;
const PIN_WIDTH = PIN_HEAD + PIN_SHADOW;
const PIN_HEIGHT = Math.ceil(PIN_TIP_Y) + PIN_SHADOW;
/** Puts the tip, not the middle of the image, on the coordinate. */
export const MATCH_PIN_ANCHOR = { x: PIN_HEAD / 2 / PIN_WIDTH, y: PIN_TIP_Y / PIN_HEIGHT };
/** Apple Maps ignores `anchor`: it shifts the image from its centre instead. */
export const MATCH_PIN_CENTER_OFFSET = { x: PIN_WIDTH / 2 - PIN_HEAD / 2, y: PIN_HEIGHT / 2 - PIN_TIP_Y };

const MATCH_PINS = {
  open: require('../../../assets/map-pins/match-open.png') as ImageRequireSource,
  last: require('../../../assets/map-pins/match-last.png') as ImageRequireSource,
  full: require('../../../assets/map-pins/match-full.png') as ImageRequireSource,
};

/** Drop fill by open slots: lime with spots, amber on the last one, grey when full. */
export function matchPinImage(openSlots: number): ImageRequireSource {
  if (openSlots <= 0) return MATCH_PINS.full;
  if (openSlots === 1) return MATCH_PINS.last;
  return MATCH_PINS.open;
}

// A group of nearby places (DECISIONS #177): green with its games, white with
// its places when none has a game. 1–9, then 10+, 20+, 50+, 100+.
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

/** The image of a group: its games when it has any, else its number of places. */
export function clusterImage(games: number, places: number): ImageRequireSource {
  const n = games > 0 ? games : places;
  const key = n < 10 ? Math.max(n, 1) : CLUSTER_BUCKETS.find((b) => n >= b)!;
  return games > 0 ? CLUSTER_PINS.games[key]! : (CLUSTER_PINS.places[key] ?? CLUSTER_PINS.places[2]!);
}

/** A 44 dp disc with a 3 dp shadow: the disc's centre on the point. */
export const CLUSTER_ANCHOR = { x: 22 / 47, y: 22 / 47 };
