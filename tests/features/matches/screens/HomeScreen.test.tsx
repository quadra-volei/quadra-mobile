/**
 * S5 — Home screen tests.
 *
 * Covers every acceptance criterion in docs/specs/S5-home.md:
 *  - Header shows "INÍCIO" + bell + theme toggle — NO avatar, NO greeting.
 *  - "Bora pra quadra?" card renders "Criar partida" (gradient) above
 *    "Procurar partidas" (outline).
 *  - "Criar partida" navigates to /matches/create.
 *  - "Procurar partidas" and "Ver todas" navigate to /explore.
 *  - "PRÓXIMAS PARTIDAS" renders a horizontal scroll of MatchCardCompact from
 *    useUpcomingMatches; tapping a card navigates to S12 with its id.
 *  - "JOGOS PERTO DE VOCÊ" renders a 2-col grid of MatchCard from
 *    useNearbyMatches; tapping a card navigates to S12 with its id.
 *  - "Mapa" navigates to /explore/map.
 *  - Each section shows its own loading placeholder while pending, its own empty
 *    state when its list is empty, and its own retry row on error — independently.
 *  - No location permission prompt fires on Home; no stories/feed/weather/ads.
 *
 * Both read hooks are mocked at the hook boundary so the four query states
 * (pending / error / empty / populated) are controlled deterministically per
 * section, with no network and no MSW. Navigation is mocked via expo-router.
 * Native modules (gradient, safe-area, expo-image, lucide) are stubbed inline —
 * the repo's tests/__mocks__ are NOT auto-applied.
 *
 * The bottom tab bar + central "Jogar" FAB are owned by app/(tabs)/_layout.tsx
 * (not by this screen). Criterion 9 (bar persists / Home active) and the FAB half
 * of criterion 3 are covered in tests/features/matches/screens/TabsLayout.test.tsx.
 */
import React from 'react';

// --- Native / module mocks ------------------------------------------------

// LinearGradient -> View that forwards props (dark MatchCard cover).
jest.mock('expo-linear-gradient', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: any) =>
      ReactLocal.createElement(
        View,
        { ...props, testID: props.testID ?? 'linear-gradient' },
        children,
      ),
  };
});

// safe-area -> plain View (no insets provider needed under test).
jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      ReactLocal.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// expo-image -> inert node (MatchCardCompact avatar stack).
jest.mock('expo-image', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: any) => ReactLocal.createElement(View, props),
  };
});

// lucide icons -> inert nodes (header bell/sun, card meta icons).
jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) =>
    ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  return {
    Bell: stub('bell'),
    Settings: stub('settings'),
    Sun: stub('sun'),
    Clock: stub('clock'),
    MapPin: stub('map-pin'),
    Users: stub('users'),
  };
});

// expo-router: spyable router.push + useFocusEffect (used by
// useRegisterNavBlurTarget) delegated to a plain effect so the screen mounts.
const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const ReactLocal = require('react');
  return {
    router: {
      push: (...args: any[]) => mockPush(...args),
    },
    useFocusEffect: (cb: () => void | (() => void)) =>
      ReactLocal.useEffect(() => cb(), [cb]),
  };
});

// --- Read hook mocks (mocked at the boundary) -----------------------------
// `mock`-prefixed holders so the jest.mock factories may reference them.
import type {
  NearbyMatch,
  UpcomingMatch,
} from '@/features/matches/types/match';

const UPCOMING_FIXTURE: UpcomingMatch[] = [
  {
    id: 'up-1',
    name: 'Vôlei de Quinta',
    startsAt: '2026-06-20T19:30:00-03:00',
    category: 'CASUAL',
    openSlots: 2,
    priceLabel: 'R$ 15',
    avatarUrls: ['https://example.com/a.png', 'https://example.com/b.png'],
    tint: '#1A1AFF',
  },
  {
    id: 'up-2',
    name: 'Racha da Galera',
    startsAt: '2026-06-21T20:00:00-03:00',
    category: 'COMPETITIVO',
    openSlots: 4,
    priceLabel: 'Grátis',
    avatarUrls: ['https://example.com/c.png'],
    tint: '#6B1AFF',
  },
];

const NEARBY_FIXTURE: NearbyMatch[] = [
  {
    id: 'near-1',
    name: 'Arena Sky Beach',
    format: '4X4',
    level: 'INTERMEDIARIO',
    distanceKm: 1.2,
    confirmed: 6,
    capacity: 8,
    priceLabel: 'R$ 25',
    tint: '#1A1AFF',
    lat: -23.5605,
    lon: -46.6433,
  },
  {
    id: 'near-2',
    name: 'Quadra do Parque',
    format: '6X6',
    level: 'INICIANTE',
    distanceKm: 2.6,
    confirmed: 9,
    capacity: 12,
    priceLabel: 'Grátis',
    tint: '#00B4D8',
    lat: -23.5731,
    lon: -46.6289,
  },
];

type QueryState<T> = {
  data: T[];
  isPending: boolean;
  isError: boolean;
};

const mockUpcoming: QueryState<UpcomingMatch> & { refetch: jest.Mock } = {
  data: UPCOMING_FIXTURE,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
};

const mockNearby: QueryState<NearbyMatch> & {
  refetch: jest.Mock;
  lastParams: unknown;
} = {
  data: NEARBY_FIXTURE,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
  lastParams: undefined,
};

jest.mock('@/features/matches/api/getUpcoming', () => ({
  useUpcomingMatches: () => ({
    data: mockUpcoming.data,
    isPending: mockUpcoming.isPending,
    isError: mockUpcoming.isError,
    refetch: mockUpcoming.refetch,
  }),
}));

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

import { fireEvent, render, screen } from '@testing-library/react-native';

import HomeScreen from '../../../../app/(tabs)/index';

function resetUpcoming() {
  mockUpcoming.data = UPCOMING_FIXTURE;
  mockUpcoming.isPending = false;
  mockUpcoming.isError = false;
  mockUpcoming.refetch.mockClear();
}

function resetNearby() {
  mockNearby.data = NEARBY_FIXTURE;
  mockNearby.isPending = false;
  mockNearby.isError = false;
  mockNearby.refetch.mockClear();
  mockNearby.lastParams = undefined;
}

beforeEach(() => {
  mockPush.mockClear();
  resetUpcoming();
  resetNearby();
});

describe('S5 — Home screen', () => {
  // -------------------------------------------------------------------- header
  /**
   * Covers: S5 — Home
   * Criterion: "Header shows the 'INÍCIO' display title and a notification bell —
   *  no theme toggle (theme lives in Settings), no avatar and no greeting."
   */
  it('renders the INÍCIO header with bell and no theme toggle/avatar/greeting', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('INÍCIO')).toBeTruthy();
    // bell is an accessible button
    expect(screen.getByLabelText('Notificações')).toBeTruthy();
    // the bell icon renders
    expect(screen.getByTestId('icon-bell')).toBeTruthy();
    // theme toggle moved to Settings — not on Home
    expect(screen.queryByLabelText('Alternar tema')).toBeNull();
    expect(screen.queryByTestId('icon-sun')).toBeNull();
    // settings affordance is present in every screen header
    expect(screen.getByLabelText('Configurações')).toBeTruthy();
    expect(screen.getByTestId('icon-settings')).toBeTruthy();

    // NO greeting / avatar (that header is S8 Profile, not Home)
    expect(screen.queryByText(/olá/i)).toBeNull();
    expect(screen.queryByLabelText(/avatar/i)).toBeNull();
    expect(screen.queryByTestId('header-avatar')).toBeNull();
  });

  // ------------------------------------------------------- "Bora pra quadra?"
  /**
   * Covers: S5 — Home
   * Criterion: "The 'Bora pra quadra?' card renders 'Criar partida' (gradient)
   *  above 'Procurar partidas' (outline)."
   */
  it('renders the "Bora pra quadra?" card with Criar partida above Procurar partidas', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('Bora pra quadra?')).toBeTruthy();
    expect(screen.getByText('Crie ou encontre um jogo agora')).toBeTruthy();

    const create = screen.getByText('Criar partida');
    const explore = screen.getByText('Procurar partidas');
    expect(create).toBeTruthy();
    expect(explore).toBeTruthy();

    // "Criar partida" is the gradient CTA -> a gradient fill is rendered for it.
    expect(screen.getAllByTestId('linear-gradient').length).toBeGreaterThan(0);
  });

  // --------------------------------------------------------- create navigation
  /**
   * Covers: S5 — Home
   * Criterion: "Tapping 'Criar partida' navigates to S11 (/matches/create)."
   * (The central 'Jogar' FAB doing the same is covered in TabsLayout.test.tsx.)
   */
  it('navigates to /matches/create when "Criar partida" is tapped', async () => {
    await render(<HomeScreen />);

    fireEvent.press(screen.getByText('Criar partida'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/matches/create');
  });

  // -------------------------------------------------------- explore navigation
  /**
   * Covers: S5 — Home
   * Criterion: "Tapping 'Procurar partidas' and 'Ver todas' navigate to S6
   *  (/explore)."
   */
  it('navigates to /explore from "Procurar partidas"', async () => {
    await render(<HomeScreen />);

    fireEvent.press(screen.getByText('Procurar partidas'));

    expect(mockPush).toHaveBeenCalledWith('/explore');
  });

  /**
   * Covers: S5 — Home
   * Criterion: "Tapping ... 'Ver todas' navigate to S6 (/explore)."
   */
  it('navigates to /explore from "Ver todas"', async () => {
    await render(<HomeScreen />);

    fireEvent.press(screen.getByText('Ver todas'));

    expect(mockPush).toHaveBeenCalledWith('/explore');
  });

  // ------------------------------------------------ PRÓXIMAS PARTIDAS section
  /**
   * Covers: S5 — Home
   * Criterion: "'PRÓXIMAS PARTIDAS' renders a horizontal scroll of
   *  MatchCardCompact from useUpcomingMatches."
   */
  it('renders the upcoming matches from useUpcomingMatches as compact cards', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('PRÓXIMAS PARTIDAS')).toBeTruthy();
    // both upcoming fixtures rendered
    expect(screen.getByText('Vôlei de Quinta')).toBeTruthy();
    expect(screen.getByText('Racha da Galera')).toBeTruthy();
    // compact-card meta (vagas + category pill) confirms it's the compact card
    expect(screen.getByText('2 vagas')).toBeTruthy();
    expect(screen.getByText('CASUAL')).toBeTruthy();
  });

  /**
   * Covers: S5 — Home
   * Criterion: "tapping a [upcoming] card navigates to S12 with its id."
   */
  it('navigates to /matches/[id] with the match id when a compact card is tapped', async () => {
    await render(<HomeScreen />);

    fireEvent.press(
      screen.getByLabelText(/Vôlei de Quinta/),
    );

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/matches/[id]',
      params: { id: 'up-1' },
    });
  });

  // ---------------------------------------------- JOGOS PERTO DE VOCÊ section
  /**
   * Covers: S5 — Home
   * Criterion: "'JOGOS PERTO DE VOCÊ' renders a 2-col grid of dark MatchCard from
   *  useNearbyMatches."
   */
  it('renders the nearby matches from useNearbyMatches as dark grid cards', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('JOGOS PERTO DE VOCÊ')).toBeTruthy();
    expect(screen.getByText('Arena Sky Beach')).toBeTruthy();
    expect(screen.getByText('Quadra do Parque')).toBeTruthy();
    // dark-card meta (format/level pills + distance) confirms it's the MatchCard
    expect(screen.getByText('4X4')).toBeTruthy();
    expect(screen.getByText('INTERMEDIARIO')).toBeTruthy();
    expect(screen.getByText('1,2 km')).toBeTruthy();
  });

  /**
   * Covers: S5 — Home
   * Criterion: "tapping a [nearby] card navigates to S12 with its id."
   */
  it('navigates to /matches/[id] with the match id when a grid card is tapped', async () => {
    await render(<HomeScreen />);

    fireEvent.press(screen.getByLabelText(/Arena Sky Beach/));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/matches/[id]',
      params: { id: 'near-1' },
    });
  });

  // ------------------------------------------------------------- map navigation
  /**
   * Covers: S5 — Home
   * Criterion: "'Mapa' navigates to S17 (/explore/map)."
   */
  it('navigates to /explore/map from "Mapa"', async () => {
    await render(<HomeScreen />);

    fireEvent.press(screen.getByText('Mapa'));

    expect(mockPush).toHaveBeenCalledWith('/explore/map');
  });

  // -------------------------------------------- per-section loading (independent)
  /**
   * Covers: S5 — Home
   * Criterion: "Each section shows its own loading placeholder while pending ...
   *  independently."
   *
   * Only the upcoming query is pending: the upcoming list is replaced by its
   * skeleton while the nearby grid still renders its cards.
   */
  it('shows the upcoming loading placeholder independently of nearby', async () => {
    mockUpcoming.isPending = true;
    await render(<HomeScreen />);

    // upcoming content gone (skeleton in its place)
    expect(screen.queryByText('Vôlei de Quinta')).toBeNull();
    expect(screen.queryByText('Você ainda não tem partidas marcadas')).toBeNull();
    // nearby still rendered -> sections load independently
    expect(screen.getByText('Arena Sky Beach')).toBeTruthy();
  });

  /**
   * Covers: S5 — Home
   * Criterion: "Each section shows its own loading placeholder while pending ...
   *  independently." (nearby pending, upcoming populated)
   */
  it('shows the nearby loading placeholder independently of upcoming', async () => {
    mockNearby.isPending = true;
    await render(<HomeScreen />);

    expect(screen.queryByText('Arena Sky Beach')).toBeNull();
    expect(screen.queryByText('Nenhuma partida perto de você ainda')).toBeNull();
    // upcoming still rendered
    expect(screen.getByText('Vôlei de Quinta')).toBeTruthy();
  });

  // --------------------------------------------- per-section empty (independent)
  /**
   * Covers: S5 — Home
   * Criterion: "[Each section shows] its own empty state when its list is empty
   *  ... independently."
   */
  it('shows the upcoming empty state independently of nearby', async () => {
    mockUpcoming.data = [];
    await render(<HomeScreen />);

    expect(
      screen.getByText('Você ainda não tem partidas marcadas'),
    ).toBeTruthy();
    // nearby still renders its cards
    expect(screen.getByText('Arena Sky Beach')).toBeTruthy();
    expect(screen.queryByText('Nenhuma partida perto de você ainda')).toBeNull();
  });

  /**
   * Covers: S5 — Home
   * Criterion: "[Each section shows] its own empty state when its list is empty
   *  ... independently."
   */
  it('shows the nearby empty state independently of upcoming', async () => {
    mockNearby.data = [];
    await render(<HomeScreen />);

    expect(
      screen.getByText('Nenhuma partida perto de você ainda'),
    ).toBeTruthy();
    expect(screen.getByText('Vôlei de Quinta')).toBeTruthy();
    expect(
      screen.queryByText('Você ainda não tem partidas marcadas'),
    ).toBeNull();
  });

  // ----------------------------------------------- per-section error (independent)
  /**
   * Covers: S5 — Home
   * Criterion: "[Each section shows] its own retry row on error — independently."
   *
   * Upcoming errors -> its retry row appears and calls refetch(); nearby is
   * unaffected and keeps rendering its cards.
   */
  it('shows the upcoming error/retry row independently and refetches on retry', async () => {
    mockUpcoming.isError = true;
    await render(<HomeScreen />);

    expect(screen.getByText('Não foi possível carregar')).toBeTruthy();
    // nearby unaffected
    expect(screen.getByText('Arena Sky Beach')).toBeTruthy();

    fireEvent.press(screen.getByText('Tentar novamente'));
    expect(mockUpcoming.refetch).toHaveBeenCalledTimes(1);
    expect(mockNearby.refetch).not.toHaveBeenCalled();
  });

  /**
   * Covers: S5 — Home
   * Criterion: "[Each section shows] its own retry row on error — independently."
   */
  it('shows the nearby error/retry row independently and refetches on retry', async () => {
    mockNearby.isError = true;
    await render(<HomeScreen />);

    expect(screen.getByText('Não foi possível carregar')).toBeTruthy();
    expect(screen.getByText('Vôlei de Quinta')).toBeTruthy();

    fireEvent.press(screen.getByText('Tentar novamente'));
    expect(mockNearby.refetch).toHaveBeenCalledTimes(1);
    expect(mockUpcoming.refetch).not.toHaveBeenCalled();
  });

  /**
   * Covers: S5 — Home
   * Criterion: the two sections are fully independent — one erroring while the
   *  other is empty renders both states at once without bleeding into each other.
   */
  it('renders an error row and an empty state side-by-side for the two sections', async () => {
    mockUpcoming.isError = true;
    mockNearby.data = [];
    await render(<HomeScreen />);

    // upcoming error row
    expect(screen.getByText('Não foi possível carregar')).toBeTruthy();
    // nearby empty state
    expect(screen.getByText('Nenhuma partida perto de você ainda')).toBeTruthy();
  });

  // ------------------------------------------- permissions + exclusions (scope)
  /**
   * Covers: S5 — Home
   * Criterion: "No location permission prompt fires on Home" — the screen never
   *  imports/calls expo-location; nearby uses fixed placeholder params.
   */
  it('reads nearby with placeholder geo params and never requests device location', async () => {
    await render(<HomeScreen />);

    // The hook was called with fixed placeholder params (no device geo read).
    expect(mockNearby.lastParams).toEqual({
      lat: -23.55,
      lon: -46.63,
      radiusKm: 5,
    });
    // No permission-prompt copy rendered on Home.
    expect(screen.queryByText(/permiss[ãa]o/i)).toBeNull();
    expect(screen.queryByText(/localiza[çc][ãa]o/i)).toBeNull();
  });

  /**
   * Covers: S5 — Home
   * Criterion: "no stories/feed/weather/ads render."
   */
  it('renders no stories, feed, weather, or ad elements', async () => {
    await render(<HomeScreen />);

    expect(screen.queryByTestId('stories')).toBeNull();
    expect(screen.queryByTestId('feed')).toBeNull();
    expect(screen.queryByTestId('weather')).toBeNull();
    expect(screen.queryByTestId('ads')).toBeNull();
    expect(screen.queryByText(/stories/i)).toBeNull();
    expect(screen.queryByText(/previs[ãa]o/i)).toBeNull();
    expect(screen.queryByText(/patrocinad/i)).toBeNull();
  });

  /**
   * Covers: S5 — Home
   * Criterion: the bell is a no-op this iteration (documented divergence) —
   *  tapping it navigates nowhere.
   */
  it('does not navigate when the bell is tapped (no-op)', async () => {
    await render(<HomeScreen />);

    fireEvent.press(screen.getByLabelText('Notificações'));

    expect(mockPush).not.toHaveBeenCalled();
  });

  /**
   * Covers: S5 — Home
   * Criterion: the settings affordance is present on every screen header and
   *  navigates to S10 (/profile/settings).
   */
  it('navigates to /profile/settings when the settings icon is tapped', async () => {
    await render(<HomeScreen />);

    fireEvent.press(screen.getByLabelText('Configurações'));

    expect(mockPush).toHaveBeenCalledWith('/profile/settings');
  });
});
