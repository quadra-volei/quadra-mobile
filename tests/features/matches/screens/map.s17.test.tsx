/**
 * S17 — Map of Nearby Matches tests (`app/explore/map.tsx`).
 *
 * Covers every acceptance criterion in docs/specs/S17-map-nearby-matches.md:
 *  1. Full-screen react-native-maps view renders when permission is granted.
 *  2. Permission undetermined -> rationale with "Permitir localização"; pressing
 *     it requests permission.
 *  3. Permission denied -> explanation with "Abrir configurações"; pressing it
 *     calls Linking.openSettings().
 *  4. One pin renders per match returned within the radius.
 *  5. Pins are color-coded by slot availability (matchPinImage helper + in-screen).
 *  6. Tapping a pin shows a bottom preview card (MatchCard) with the summary.
 *  7. Tapping the preview card navigates to the match detail (S12).
 *  8. Back control returns to S6 Explore (router.back).
 *  9. Granted but zero matches -> empty-state message and no pins.
 * 10. Nearby fetch error -> retry affordance that refetches.
 *
 * Per the spec's RNTL note, react-native-maps and expo-location are mocked; the
 * assertions target permission states, the count badge, pin color logic (pure
 * helper), the bottom card on pin select, navigation, and empty/error overlays —
 * never the native map canvas. Read hook is mocked at the boundary; no MSW.
 */
import React from 'react';
import { Linking, Platform } from 'react-native';
import { VENUE_HALO, clusterImage, matchPinImage, venueActivityFor, venuePinImage } from '@/components/domain/MapPins';

// --- Native / module mocks -------------------------------------------------

// The list panel's drag (#180) -> inert: the tests open it with a tap on its handle.
jest.mock('react-native-gesture-handler', () => {
  const chain: any = new Proxy({}, { get: () => () => chain });
  return { GestureDetector: ({ children }: any) => children, Gesture: { Pan: () => chain } };
});

// LinearGradient -> View (used by the dark MatchCard cover + primary Button).
jest.mock('expo-linear-gradient', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: any) =>
      ReactLocal.createElement(View, props, children),
  };
});

// safe-area -> plain View (no insets provider under test).
jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      ReactLocal.createElement(View, props, children),
  };
});

// lucide icons -> inert nodes (back chevron, pin volleyball, card map-pin/users).
jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) =>
    ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  const icons: Record<string, unknown> = {
    ChevronLeft: stub('chevron-left'),
    Clock: stub('clock'),
    Flame: stub('flame'),
    LandPlot: stub('land-plot'),
    LocateFixed: stub('locate-fixed'),
    Volleyball: stub('volleyball'),
    MapPin: stub('map-pin'),
    Users: stub('users'),
  };
  const fallback = (props: any) => require('react').createElement(require('react-native').View, props);
  return new Proxy(icons, { get: (target, key: string) => (key in target ? target[key] : fallback) });
});

// react-native-maps -> View stubs. Marker is a Pressable so fireEvent.press
// triggers its onPress (pin selection) without a native map.
// The camera calls the screen makes through the map's ref.
const mockMapMethods = {
  animateToRegion: jest.fn(),
  animateCamera: jest.fn(),
  fitToCoordinates: jest.fn(),
};

jest.mock('react-native-maps', () => {
  const ReactLocal = require('react');
  const { View, Pressable } = require('react-native');
  const MapView = ({ children, ref, ...props }: any) => {
    ReactLocal.useImperativeHandle(ref, () => mockMapMethods);
    return ReactLocal.createElement(
      View,
      { ...props, testID: props.testID ?? 'map-view' },
      children,
    );
  };
  const Marker = ({ children, onPress, testID, ...props }: any) =>
    ReactLocal.createElement(
      Pressable,
      { onPress, testID, accessibilityRole: 'button', ...props },
      children,
    );
  return { __esModule: true, default: MapView, Marker };
});

// expo-location -> spyable async permission/location fns + PermissionStatus enum.
const mockGetForeground = jest.fn();
const mockRequestForeground = jest.fn();
const mockGetPosition = jest.fn();
const mockGetLastKnown = jest.fn();

jest.mock('expo-location', () => ({
  PermissionStatus: {
    GRANTED: 'granted',
    UNDETERMINED: 'undetermined',
    DENIED: 'denied',
  },
  getForegroundPermissionsAsync: (...args: any[]) => mockGetForeground(...args),
  requestForegroundPermissionsAsync: (...args: any[]) =>
    mockRequestForeground(...args),
  getCurrentPositionAsync: (...args: any[]) => mockGetPosition(...args),
  getLastKnownPositionAsync: (...args: any[]) => mockGetLastKnown(...args),
}));

// expo-router: spyable router.push / router.back.
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...args: any[]) => mockPush(...args),
    back: (...args: any[]) => mockBack(...args),
  },
}));

// --- Read hook mock (mocked at the boundary) -------------------------------
import type { NearbyMatch } from '@/features/matches/types/match';

// Distinct slot counts so each pin-tone branch is asserted in-screen:
//  - near-open: 8-4 = 4 open  -> bg-accent  (vagas abertas)
//  - near-last: 8-7 = 1 open  -> bg-warning (última vaga)
//  - near-full: 8-8 = 0 open  -> bg-text-muted (lotada)
const NEARBY_FIXTURE: NearbyMatch[] = [
  {
    id: 'near-open',
    name: 'Arena Sky Beach',
    format: '4X4',
    level: 'INTERMEDIARIO',
    distanceKm: 1.2,
    confirmed: 4,
    capacity: 8,
    priceLabel: 'R$ 25',
    tint: '#1A1AFF',
    lat: -23.5605,
    lon: -46.6433,
  },
  {
    id: 'near-last',
    name: 'Quadra do Parque',
    format: '6X6',
    level: 'INICIANTE',
    distanceKm: 2.6,
    confirmed: 7,
    capacity: 8,
    priceLabel: 'Grátis',
    tint: '#00B4D8',
    lat: -23.5731,
    lon: -46.6289,
  },
  {
    id: 'near-full',
    name: 'Beach Vôlei SP',
    format: '2X2',
    level: 'AVANCADO',
    distanceKm: 3.4,
    confirmed: 8,
    capacity: 8,
    priceLabel: 'R$ 40',
    tint: '#6B1AFF',
    lat: -23.5489,
    lon: -46.6588,
  },
];

type QueryState = {
  data: NearbyMatch[] | undefined;
  isPending: boolean;
  isError: boolean;
};

const mockNearby: QueryState & { refetch: jest.Mock; lastParams: unknown } = {
  data: NEARBY_FIXTURE,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
  lastParams: undefined,
};

jest.mock('@/features/matches/api/getNearby', () => ({
  useNearbyMatches: (params: unknown) => {
    mockNearby.lastParams = params;
    return {
      data: mockNearby.data,
      isPending: mockNearby.isPending,
      isError: mockNearby.isError,
      refetch: mockNearby.refetch,
    };
  },
}));

// Arenas (DECISIONS #145, #179): none by default, so the S17 cases above see only games.
import type { ArenaGame, MapArena } from '@/features/explore/api/mapItems';

const mockVenues: { data: MapArena[] } = { data: [] };
const mockItems: { lastParams: unknown; fetching: boolean; arenaCount: number; gameCount: number } = {
  lastParams: undefined,
  fetching: false,
  arenaCount: 0,
  gameCount: 0,
};

// The map's one request: like the API, a game listed under an arena is not a loose game.
jest.mock('@/features/explore/api/mapItems', () => ({
  ...jest.requireActual('@/features/explore/api/mapItems'),
  useMapItems: (params: unknown) => {
    mockItems.lastParams = params;
    const atArenas = new Set(mockVenues.data.flatMap((v) => v.games.map((g) => g.id)));
    return {
      data: mockNearby.data && {
        arenas: mockVenues.data,
        games: mockNearby.data.filter((m) => !atArenas.has(m.id)),
        arenaCount: mockItems.arenaCount,
        gameCount: mockItems.gameCount,
        truncated: false,
      },
      isFetching: mockItems.fetching,
      isPending: mockNearby.isPending,
      isError: mockNearby.isError,
      refetch: mockNearby.refetch,
    };
  },
  useArenaDetail: () => ({ data: undefined }),
}));

jest.mock('@/features/explore/api/venues', () => ({
  ...jest.requireActual('@/features/explore/api/venues'),
  useVenueDetails: (placeId: string | null) => ({
    data: placeId ? { title: 'Arena Copacabana', address: 'Av. Atlântica, Rio' } : undefined,
  }),
}));

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import MapScreen, { PIN_ANCHOR, nextVenueWithGames, searchAreaFor } from '../../../../app/explore/map';
import { areaCountLabel, listRows } from '@/components/domain/MapListSheet';

// --- Helpers ---------------------------------------------------------------

/** Renders the screen and flushes the mounted permission/location effects. */
async function renderScreen() {
  await act(async () => {
    render(<MapScreen />);
  });
}

async function press(element: Parameters<typeof fireEvent.press>[0]) {
  await act(async () => {
    fireEvent.press(element);
  });
}


function resetMocks() {
  mockPush.mockClear();
  mockBack.mockClear();

  mockGetForeground.mockReset().mockResolvedValue({ status: 'granted' });
  mockRequestForeground.mockReset().mockResolvedValue({ status: 'granted' });
  mockGetPosition
    .mockReset()
    .mockResolvedValue({ coords: { latitude: -23.56, longitude: -46.64 } });
  // No recent fix by default: the map waits for the GPS one.
  mockGetLastKnown.mockReset().mockResolvedValue(null);

  mockVenues.data = [];
  mockItems.lastParams = undefined;
  mockItems.fetching = false;
  mockItems.arenaCount = 0;
  mockItems.gameCount = 0;
  mockNearby.data = NEARBY_FIXTURE;
  mockNearby.isPending = false;
  mockNearby.isError = false;
  mockNearby.refetch.mockClear();
  Object.values(mockMapMethods).forEach((fn) => fn.mockClear());
  mockNearby.lastParams = undefined;

  jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
}

beforeEach(() => {
  resetMocks();
});

// ---------------------------------------------------------------------------

describe('PIN_ANCHOR', () => {
  it('sits on the tip: at the head centre across, near the bottom edge down', () => {
    // 32px head, 3px shadow: a 35 x 42 view with the tip at (16, 16 + 32 / √2).
    expect(PIN_ANCHOR.x).toBeCloseTo(16 / 35);
    expect(PIN_ANCHOR.y).toBeCloseTo(38.627 / 42, 3);
  });
});

describe('matchPinImage (pure pin image helper)', () => {
  /**
   * Covers: S17 — Map of Nearby Matches
   * Criterion: "Pins are color-coded by slot availability": lime with spots,
   * amber on the last one, grey when full — one image each (DECISIONS #176).
   */
  it('picks one image for 2+ open slots, another for the last, another when full', () => {
    expect(matchPinImage(5)).toBe(matchPinImage(2));
    expect(matchPinImage(1)).not.toBe(matchPinImage(2));
    expect(matchPinImage(-3)).toBe(matchPinImage(0));
    expect(matchPinImage(0)).not.toBe(matchPinImage(1));
    expect(matchPinImage(0)).not.toBe(matchPinImage(2));
  });
});

describe('venuePinImage', () => {
  const a = (kind: MapArena['kind'], gamesCount: number, live = false) => ({ kind, gamesCount, live });

  it('has one image per kind, count (1–4, then 5+) and live state', () => {
    expect(venuePinImage(a('Court', 0))).not.toBe(venuePinImage(a('Sand', 0)));
    expect(venuePinImage(a('Court', 1))).not.toBe(venuePinImage(a('Court', 0)));
    expect(venuePinImage(a('Court', 2))).not.toBe(venuePinImage(a('Court', 1)));
    expect(venuePinImage(a('Court', 5))).not.toBe(venuePinImage(a('Court', 4)));
    expect(venuePinImage(a('Court', 14))).toBe(venuePinImage(a('Court', 5)));
    expect(venuePinImage(a('Court', 1, true))).not.toBe(venuePinImage(a('Court', 1)));
  });
});

describe('clusterImage', () => {
  it('counts the places in the group, green when one has a game (D5)', () => {
    expect(clusterImage(0, 3)).not.toBe(clusterImage(1, 3));
    expect(clusterImage(7, 3)).toBe(clusterImage(1, 3));
    expect(clusterImage(1, 3)).not.toBe(clusterImage(1, 4));
    expect(clusterImage(0, 14)).toBe(clusterImage(0, 10));
  });
});

describe('S17 — Map of Nearby Matches', () => {
  // ------------------------------------------------------------- permission
  /**
   * Covers: S17 — Map of Nearby Matches
   * Criterion: "Full-screen react-native-maps view renders when location
   *  permission is granted."
   */
  it('renders the full-screen map when permission is already granted', async () => {
    mockGetForeground.mockResolvedValue({ status: 'granted' });
    await renderScreen();

    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());
    // No permission copy on the granted map.
    expect(screen.queryByText('Permitir localização')).toBeNull();
    expect(screen.queryByText('Abrir configurações')).toBeNull();
  });

  /**
   * Covers: S17 — Map of Nearby Matches
   * An Android build without the Google Maps key must not mount the native map
   * (it closes the app); the nearby matches are listed instead.
   */
  it('lists the nearby matches instead of the map on Android without a Maps key', async () => {
    const os = Platform.OS;
    Platform.OS = 'android';
    delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;
    try {
      mockGetForeground.mockResolvedValue({ status: 'granted' });
      await renderScreen();

      await waitFor(() =>
        expect(screen.getByTestId('map-list-near-open')).toBeTruthy(),
      );
      expect(screen.queryByTestId('map-view')).toBeNull();
    } finally {
      Platform.OS = os;
    }
  });

  /**
   * Covers: S17 — Map of Nearby Matches
   * Criterion: "When permission is undetermined, a rationale with 'Permitir
   *  localização' is shown; pressing it requests permission."
   */
  it('shows the rationale when undetermined and requests permission on press', async () => {
    mockGetForeground.mockResolvedValue({ status: 'undetermined' });
    // After the user allows, resolve to granted so the map then renders.
    mockRequestForeground.mockResolvedValue({ status: 'granted' });
    await renderScreen();

    await waitFor(() =>
      expect(screen.getByText('Veja partidas perto de você')).toBeTruthy(),
    );
    expect(screen.getByText('Permitir localização')).toBeTruthy();
    // Map is not shown while undetermined.
    expect(screen.queryByTestId('map-view')).toBeNull();

    await press(screen.getByText('Permitir localização'));

    expect(mockRequestForeground).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());
  });

  /**
   * Covers: S17 — Map of Nearby Matches
   * Criterion: "When permission is denied, an explanation with 'Abrir
   *  configurações' is shown and pressing it calls Linking.openSettings()."
   */
  it('shows the denied explanation and opens settings on press', async () => {
    mockGetForeground.mockResolvedValue({ status: 'denied' });
    await renderScreen();

    await waitFor(() =>
      expect(screen.getByText('Precisamos da sua localização')).toBeTruthy(),
    );
    expect(screen.getByText('Abrir configurações')).toBeTruthy();
    expect(screen.queryByTestId('map-view')).toBeNull();

    await press(screen.getByText('Abrir configurações'));

    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  });

  // ------------------------------------------------------------------- pins
  /**
   * Covers: S17 — Map of Nearby Matches
   * Criterion: "One pin renders per match returned within the radius."
   */
  it('renders exactly one pin per nearby match', async () => {
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());

    expect(screen.getByTestId('map-pin-near-open')).toBeTruthy();
    expect(screen.getByTestId('map-pin-near-last')).toBeTruthy();
    expect(screen.getByTestId('map-pin-near-full')).toBeTruthy();
    // The count badge reflects the same length.
    expect(screen.getByText('3 partidas por perto')).toBeTruthy();
  });

  /**
   * Covers: S17 — Map of Nearby Matches
   * Criterion: "Pins are color-coded by slot availability using DESIGN_SYSTEM
   *  tokens." — verified in-screen against the rendered wrapper class.
   */
  it('color-codes each pin by its open-slot count', async () => {
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());

    // Image markers (DECISIONS #176).
    const image = (id: string) => screen.getByTestId(id).props.image;
    expect(image('map-pin-near-open')).toBe(matchPinImage(4));
    expect(image('map-pin-near-last')).toBe(matchPinImage(1));
    expect(image('map-pin-near-full')).toBe(matchPinImage(0));
  });

  // ---------------------------------------------------------- preview + nav
  /**
   * Covers: S17 — Map of Nearby Matches
   * Criterion: "Tapping a pin shows a bottom preview card (MatchCard) with that
   *  match's summary."
   */
  it('shows the MatchCard bottom preview when a pin is tapped', async () => {
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());

    // No preview card before a pin is selected.
    expect(screen.queryByTestId('map-preview-card')).toBeNull();

    await press(screen.getByTestId('map-pin-near-open'));

    expect(screen.getByTestId('map-preview-card')).toBeTruthy();
    // Card renders that match's summary.
    expect(screen.getByText('Arena Sky Beach')).toBeTruthy();
    // Distance from the device (mocked ~0,3 km away), not the search centre.
    expect(screen.getByText('0,3 km')).toBeTruthy();
    expect(screen.getByText('R$ 25')).toBeTruthy();
  });

  /**
   * Covers: S17 — Map of Nearby Matches
   * Criterion: "Tapping the preview card navigates to the match detail (S12)."
   */
  it('navigates to /matches/[id] when the preview card is tapped', async () => {
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());

    await press(screen.getByTestId('map-pin-near-last'));
    await press(screen.getByText('Ver partida'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/matches/[id]',
      params: { id: 'near-last' },
    });
  });

  /**
   * Moving the map searches the area on screen, so a match far from the user
   * (another city) is found by taking the map there.
   */
  it('searches the area the map shows once the map is moved', async () => {
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());

    await act(async () => {
      screen.getByTestId('map-view').props.onRegionChangeComplete({
        latitude: -19.9191,
        longitude: -43.9386,
        latitudeDelta: 0.4,
        longitudeDelta: 0.4,
      });
    });

    // A view outside the rectangle Explore loaded: the view plus half its size on every side.
    expect(mockItems.lastParams).toEqual({
      south: -20.32, west: -44.34, north: -19.51, east: -43.53, kinds: [], lat: -23.56, lon: -46.64,
    });
  });

  it('opens with the same search Explore made, and keeps it while the view stays inside', async () => {
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());
    const opened = { south: -23.66, west: -46.74, north: -23.46, east: -46.54, kinds: [], lat: -23.56, lon: -46.64 };
    expect(mockItems.lastParams).toEqual(opened);

    await act(async () => {
      screen.getByTestId('map-view').props.onRegionChangeComplete({
        latitude: -23.6,
        longitude: -46.6,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    });
    expect(mockItems.lastParams).toEqual(opened);
  });

  it('opens at once with a recent position fix, without waiting for the GPS', async () => {
    mockGetLastKnown.mockResolvedValue({ coords: { latitude: -23.5612, longitude: -46.6398 } });
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());
    expect(mockGetPosition).not.toHaveBeenCalled();
    // Rounded like Explore's search, so both share the cached result.
    expect(mockItems.lastParams).toMatchObject({ south: -23.66, north: -23.46, lat: -23.561, lon: -46.64 });
  });

  it('caps the search radius and flags a view that is too wide', () => {
    const area = searchAreaFor({
      latitude: -21,
      longitude: -45,
      latitudeDelta: 6,
      longitudeDelta: 6,
    });
    expect(area.radiusKm).toBe(50);
    expect(area.tooWide).toBe(true);
  });

  // ------------------------------------------------------------------- back
  /**
   * Covers: S17 — Map of Nearby Matches
   * Criterion: "Back control returns to S6 Explore."
   */
  it('returns to Explore via router.back when the back control is tapped', async () => {
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());

    await press(screen.getByTestId('map-back'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  // ------------------------------------------------------------------ empty
  /**
   * Covers: S17 — Map of Nearby Matches
   * Criterion: "When granted but no matches are in radius, an empty-state
   *  message is shown and no pins render."
   */
  it('shows the empty state and renders no pins when there are no matches', async () => {
    mockNearby.data = [];
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());

    expect(screen.getByText('Nenhuma partida perto de você ainda')).toBeTruthy();
    expect(screen.getByText('0 partidas por perto')).toBeTruthy();
    expect(screen.queryByTestId('map-pin-near-open')).toBeNull();
    expect(screen.queryByTestId('map-pin-near-last')).toBeNull();
    expect(screen.queryByTestId('map-pin-near-full')).toBeNull();
  });

  // ------------------------------------------------------------------ error
  /**
   * Covers: S17 — Map of Nearby Matches
   * Criterion: "Nearby fetch error shows a retry affordance that refetches."
   */
  it('shows a retry affordance on fetch error and refetches on press', async () => {
    mockNearby.isError = true;
    mockNearby.data = undefined;
    await renderScreen();

    await waitFor(() =>
      expect(
        screen.getByText('Não foi possível carregar as partidas por perto.'),
      ).toBeTruthy(),
    );
    // Map is not shown in the error state.
    expect(screen.queryByTestId('map-view')).toBeNull();

    await press(screen.getByText('Tentar novamente'));

    expect(mockNearby.refetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Arenas on the map (DECISIONS #145, #179): a round pin per approved arena, green with
// its games this week, red ring with one being played now; its games are in its card.

describe('Arenas on the map', () => {
  // Each arena ~1 km east of the one made before it: far enough apart that the
  // map does not group them (DECISIONS #177).
  let made = 0;
  const venue = (id: string, games: ArenaGame[]): MapArena => ({
    id,
    placeId: `p-${id}`,
    lat: -23.56,
    lon: -46.64 + 0.01 * made++,
    distanceKm: 0.5,
    kind: 'Court',
    gamesCount: games.length,
    live: games.some((g) => g.live),
    games,
  });
  const g = (id: string, name = id, live = false): ArenaGame => ({
    id, name, startsAt: '2026-10-21T22:00:00Z', live, full: false, confirmed: 4, capacity: 12,
  });

  it('marks arenas by activity and hides the pins of the games played there', async () => {
    mockVenues.data = [venue('quiet', []), venue('today', [g('near-open', 'Arena Sky Beach')]), venue('live', [g('x-live', 'Rachão', true)])];
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());

    const image = (id: string) => screen.getByTestId(`map-venue-${id}`).props.image;
    const [quiet, today, live] = mockVenues.data;
    expect(image('quiet')).toBe(venuePinImage(quiet!));
    expect(image('today')).toBe(venuePinImage(today!));
    expect(image('live')).toBe(venuePinImage(live!));
    expect(image('live')).not.toBe(image('today'));
    // The game at the "today" arena is no longer its own pin; the others are.
    expect(screen.queryByTestId('map-pin-near-open')).toBeNull();
    expect(screen.getByTestId('map-pin-near-last')).toBeTruthy();
  });

  it('shows arenas without games only close in, or when a kind is picked', async () => {
    mockVenues.data = [venue('quiet', []), venue('today', [g('near-open', 'Arena Sky Beach')])];
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());
    expect(screen.getByTestId('map-venue-quiet')).toBeTruthy();

    // Zoomed out to ~20 km: only the arena with a game stays.
    await act(async () => {
      screen.getByTestId('map-view').props.onRegionChangeComplete({
        latitude: -23.56,
        longitude: -46.64,
        latitudeDelta: 0.36,
        longitudeDelta: 0.36,
      });
    });
    expect(screen.queryByTestId('map-venue-quiet')).toBeNull();
    expect(screen.getByTestId('map-venue-today')).toBeTruthy();

    // Picking a kind brings it back: 1 km apart at this zoom, both in one green group.
    await press(screen.getByTestId('map-filter-Court'));
    expect(screen.queryByTestId('map-venue-quiet')).toBeNull();
    expect(screen.getByTestId('map-cluster-v:today').props.image).toBe(clusterImage(1, 2));
  });

  it('groups pins that would overlap and shows them apart close in', async () => {
    mockVenues.data = [
      { ...venue('a', [g('x1', 'Jogo')]), lon: -46.64 },
      { ...venue('b', []), lon: -46.6401 },
    ];
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());
    // ~10 m apart on a 5 km wide map: one group with the game 350 m away (near-open),
    // numbered by its 3 places and green because they have games (D5).
    expect(screen.queryByTestId('map-venue-a')).toBeNull();
    expect(screen.getByTestId('map-cluster-m:near-open').props.image).toBe(clusterImage(1, 3));
    // Places this close open just past the grouping, not at building level (fitting them did).
    await press(screen.getByTestId('map-cluster-m:near-open'));
    expect(mockMapMethods.fitToCoordinates).not.toHaveBeenCalled();
    expect(mockMapMethods.animateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({ latitudeDelta: 0.015, longitudeDelta: 0.015 }),
    );

    await act(async () => {
      screen.getByTestId('map-view').props.onRegionChangeComplete({
        latitude: -23.56,
        longitude: -46.64,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    });
    expect(screen.queryByTestId('map-cluster-m:near-open')).toBeNull();
    expect(screen.getByTestId('map-venue-a')).toBeTruthy();
    expect(screen.getByTestId('map-venue-b')).toBeTruthy();
  });

  it('opens the arena card with its name from Google and its games', async () => {
    mockVenues.data = [venue('today', [g('near-open', 'Arena Sky Beach')]), venue('empty', [])];
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());

    expect(screen.queryByTestId('map-venue-halo')).toBeNull();
    await press(screen.getByTestId('map-venue-today'));
    expect(screen.getByTestId('map-venue-card')).toBeTruthy();
    expect(screen.getByTestId('map-venue-halo').props.image).toBe(VENUE_HALO);
    expect(screen.getByText('Arena Copacabana')).toBeTruthy();
    await press(screen.getByTestId('map-venue-match-near-open'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/matches/[id]', params: { id: 'near-open' } });

    await press(screen.getByTestId('map-venue-empty'));
    expect(screen.getByText('Nenhum jogo marcado aqui nos próximos dias.')).toBeTruthy();
  });

  it('ends the arena games with the closest other arena that has games', async () => {
    const far = { ...venue('far', [g('g-far')]), lat: -23.6 };
    const close = { ...venue('close', [g('g-close')]), lat: -23.57 };
    const here = venue('here', [g('near-open')]);
    expect(nextVenueWithGames(here, [here, far, venue('quiet', []), close])?.id).toBe('close');
    expect(nextVenueWithGames(here, [here, venue('quiet', [])])).toBeNull();

    mockVenues.data = [here, close];
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());
    await press(screen.getByTestId('map-venue-here'));
    expect(screen.getByText('1 jogo esta semana')).toBeTruthy();
    expect(screen.getByText('Outra arena com jogos')).toBeTruthy();
    await press(screen.getByTestId('map-venue-next'));
    expect(screen.queryByTestId('map-venue-match-near-open')).toBeNull();
    expect(screen.getByTestId('map-venue-match-g-close')).toBeTruthy();
  });

  it('venueActivityFor: live beats having games beats none', () => {
    expect(venueActivityFor(venue('a', []))).toBe('none');
    expect(venueActivityFor(venue('a', [g('m')]))).toBe('today');
    expect(venueActivityFor(venue('a', [g('m'), g('n', 'n', true)]))).toBe('live');
  });
});

// ---------------------------------------------------------------------------
// The list under the map (DECISIONS #180, D8): a panel dragged up from the bottom that
// counts the area and lists its arenas and games, closest first.

describe('The list under the map', () => {
  const arena = (id: string, distanceKm: number, gamesCount = 0): MapArena => ({
    id,
    placeId: `p-${id}`,
    lat: -23.56,
    lon: -46.6 + distanceKm / 100,
    distanceKm,
    kind: 'Sand',
    gamesCount,
    live: false,
    games: [],
  });

  it('counts arenas and games with singulars', () => {
    expect(areaCountLabel(12, 7)).toBe('12 arenas · 7 jogos nesta área');
    expect(areaCountLabel(1, 1)).toBe('1 arena · 1 jogo nesta área');
  });

  it('lists arenas and games together, closest first', () => {
    const rows = listRows([arena('far', 5), arena('close', 0.3)], NEARBY_FIXTURE);
    expect(rows.map((r) => (r.type === 'arena' ? r.arena.id : r.match.id))).toEqual([
      'close', 'near-open', 'near-last', 'near-full', 'far',
    ]);
  });

  it('shows the whole area count collapsed, and the list once opened', async () => {
    mockVenues.data = [arena('sand', 0.3, 2)];
    mockItems.arenaCount = 4;
    mockItems.gameCount = 9;
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());

    expect(screen.getByTestId('map-list-count').props.children).toBe('4 arenas · 9 jogos nesta área');
    expect(screen.queryByTestId('map-list-game-near-open')).toBeNull();

    await press(screen.getByTestId('map-list-handle'));
    await press(screen.getByTestId('map-list-game-near-open'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/matches/[id]', params: { id: 'near-open' } });

    await press(screen.getByTestId('map-list-arena-sand'));
    expect(screen.getByTestId('map-venue-card')).toBeTruthy();
    // Centred at a street zoom, whatever zoom the map had.
    expect(mockMapMethods.animateToRegion).toHaveBeenCalledWith(
      { latitude: -23.56, longitude: -46.597, latitudeDelta: 0.015, longitudeDelta: 0.015 },
      450,
    );
    expect(screen.queryByTestId('map-list-sheet')).toBeNull();
  });

  it('shows three dots in the top pill while a new area loads', async () => {
    mockItems.fetching = true;
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());
    expect(screen.getByText('•••')).toBeTruthy();
  });
});
