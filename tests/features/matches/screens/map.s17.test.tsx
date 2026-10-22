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
 *  5. Pins are color-coded by slot availability (pinToneFor helper + in-screen).
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
import { Linking, Platform, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

// --- Native / module mocks -------------------------------------------------

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
jest.mock('react-native-maps', () => {
  const ReactLocal = require('react');
  const { View, Pressable } = require('react-native');
  const MapView = ({ children, ...props }: any) =>
    ReactLocal.createElement(
      View,
      { ...props, testID: props.testID ?? 'map-view' },
      children,
    );
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

// Arenas (DECISIONS #145): none by default, so the S17 cases above see only games.
import type { NearbyVenue } from '@/features/explore/api/venues';

const mockVenues: { data: NearbyVenue[] } = { data: [] };

jest.mock('@/features/explore/api/venues', () => ({
  ...jest.requireActual('@/features/explore/api/venues'),
  useNearbyVenues: () => ({ data: { venues: mockVenues.data, hasMore: false } }),
  useVenueDetails: (placeId: string | null) => ({
    data: placeId ? { title: 'Arena Copacabana', address: 'Av. Atlântica, Rio' } : undefined,
  }),
}));

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import MapScreen, {
  PIN_ANCHOR,
  pinToneFor,
  nextVenueWithGames,
  searchAreaFor,
  venueActivityFor,
} from '../../../../app/explore/map';

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

  mockVenues.data = [];
  mockNearby.data = NEARBY_FIXTURE;
  mockNearby.isPending = false;
  mockNearby.isError = false;
  mockNearby.refetch.mockClear();
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

describe('pinToneFor (pure pin color helper)', () => {
  /**
   * Covers: S17 — Map of Nearby Matches
   * Criterion: "Pins are color-coded by slot availability using DESIGN_SYSTEM
   *  tokens" — the pure mapping, tested without the native map.
   */
  it('maps 2+ open slots to the lime "vagas abertas" token', () => {
    expect(pinToneFor(2)).toBe('bg-accent');
    expect(pinToneFor(5)).toBe('bg-accent');
  });

  /**
   * Covers: S17 — Map of Nearby Matches
   * Criterion: "Pins are color-coded by slot availability" — última vaga.
   */
  it('maps exactly 1 open slot to the amber "última vaga" token', () => {
    expect(pinToneFor(1)).toBe('bg-warning');
  });

  /**
   * Covers: S17 — Map of Nearby Matches
   * Criterion: "Pins are color-coded by slot availability" — lotada.
   */
  it('maps 0 or negative open slots to the grey "lotada" token', () => {
    expect(pinToneFor(0)).toBe('bg-text-muted');
    expect(pinToneFor(-3)).toBe('bg-text-muted');
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

    // Plain views with inline colors (no SVG, no tracking: DECISIONS #171).
    const fill = (id: string) =>
      StyleSheet.flatten(screen.getByTestId(`${id}-pin-head`).props.style).backgroundColor;
    expect(fill('map-pin-near-open')).toBe(colors.accent);
    expect(fill('map-pin-near-last')).toBe(colors.warning);
    expect(fill('map-pin-near-full')).toBe(colors.textMuted);
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

    expect(mockNearby.lastParams).toEqual({ lat: -19.92, lon: -43.94, radiusKm: 23 });
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
// Arenas on the map (DECISIONS #145): a round pin per arena, 🔥 with a game today,
// red with one being played now; its games leave their own pins and go in its card.

describe('Arenas on the map', () => {
  const venue = (placeId: string, matches: NearbyVenue['matches']): NearbyVenue => ({
    placeId,
    lat: -23.56,
    lon: -46.64,
    distanceKm: 0.5,
    kind: 'Court',
    matches,
  });

  it('marks arenas by activity and hides the pins of the games played there', async () => {
    mockVenues.data = [
      venue('quiet', []),
      venue('today', [{ id: 'near-open', name: 'Arena Sky Beach', startsAt: '2026-10-21T22:00:00Z', live: false }]),
      venue('live', [{ id: 'x-live', name: 'Rachão', startsAt: '2026-10-21T18:00:00Z', live: true }]),
    ];
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());

    expect(screen.getByTestId('map-venue-quiet')).toBeTruthy();
    expect(screen.queryByTestId('map-venue-quiet-today')).toBeNull();
    expect(screen.getByTestId('map-venue-today-today')).toBeTruthy();
    expect(screen.getByTestId('map-venue-live-live')).toBeTruthy();
    // The game at the "today" arena is no longer its own pin; the others are.
    expect(screen.queryByTestId('map-pin-near-open')).toBeNull();
    expect(screen.getByTestId('map-pin-near-last')).toBeTruthy();
  });

  it('opens the arena card with its name from Google and its games', async () => {
    mockVenues.data = [
      venue('today', [{ id: 'near-open', name: 'Arena Sky Beach', startsAt: '2026-10-21T22:00:00Z', live: false }]),
      venue('empty', []),
    ];
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());

    await press(screen.getByTestId('map-venue-today'));
    expect(screen.getByTestId('map-venue-card')).toBeTruthy();
    expect(screen.getByText('Arena Copacabana')).toBeTruthy();
    await press(screen.getByTestId('map-venue-match-near-open'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/matches/[id]', params: { id: 'near-open' } });

    await press(screen.getByTestId('map-venue-empty'));
    expect(screen.getByText('Nenhum jogo marcado aqui hoje.')).toBeTruthy();
  });

  it('ends the arena games with the closest other arena that has games', async () => {
    const game = (id: string) => ({ id, name: id, startsAt: '2026-10-21T22:00:00Z', live: false });
    const far = { ...venue('far', [game('g-far')]), lat: -23.6 };
    const close = { ...venue('close', [game('g-close')]), lat: -23.57 };
    const here = venue('here', [game('near-open')]);
    expect(nextVenueWithGames(here, [here, far, venue('quiet', []), close])?.placeId).toBe('close');
    expect(nextVenueWithGames(here, [here, venue('quiet', [])])).toBeNull();

    mockVenues.data = [here, close];
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());
    await press(screen.getByTestId('map-venue-here'));
    expect(screen.getByText('1 jogo hoje')).toBeTruthy();
    expect(screen.getByText('Outra arena com jogos')).toBeTruthy();
    await press(screen.getByTestId('map-venue-next'));
    expect(screen.queryByTestId('map-venue-match-near-open')).toBeNull();
    expect(screen.getByTestId('map-venue-match-g-close')).toBeTruthy();
  });

  it('venueActivityFor: live beats today beats none', () => {
    const m = (live: boolean) => ({ id: 'm', name: 'n', startsAt: '2026-10-21T22:00:00Z', live });
    expect(venueActivityFor(venue('a', []))).toBe('none');
    expect(venueActivityFor(venue('a', [m(false)]))).toBe('today');
    expect(venueActivityFor(venue('a', [m(false), m(true)]))).toBe('live');
  });
});
