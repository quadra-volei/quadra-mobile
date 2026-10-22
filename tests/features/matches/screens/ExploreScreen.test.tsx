/**
 * S6 — Explore screen tests.
 *
 * Covers every acceptance criterion in docs/specs/S6-explore.md:
 *  - Header shows "EXPLORAR" + bell + theme toggle — NO avatar, NO greeting.
 *  - Search bar with placeholder "Buscar quadra, bairro ou horário..."; typing
 *    filters results client-side; clear (X) resets.
 *  - Horizontal filter-chip row renders exactly Todos/Perto/Hoje/Iniciante/6x6;
 *    Todos selected by default; selecting a functional chip (Perto/Iniciante/6x6)
 *    updates the highlight + filtered results; "Hoje" toggles highlight but is a
 *    documented no-op (result set unchanged).
 *  - Inline map preview with "N jogos por perto" badge + STATIC venue card with
 *    "Ver" CTA; tapping preview / badge / "Ver" navigates to /explore/map (S17).
 *  - "N partidas encontradas" count reflects current filtered length + updates.
 *  - Grade/Lista toggle switches 2-col grid <-> 1-col list of the same MatchCards.
 *  - Results render MatchCards from useNearbyMatches; tapping a card navigates to
 *    /matches/[id] (S12).
 *  - Loading placeholder while pending; "no nearby" empty when source empty;
 *    distinct "no match for this search" empty (with "Limpar filtros") when
 *    filters exclude everything; error shows a retry row.
 *  - No location permission prompt fires; no Quadras próximas / Jogadores
 *    sections, no player-search results.
 *
 * The nearby read hook is mocked at the boundary so the four query states
 * (pending / error / empty / populated) are controlled deterministically, with
 * no network and no MSW. Navigation is mocked via expo-router. Native modules
 * (gradient, safe-area, expo-image, lucide) are stubbed inline — the repo's
 * tests/__mocks__ are NOT auto-applied.
 *
 * The bottom tab bar + "Explorar" active tab are owned by app/(tabs)/_layout.tsx
 * (not this screen). That criterion is covered in
 * tests/features/matches/screens/ExploreTabActive.test.tsx.
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

// expo-image -> inert node (MatchCard cover, if any).
jest.mock('expo-image', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: any) => ReactLocal.createElement(View, props),
  };
});

// lucide icons -> inert nodes (header bell/sun, search, map-pin, grid/list, X).
jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) =>
    ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  return {
    Bell: stub('bell'),
    Settings: stub('settings'),
    Sun: stub('sun'),
    Search: stub('search'),
    X: stub('x'),
    MapPin: stub('map-pin'),
    LayoutGrid: stub('layout-grid'),
    List: stub('list'),
    Users: stub('users'),
    SlidersHorizontal: stub('sliders'),
  };
});

// react-native-maps -> View stubs (the Explore mini map).
jest.mock('react-native-maps', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = ({ children, ...props }: any) =>
    ReactLocal.createElement(View, props, children);
  return { __esModule: true, default: stub, Marker: stub };
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

// --- Read hook mock (mocked at the boundary) ------------------------------
import type { NearbyMatch } from '@/features/matches/types/match';

// Distinct format/level/name combos so each functional chip predicate is
// individually assertable, and names differ for search-text filtering.
const NEARBY_FIXTURE: NearbyMatch[] = [
  {
    id: 'near-1',
    name: 'Arena Sky Beach',
    format: '4X4',
    level: 'INTERMEDIARIO',
    distanceKm: 3.4,
    confirmed: 6,
    capacity: 8,
    priceLabel: 'R$ 25',
    price: 25,
    tint: '#1A1AFF',
    lat: -23.5605,
    lon: -46.6433,
  },
  {
    id: 'near-2',
    name: 'Quadra do Parque',
    format: '6X6',
    level: 'INICIANTE',
    distanceKm: 1.2,
    confirmed: 9,
    capacity: 12,
    priceLabel: 'Grátis',
    price: null,
    tint: '#00B4D8',
    lat: -23.5731,
    lon: -46.6289,
  },
  {
    id: 'near-3',
    name: 'Centro Olímpico',
    format: '6X6',
    level: 'AVANCADO',
    distanceKm: 2.6,
    confirmed: 2,
    capacity: 12,
    priceLabel: 'R$ 18',
    price: 18,
    tint: '#AADD00',
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

// The screen re-reads queries through the query client (pull to refresh).
const mockRefetchQueries = jest.fn(async () => undefined);
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ refetchQueries: mockRefetchQueries }),
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

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import ExploreScreen from '../../../../app/(tabs)/explore';

// Interactions are wrapped in `act` so the Pressable/TextInput state update and
// the horizontal chip FlatList's async commit are flushed before the next query
// — without this boundary, react-test-renderer desyncs across sequential events
// (a renderer quirk, not screen behavior). Mirrors RNTL's user-event flushing.
async function press(element: Parameters<typeof fireEvent.press>[0]) {
  await act(async () => {
    fireEvent.press(element);
  });
}

async function type(
  element: Parameters<typeof fireEvent.changeText>[0],
  text: string,
) {
  await act(async () => {
    fireEvent.changeText(element, text);
  });
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
  mockRefetchQueries.mockClear();
  resetNearby();
});

describe('S6 — Explore screen', () => {
  // The tab stays mounted: a pull re-reads the nearby matches (spots, new games).
  it('re-reads the nearby matches on a pull', async () => {
    const { container } = await render(<ExploreScreen />);
    // The scroll view carries the RefreshControl; a pull calls its onRefresh.
    const [scroll] = container.queryAll((node) => Boolean(node.props.refreshControl));
    await act(async () => {
      await scroll!.props.refreshControl.props.onRefresh();
    });
    expect(mockRefetchQueries).toHaveBeenCalledWith({ queryKey: ['matches', 'nearby'], type: 'active' });
  });

  // ----------------------------------------------------------------- header
  /**
   * Covers: S6 — Explore
   * Criterion: "Header shows the 'EXPLORAR' display title and a notification bell
   *  — no theme toggle (theme lives in Settings), no avatar/greeting."
   */
  it('renders the EXPLORAR header with the bell and no theme toggle/avatar/greeting', async () => {
    await render(<ExploreScreen />);

    expect(screen.getByText('EXPLORAR')).toBeTruthy();
    expect(screen.getByLabelText('Notificações')).toBeTruthy();
    expect(screen.getByTestId('icon-bell')).toBeTruthy();
    // theme toggle moved to Settings — not in the header.
    expect(screen.queryByLabelText('Alternar tema')).toBeNull();
    expect(screen.queryByTestId('icon-sun')).toBeNull();
    // settings affordance is present in every screen header.
    expect(screen.getByLabelText('Configurações')).toBeTruthy();
    expect(screen.getByTestId('icon-settings')).toBeTruthy();

    // NO greeting / avatar on Explore.
    expect(screen.queryByText(/olá/i)).toBeNull();
    expect(screen.queryByLabelText(/avatar/i)).toBeNull();
    expect(screen.queryByTestId('header-avatar')).toBeNull();
  });

  /**
   * Covers: S6 — Explore
   * Criterion: the bell is a no-op this iteration (documented divergence) —
   *  tapping it navigates nowhere.
   */
  it('does not navigate when the bell is tapped (no-op)', async () => {
    await render(<ExploreScreen />);

    await press(screen.getByLabelText('Notificações'));

    expect(mockPush).not.toHaveBeenCalled();
  });

  /**
   * Covers: S6 — Explore
   * Criterion: the settings affordance is present on every screen header and
   *  navigates to S10 (/profile/settings).
   */
  it('navigates to /profile/settings when the settings icon is tapped', async () => {
    await render(<ExploreScreen />);

    await press(screen.getByLabelText('Configurações'));

    expect(mockPush).toHaveBeenCalledWith('/profile/settings');
  });

  // ----------------------------------------------------------------- search
  /**
   * Covers: S6 — Explore
   * Criterion: "A search bar renders with the placeholder 'Buscar quadra, bairro
   *  ou horário...'."
   */
  it('renders the search bar with the expected placeholder', async () => {
    await render(<ExploreScreen />);

    expect(
      screen.getByPlaceholderText('Buscar quadra, bairro ou horário...'),
    ).toBeTruthy();
  });

  /**
   * Covers: S6 — Explore
   * Criterion: "typing filters the results list client-side."
   */
  it('filters the results client-side as the user types', async () => {
    await render(<ExploreScreen />);

    // all three rendered initially
    expect(screen.getByText('Arena Sky Beach')).toBeTruthy();
    expect(screen.getByText('Quadra do Parque')).toBeTruthy();
    expect(screen.getByText('Centro Olímpico')).toBeTruthy();

    await type(
      screen.getByPlaceholderText('Buscar quadra, bairro ou horário...'),
      'arena',
    );

    expect(screen.getByText('Arena Sky Beach')).toBeTruthy();
    expect(screen.queryByText('Quadra do Parque')).toBeNull();
    expect(screen.queryByText('Centro Olímpico')).toBeNull();
    // count reflects the filtered length
    expect(screen.getByText('1 partidas encontradas')).toBeTruthy();
  });

  /**
   * Covers: S6 — Explore
   * Criterion: "a clear (X) resets it."
   */
  it('resets the search when the clear (X) control is tapped', async () => {
    await render(<ExploreScreen />);

    const input = screen.getByPlaceholderText(
      'Buscar quadra, bairro ou horário...',
    );
    await type(input, 'arena');
    expect(screen.queryByText('Quadra do Parque')).toBeNull();

    // the clear control only appears with text present
    await press(screen.getByLabelText('Limpar busca'));

    // input cleared and all results back
    expect(input.props.value).toBe('');
    expect(screen.getByText('Arena Sky Beach')).toBeTruthy();
    expect(screen.getByText('Quadra do Parque')).toBeTruthy();
    expect(screen.getByText('Centro Olímpico')).toBeTruthy();
    expect(screen.getByText('3 partidas encontradas')).toBeTruthy();
  });

  // --------------------------------------------------------------- filter chips
  it('renders the Filtros button and the quick chips, none selected by default', async () => {
    await render(<ExploreScreen />);

    expect(screen.getByLabelText('Filtros')).toBeTruthy();
    for (const label of ['Hoje', 'Fim de semana', 'Com vaga', 'Grátis', 'Iniciante', '6x6']) {
      expect(selectedOfChip(label)).toBe(false);
    }
  });

  it('filters to INICIANTE matches and highlights the chip when "Iniciante" is selected', async () => {
    await render(<ExploreScreen />);

    // [0] is the chip; the level badge of a card carries the same text
    await press(screen.getAllByText('Iniciante')[0]!);

    expect(selectedOfChip('Iniciante')).toBe(true);
    expect(screen.getByText('Quadra do Parque')).toBeTruthy();
    expect(screen.queryByText('Arena Sky Beach')).toBeNull();
    expect(screen.queryByText('Centro Olímpico')).toBeNull();
    expect(screen.getByText('1 partidas encontradas')).toBeTruthy();
    // the quick chip counts as an active filter on the Filtros button
    expect(screen.getByLabelText('Filtros, 1 ativos')).toBeTruthy();
  });

  it('combines quick chips: 6x6 + Grátis leaves only the free 6X6 match', async () => {
    await render(<ExploreScreen />);

    await press(screen.getByText('6x6'));
    expect(screen.getByText('2 partidas encontradas')).toBeTruthy();

    await press(screen.getAllByText('Grátis')[0]!);
    expect(screen.getByText('1 partidas encontradas')).toBeTruthy();
    expect(screen.getByText('Quadra do Parque')).toBeTruthy();

    // tapping again turns it off
    await press(screen.getAllByText('Grátis')[0]!);
    expect(screen.getByText('2 partidas encontradas')).toBeTruthy();
  });

  it('lists nearest first by default', async () => {
    await render(<ExploreScreen />);

    const order = screen
      .getAllByText(/^(Arena Sky Beach|Quadra do Parque|Centro Olímpico)$/)
      .map((c) => c.props.children);
    expect(order).toEqual(['Quadra do Parque', 'Centro Olímpico', 'Arena Sky Beach']);
  });

  it('applies the filter sheet only on "Ver", counting results live', async () => {
    await render(<ExploreScreen />);

    await press(screen.getByLabelText('Filtros'));
    expect(screen.getByTestId('explore-filter-sheet')).toBeTruthy();
    expect(screen.getByText('Ver 3 partidas')).toBeTruthy();

    // the sheet's chips render last (after the cards' level badges)
    await press(screen.getAllByText('Avançado').at(-1)!);
    expect(screen.getByText('Ver 1 partida')).toBeTruthy();
    // nothing applied on screen yet
    expect(screen.getByText('3 partidas encontradas')).toBeTruthy();

    await press(screen.getByText('Ver 1 partida'));
    expect(screen.getByText('1 partidas encontradas')).toBeTruthy();
    expect(screen.getByText('Centro Olímpico')).toBeTruthy();
    expect(screen.getByLabelText('Filtros, 1 ativos')).toBeTruthy();
  });

  it('filters by distance from the sheet', async () => {
    await render(<ExploreScreen />);

    await press(screen.getByLabelText('Filtros'));
    // The distance is a slider now: from "any" (50) down to 2 km, step by step.
    expect(screen.getByText('Qualquer distância')).toBeTruthy();
    const slider = screen.getByLabelText('Distância máxima');
    for (let i = 0; i < 48; i++) {
      await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    }
    expect(screen.getByText('Até 2 km')).toBeTruthy();
    await press(screen.getByText('Ver 1 partida'));

    expect(screen.getByText('Quadra do Parque')).toBeTruthy();
    expect(screen.getByText('1 partidas encontradas')).toBeTruthy();
  });

  // --------------------------------------------------------------- map preview
  /**
   * Covers: S6 — Explore
   * Criterion: "An inline map preview renders with a 'N jogos por perto' badge and a
   *  floating selected-venue card with a 'Ver' CTA."
   */
  it('renders the map preview with a live-games badge and a static venue card + Ver CTA', async () => {
    await render(<ExploreScreen />);

    // preview surface is an accessible button
    expect(screen.getByLabelText('Abrir mapa de partidas')).toBeTruthy();
    // live-games badge (count reflects loaded list = 3)
    expect(screen.getByText('3 jogos por perto')).toBeTruthy();
    // static venue card copy + Ver CTA
    // The card features the closest match of the list (Quadra do Parque, 1,2 km).
    expect(screen.getByText('1,2 km · Grátis')).toBeTruthy();
    expect(screen.getByText('Ver')).toBeTruthy();
  });

  /**
   * Covers: S6 — Explore
   * Criterion: "tapping the preview ... navigates to S17 (/explore/map)."
   */
  it('navigates to /explore/map when the map preview is tapped', async () => {
    await render(<ExploreScreen />);

    await press(screen.getByLabelText('Abrir mapa de partidas'));

    expect(mockPush).toHaveBeenCalledWith('/explore/map');
  });

  /**
   * Covers: S6 — Explore
   * Criterion: "tapping ... 'Ver' navigates to S17 (/explore/map)."
   */
  it('navigates to /explore/map when the venue card "Ver" CTA is tapped', async () => {
    await render(<ExploreScreen />);

    await press(screen.getByText('Ver'));

    expect(mockPush).toHaveBeenCalledWith('/explore/map');
  });

  // --------------------------------------------------------- count + grid/list
  /**
   * Covers: S6 — Explore
   * Criterion: "A 'N partidas encontradas' count reflects the current (filtered)
   *  result length and updates as filters change."
   */
  it('shows a count that matches the source list and updates when a chip filters', async () => {
    await render(<ExploreScreen />);

    expect(screen.getByText('3 partidas encontradas')).toBeTruthy();

    // [0] is the chip; the level badge of a card carries the same text
    await press(screen.getAllByText('Iniciante')[0]!);
    expect(screen.getByText('1 partidas encontradas')).toBeTruthy();
  });

  /**
   * Covers: S6 — Explore
   * Criterion: "A Grade/Lista toggle switches the results between a 2-col grid and
   *  a 1-col list of MatchCards using the same data."
   */
  it('toggles between Grade and Lista, keeping the same MatchCards', async () => {
    await render(<ExploreScreen />);

    // default = Grade
    expect(screen.getByText('Grade')).toBeTruthy();
    expect(screen.getByTestId('icon-layout-grid')).toBeTruthy();

    await press(screen.getByText('Grade'));

    // now Lista
    expect(screen.getByText('Lista')).toBeTruthy();
    expect(screen.getByTestId('icon-list')).toBeTruthy();
    // same data still rendered
    expect(screen.getByText('Arena Sky Beach')).toBeTruthy();
    expect(screen.getByText('Quadra do Parque')).toBeTruthy();
    expect(screen.getByText('Centro Olímpico')).toBeTruthy();

    // toggle back to Grade
    await press(screen.getByText('Lista'));
    expect(screen.getByText('Grade')).toBeTruthy();
    expect(screen.getByText('Arena Sky Beach')).toBeTruthy();
  });

  // ---------------------------------------------------------------- results
  /**
   * Covers: S6 — Explore
   * Criterion: "The results render dark MatchCards from useNearbyMatches."
   */
  it('renders dark MatchCards from useNearbyMatches', async () => {
    await render(<ExploreScreen />);

    expect(screen.getByText('Arena Sky Beach')).toBeTruthy();
    // dark-card meta (format/level pills + distance) confirms it's the MatchCard
    expect(screen.getByText('4X4')).toBeTruthy();
    expect(screen.getByText('Intermediário')).toBeTruthy();
    // distance rendered with pt-BR comma (also present in the card meta)
    expect(screen.getAllByText('3,4 km').length).toBeGreaterThan(0);
  });

  /**
   * Covers: S6 — Explore
   * Criterion: "tapping a card navigates to S12 with its id."
   */
  it('navigates to /matches/[id] with the match id when a card is tapped', async () => {
    await render(<ExploreScreen />);

    await press(screen.getByLabelText(/Arena Sky Beach/));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/matches/[id]',
      params: { id: 'near-1' },
    });
  });

  // --------------------------------------------------- loading / empty / error
  /**
   * Covers: S6 — Explore
   * Criterion: "Results show a loading placeholder while pending."
   */
  it('shows the loading placeholder while the query is pending', async () => {
    mockNearby.isPending = true;
    mockNearby.data = undefined;
    await render(<ExploreScreen />);

    // chrome still renders immediately
    expect(screen.getByText('EXPLORAR')).toBeTruthy();
    expect(
      screen.getByPlaceholderText('Buscar quadra, bairro ou horário...'),
    ).toBeTruthy();

    // no cards, no empty/error copy while pending
    expect(screen.queryByText('Arena Sky Beach')).toBeNull();
    expect(
      screen.queryByText('Nenhuma partida perto de você ainda'),
    ).toBeNull();
    expect(screen.queryByText('Não foi possível carregar')).toBeNull();
  });

  /**
   * Covers: S6 — Explore
   * Criterion: "a 'no nearby' empty state when the source list is empty."
   */
  it('shows the "no nearby" empty state when the source list is empty', async () => {
    mockNearby.data = [];
    await render(<ExploreScreen />);

    expect(
      screen.getByText('Nenhuma partida perto de você ainda'),
    ).toBeTruthy();
    // the source-empty state is NOT the filtered-out one
    expect(
      screen.queryByText('Nenhuma partida encontrada para esta busca'),
    ).toBeNull();
    expect(screen.queryByText('Limpar filtros')).toBeNull();
    expect(screen.getByText('0 partidas encontradas')).toBeTruthy();
  });

  /**
   * Covers: S6 — Explore
   * Criterion: "a distinct 'no match for this search' empty state (with 'Limpar
   *  filtros') when filters exclude everything."
   */
  it('shows the distinct "no match for this search" empty state when filters exclude everything', async () => {
    await render(<ExploreScreen />);

    await type(
      screen.getByPlaceholderText('Buscar quadra, bairro ou horário...'),
      'zzz-no-such-match',
    );

    expect(
      screen.getByText('Nenhuma partida encontrada para esta busca'),
    ).toBeTruthy();
    expect(screen.getByText('Limpar filtros')).toBeTruthy();
    // distinct from the source-empty copy
    expect(
      screen.queryByText('Nenhuma partida perto de você ainda'),
    ).toBeNull();
    expect(screen.getByText('0 partidas encontradas')).toBeTruthy();
  });

  /**
   * Covers: S6 — Explore
   * Criterion: "'Limpar filtros' ... resets query/activeFilter."
   */
  it('resets search and chip from the "Limpar filtros" empty-state action', async () => {
    await render(<ExploreScreen />);

    const input = screen.getByPlaceholderText(
      'Buscar quadra, bairro ou horário...',
    );
    await type(input, 'zzz-no-such-match');
    expect(
      screen.getByText('Nenhuma partida encontrada para esta busca'),
    ).toBeTruthy();

    await press(screen.getByText('Limpar filtros'));

    expect(input.props.value).toBe('');
    expect(screen.getByText('Arena Sky Beach')).toBeTruthy();
    expect(screen.getByText('3 partidas encontradas')).toBeTruthy();
    expect(selectedOfChip('Hoje')).toBe(false);
  });

  /**
   * Covers: S6 — Explore
   * Criterion: "an error shows a retry row." — error copy + retry that refetches.
   */
  it('shows the error/retry row and refetches on retry', async () => {
    mockNearby.isError = true;
    mockNearby.data = undefined;
    await render(<ExploreScreen />);

    expect(screen.getByText('Não foi possível carregar')).toBeTruthy();

    await press(screen.getByText('Tentar novamente'));
    expect(mockNearby.refetch).toHaveBeenCalledTimes(1);
  });

  // ------------------------------------------- permissions + exclusions (scope)
  /**
   * Covers: S6 — Explore
   * Criterion: "No location permission prompt fires on S6." — the screen reads
   *  nearby with fixed placeholder params; no permission/location copy renders.
   */
  it('reads nearby with placeholder geo and never requests device location', async () => {
    await render(<ExploreScreen />);

    expect(mockNearby.lastParams).toEqual({
      lat: -23.55,
      lon: -46.63,
      radiusKm: 50,
    });
    expect(screen.queryByText(/permiss[ãa]o/i)).toBeNull();
    expect(screen.queryByText(/localiza[çc][ãa]o/i)).toBeNull();
  });

  /**
   * Covers: S6 — Explore
   * Criterion: "no 'Quadras próximas' / 'Jogadores' sections and no player-search
   *  results render."
   */
  it('renders no Quadras próximas / Jogadores sections or player-search results', async () => {
    await render(<ExploreScreen />);

    expect(screen.queryByText(/quadras pr[óo]ximas/i)).toBeNull();
    expect(screen.queryByText(/jogadores/i)).toBeNull();
    expect(screen.queryByTestId('venues-carousel')).toBeNull();
    expect(screen.queryByTestId('player-results')).toBeNull();
  });
});

/**
 * Reads the `accessibilityState.selected` of a FilterChip given its label.
 * The chip's `Pressable` carries the accessibility state; the label `Text` is its
 * descendant, so we walk up to the nearest node exposing accessibilityState.
 */
function selectedOfChip(label: string): boolean | undefined {
  // [0]: the chips render above the cards, whose level badge can repeat a label.
  let node: any = screen.getAllByText(label)[0];
  while (node) {
    const state = node.props?.accessibilityState;
    if (state && 'selected' in state) return state.selected;
    node = node.parent;
  }
  return undefined;
}
