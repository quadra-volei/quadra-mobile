import { Text, View } from 'react-native';

import { VENUE_KIND_EMOJI, type NearbyVenue } from '@/features/explore/api/venues';
import { colors } from '@/theme/colors';

/*
 * The map's pins, shared by the full map and the Explore preview so both look
 * the same (owner's 4th review, item 1).
 *
 * Android draws a marker's view into a bitmap. These pins are plain views and
 * text only — no SVG icons, no images — so the bitmap is complete on the first
 * draw, and the markers never need `tracksViewChanges`: tracking made
 * react-native-maps redraw pins on a timer while views mounted, which crashed
 * the app (ConcurrentModificationException, QUADRA-MOBILE-2; DECISIONS #171).
 * Whatever changes a pin's look goes into its `key` (`venuePinKey`), so a
 * change mounts a fresh marker instead of redrawing one.
 */

/** How an arena pin looks: plain, or green with its game count (red ring while one is played). */
export type VenueActivity = 'none' | 'today' | 'live';

export function venueActivityFor(games: NearbyVenue['matches']): VenueActivity {
  if (games.some((m) => m.live)) return 'live';
  return games.length > 0 ? 'today' : 'none';
}

const VENUE_SIZE = 34;
/** The arena pin's box: the circle plus room for the kind badge. */
export const VENUE_PIN_BOX = VENUE_SIZE + 12;

/** Everything a venue pin shows; a new value means a new marker. */
export function venuePinKey(venue: NearbyVenue, games: number, selected: boolean): string {
  return `${venue.placeId}:${venue.kind}:${games}:${venueActivityFor(venue.matches)}:${selected ? 1 : 0}`;
}

/**
 * An arena: green with the number of games (the "has games" signal), white with
 * its kind when it has none; its kind (🏐 court, 🏖️ sand, 🌳 park) in a corner
 * badge; a lime ring when selected.
 */
export function VenuePin({
  venue,
  games,
  selected = false,
  testID,
}: {
  venue: NearbyVenue;
  /** Games shown for it (the filters may hide some). */
  games: number;
  selected?: boolean;
  testID?: string;
}) {
  const activity = games > 0 ? venueActivityFor(venue.matches) : 'none';
  const size = selected ? VENUE_SIZE + 6 : VENUE_SIZE;
  return (
    <View
      style={{ width: VENUE_PIN_BOX + 6, height: VENUE_PIN_BOX + 6 }}
      className="items-center justify-center"
      testID={testID}
    >
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          borderWidth: selected ? 3 : 2,
          // Inline colors: a toggled className is not applied reliably (DECISIONS #87).
          borderColor: selected ? colors.accent : activity === 'live' ? colors.danger : colors.surfaceDark,
          backgroundColor: games > 0 ? colors.success : colors.textOnDark,
        }}
      >
        {games > 0 ? (
          <Text className="font-num" style={{ color: colors.textOnDark, fontSize: 15, lineHeight: 18 }}>
            {games > 9 ? '9+' : games}
          </Text>
        ) : (
          <Text style={{ fontSize: 15, lineHeight: 18 }}>{VENUE_KIND_EMOJI[venue.kind]}</Text>
        )}
      </View>
      {games > 0 ? (
        <View
          className="absolute items-center justify-center rounded-full border-2 border-surface-dark bg-white"
          style={{ width: 20, height: 20, right: 2, top: 2 }}
        >
          <Text style={{ fontSize: 10, lineHeight: 12 }}>{VENUE_KIND_EMOJI[venue.kind]}</Text>
        </View>
      ) : null}
    </View>
  );
}

// A game away from any arena: a drop (square with three round corners turned
// 45°, sharp corner down) with a navy shadow shifted like HARD_SHADOW.
const PIN_HEAD = 32;
const PIN_SHADOW = 3;
const PIN_TIP_Y = PIN_HEAD / 2 + PIN_HEAD * Math.SQRT1_2;
const PIN_WIDTH = PIN_HEAD + PIN_SHADOW;
const PIN_HEIGHT = Math.ceil(PIN_TIP_Y) + PIN_SHADOW;
/** Puts the tip, not the middle of the view, on the coordinate. */
export const MATCH_PIN_ANCHOR = { x: PIN_HEAD / 2 / PIN_WIDTH, y: PIN_TIP_Y / PIN_HEIGHT };
/** Apple Maps ignores `anchor`: it shifts the view from its centre instead. */
export const MATCH_PIN_CENTER_OFFSET = { x: PIN_WIDTH / 2 - PIN_HEAD / 2, y: PIN_HEIGHT / 2 - PIN_TIP_Y };

/** Pin fill by open slots: lime with spots, amber on the last one, grey when full. */
export function pinColorFor(openSlots: number): string {
  if (openSlots <= 0) return colors.textMuted;
  if (openSlots === 1) return colors.warning;
  return colors.accent;
}

export function MatchPin({ openSlots, testID }: { openSlots: number; testID?: string }) {
  const shape = { position: 'absolute' as const, width: PIN_HEAD, height: PIN_HEAD, borderRadius: PIN_HEAD / 2, borderBottomRightRadius: 0, transform: [{ rotate: '45deg' }] };
  return (
    <View style={{ width: PIN_WIDTH, height: PIN_HEIGHT }} testID={testID}>
      <View style={[shape, { left: PIN_SHADOW, top: PIN_SHADOW, backgroundColor: colors.surfaceDark }]} />
      <View
        testID={testID ? testID + '-head' : undefined}
        style={[shape, { borderWidth: 2, borderColor: colors.surfaceDark, backgroundColor: pinColorFor(openSlots), alignItems: 'center', justifyContent: 'center' }]}
      >
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surfaceDark }} />
      </View>
    </View>
  );
}
