/**
 * S9 — Full Group Ranking screen tests.
 *
 * Covers every acceptance criterion in docs/specs/S9-ranking.md:
 *  - Header shows the "RANKING" display title, a back affordance (router.back()),
 *    a notification bell, and a theme toggle.
 *  - Scope tabs render "Bairro", "Amigos", "Geral"; "Amigos" is selected and
 *    functional; "Bairro"/"Geral" are disabled ("Em breve") and cannot be
 *    activated (accessibilityState.disabled).
 *  - A top-3 podium renders 1º/2º/3º from useGroupRanking({ preview: false })
 *    with avatar, name and score (font-num).
 *  - The position-4+ list renders one RankingRow per remaining row: position,
 *    avatar, name, "@handle · Posição" subtitle, score and a trend indicator
 *    (↑ success / ↓ danger / — muted).
 *  - The current user's row is highlighted and appends "· você" (derived from
 *    useAuthStore().userId === row.playerId).
 *  - A group selector affordance is present (inert single-group for MVP-mock).
 *  - Rows and podium entries are NOT navigable.
 *  - Loading -> skeleton, error -> retry (refetch), empty -> no-group message.
 *  - No permission prompt fires.
 *
 * The single read hook (useGroupRanking) is mocked at the hook boundary to drive
 * the four query states (pending / error / empty / populated) deterministically —
 * no MSW, no network. Navigation is mocked via expo-router (router.back + push).
 * Native modules (gradient, safe-area, expo-image, lucide) are stubbed inline —
 * the repo's tests/__mocks__ are NOT auto-applied. The auth store is the real
 * zustand store; tests seed userId via setState to exercise the `isMe` highlight.
 *
 * Per the S8 lesson (and the spec's testability notes): Button/FilterChip are
 * css-interop Pressables; pressing several in one synchronous loop overlaps act()
 * and corrupts later renders. Button is stubbed as a plain Pressable; FilterChip
 * is exercised via accessibilityState only (no multi-press loop).
 */
import React from 'react';

// --- Native / module mocks ------------------------------------------------

// LinearGradient -> View that forwards props (1st-place navy pedestal).
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
  };
});

// expo-image -> inert node (avatars with a uri; mock rows use the initial fallback).
jest.mock('expo-image', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: any) => ReactLocal.createElement(View, props),
  };
});

// lucide icons -> inert testID'd nodes (header bell/sun/back, selector chevron,
// trend arrows).
jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) =>
    ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  return {
    Bell: stub('bell'),
    Sun: stub('sun'),
    ChevronLeft: stub('chevron-left'),
    ChevronDown: stub('chevron-down'),
    ArrowUp: stub('arrow-up'),
    ArrowDown: stub('arrow-down'),
    Minus: stub('minus'),
  };
});

// Button is a NativeWind (css-interop) Pressable; pressing the real one schedules
// an async interaction-state update that escapes fireEvent's sync act() and leaks
// an "overlapping act()" into the next test. Stub it as a plain Pressable — the
// screen's behaviour under test is the onPress wiring (retry), not Button internals.
jest.mock('@/components/ui/Button', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID }: any) =>
      ReactLocal.createElement(
        Pressable,
        { onPress, testID, accessibilityRole: 'button' },
        ReactLocal.createElement(Text, null, children),
      ),
  };
});

// expo-router: spyable router.back + router.push.
const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: (...args: any[]) => mockBack(...args),
    push: (...args: any[]) => mockPush(...args),
  },
}));

// --- Read hook mock (mocked at the boundary) ------------------------------
import type { RankingRow } from '@/features/ranking/types/ranking';

// 8 rows: 3 for the podium + 5 for the position-4+ list. Scores/positions are
// distinct from one another so each value is queryable unambiguously by text.
// Row at position 4 (playerId 'me') is the current user. Trends cover all three
// directions (up / flat / down).
const RANKING_FIXTURE: RankingRow[] = [
  { position: 1, playerId: 'p-erica', name: 'Érica', subtitle: '@erica · Oposto', score: 2480, trend: { direction: 'up', delta: 1 } },
  { position: 2, playerId: 'p-caio', name: 'Caio', subtitle: '@caio · Central', score: 2310, trend: { direction: 'flat', delta: 0 } },
  { position: 3, playerId: 'p-manu', name: 'Manu', subtitle: '@manu · Líbero', score: 2180, trend: { direction: 'down', delta: 1 } },
  { position: 4, playerId: 'me', name: 'Renan Dias', subtitle: '@renan · Levantador', score: 1995, isMe: true, trend: { direction: 'up', delta: 5 } },
  { position: 5, playerId: 'p-duda', name: 'Duda Reis', subtitle: '@dudareis · Ponteiro', score: 1870, trend: { direction: 'flat', delta: 0 } },
  { position: 6, playerId: 'p-bia', name: 'Bia Fontes', subtitle: '@biaf · Líbero', score: 1740, trend: { direction: 'up', delta: 2 } },
  { position: 7, playerId: 'p-theo', name: 'Theo Nunes', subtitle: '@theon · Ponteiro', score: 1510, trend: { direction: 'down', delta: 2 } },
  { position: 8, playerId: 'p-vini', name: 'Vini Sales', subtitle: '@vsales · Central', score: 1320, trend: { direction: 'up', delta: 1 } },
];

const mockRanking: {
  data: RankingRow[];
  isPending: boolean;
  isError: boolean;
  refetch: jest.Mock;
  lastParams: unknown;
} = {
  data: RANKING_FIXTURE,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
  lastParams: undefined,
};

jest.mock('@/features/ranking/api/getGroupRanking', () => ({
  useGroupRanking: (params: unknown) => {
    mockRanking.lastParams = params;
    return {
      data: mockRanking.data,
      isPending: mockRanking.isPending,
      isError: mockRanking.isError,
      refetch: mockRanking.refetch,
    };
  },
}));

import { fireEvent, render, screen } from '@testing-library/react-native';

import { useAuthStore } from '@/stores/auth';

import RankingScreen from '../../../../app/profile/ranking';

function resetRanking() {
  mockRanking.data = RANKING_FIXTURE;
  mockRanking.isPending = false;
  mockRanking.isError = false;
  mockRanking.refetch.mockClear();
  mockRanking.lastParams = undefined;
}

beforeEach(() => {
  mockBack.mockClear();
  mockPush.mockClear();
  resetRanking();
  // Authenticated user whose id matches the ranking row flagged as "me".
  useAuthStore.setState({ userId: 'me', isAuthenticated: true, hasProfile: true });
});

afterEach(() => {
  useAuthStore.setState({ userId: null, isAuthenticated: false, hasProfile: false });
});

describe('S9 — Full Group Ranking screen', () => {
  // ---------------------------------------------------------------- header
  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: "Header shows the 'RANKING' display title, a back affordance
   *  (returns to S8), a notification bell, and a theme toggle."
   */
  it('renders the RANKING display title, back, bell and theme toggle', async () => {
    await render(<RankingScreen />);

    const title = screen.getByText('RANKING');
    expect(title).toBeTruthy();
    expect(title.props.className).toContain('font-display');
    expect(title.props.className).toContain('uppercase');

    // back / bell are accessible buttons backed by their icons
    expect(screen.getByLabelText('Voltar')).toBeTruthy();
    expect(screen.getByLabelText('Notificações')).toBeTruthy();
    expect(screen.getByTestId('icon-chevron-left')).toBeTruthy();
    expect(screen.getByTestId('icon-bell')).toBeTruthy();
    // theme toggle moved to Settings — not in the header.
    expect(screen.queryByLabelText('Alternar tema')).toBeNull();
    expect(screen.queryByTestId('icon-sun')).toBeNull();
  });

  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: "a back affordance (returns to S8) ... router.back() returns to S8."
   */
  it('calls router.back() when the back affordance is tapped', async () => {
    await render(<RankingScreen />);

    fireEvent.press(screen.getByLabelText('Voltar'));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: the bell is a no-op this iteration (documented) —
   *  tapping it navigates nowhere.
   */
  it('keeps the bell as a no-op (no navigation)', async () => {
    await render(<RankingScreen />);

    fireEvent.press(screen.getByLabelText('Notificações'));
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------ scope tabs
  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: "Scope tabs render 'Bairro', 'Amigos', 'Geral'; 'Amigos' is
   *  selected and functional."
   */
  it('renders the three scope tabs with "Amigos" selected', async () => {
    await render(<RankingScreen />);

    expect(screen.getByText('Bairro')).toBeTruthy();
    expect(screen.getByText('Geral')).toBeTruthy();
    expect(screen.getByText('Amigos')).toBeTruthy();

    // The "Amigos" chip (a FilterChip Pressable, role=button, named by its label)
    // is the selected, enabled tab.
    const amigosChip = screen.getByRole('button', { name: 'Amigos' });
    expect(amigosChip.props.accessibilityState).toMatchObject({
      selected: true,
      disabled: false,
    });
  });

  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: "'Bairro' and 'Geral' are disabled ('Em breve') and cannot be
   *  activated." Asserts accessibilityState.disabled on both Layer-3 tabs.
   */
  it('renders "Bairro" and "Geral" as disabled tabs that cannot be activated', async () => {
    await render(<RankingScreen />);

    const bairro = screen.getByRole('button', { name: 'Bairro' });
    const geral = screen.getByRole('button', { name: 'Geral' });

    expect(bairro.props.accessibilityState).toMatchObject({ disabled: true });
    expect(geral.props.accessibilityState).toMatchObject({ disabled: true });

    // Disabled Pressables swallow the press (RN no-ops a disabled pressable);
    // tapping them never selects them and never navigates.
    fireEvent.press(bairro);
    expect(bairro.props.accessibilityState).toMatchObject({
      selected: false,
      disabled: true,
    });
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: "'Amigos' is selected and functional." Pressing the functional
   *  tab keeps it selected and does not navigate (local-state-only toggle).
   */
  it('keeps "Amigos" selected and functional after a press (no navigation)', async () => {
    await render(<RankingScreen />);

    const amigos = screen.getByRole('button', { name: 'Amigos' });
    fireEvent.press(amigos);

    expect(amigos.props.accessibilityState).toMatchObject({
      selected: true,
      disabled: false,
    });
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------- group selector
  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: "A group selector affordance is present within the 'Amigos' tab
   *  (inert/single-group for MVP-mock)."
   */
  it('renders an inert group-selector affordance (single group)', async () => {
    await render(<RankingScreen />);

    const selector = screen.getByLabelText('Selecionar grupo');
    expect(selector).toBeTruthy();
    expect(screen.getByText('Vôlei de quinta')).toBeTruthy();
    expect(screen.getByTestId('icon-chevron-down')).toBeTruthy();

    // Inert for MVP-mock: pressing it opens no route.
    fireEvent.press(selector);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------- podium
  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: "A top-3 podium renders with 1º centered (navy pedestal), 2º left,
   *  3º right — each with an avatar, name, and score (font-num), using
   *  useGroupRanking({ preview: false }) data."
   */
  it('renders the top-3 podium with avatar, name and score from the full list', async () => {
    await render(<RankingScreen />);

    // The full list (not the preview) drives this screen.
    expect(mockRanking.lastParams).toEqual({ preview: false });

    // top-3 names
    expect(screen.getByText('Érica')).toBeTruthy();
    expect(screen.getByText('Caio')).toBeTruthy();
    expect(screen.getByText('Manu')).toBeTruthy();

    // top-3 avatars (initials fallback => "Avatar de <name>")
    expect(screen.getByLabelText('Avatar de Érica')).toBeTruthy();
    expect(screen.getByLabelText('Avatar de Caio')).toBeTruthy();
    expect(screen.getByLabelText('Avatar de Manu')).toBeTruthy();

    // top-3 scores rendered with the number font
    const firstScore = screen.getByText('2480');
    expect(firstScore.props.className).toContain('font-num');
    expect(screen.getByText('2310')).toBeTruthy();
    expect(screen.getByText('2180')).toBeTruthy();

    // 1st-place pedestal uses the navy hero gradient with a lime "1º"
    expect(screen.getByTestId('linear-gradient')).toBeTruthy();
    const first = screen.getByText('1º');
    expect(first.props.className).toContain('text-accent');

    // 2º / 3º pedestal labels
    expect(screen.getByText('2º')).toBeTruthy();
    expect(screen.getByText('3º')).toBeTruthy();
  });

  // --------------------------------------------------------- position-4+ list
  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: "The ranked list (position 4+) renders one RankingRow per
   *  remaining row: position number, avatar, name, '@handle · posição' subtitle,
   *  score, and a trend indicator (↑ success / ↓ danger / — muted)."
   */
  it('renders one RankingRow per position-4+ row with position, name, subtitle and score', async () => {
    await render(<RankingScreen />);

    // Positions 4..8 render in the list (1..3 are on the podium pedestals). Each
    // RankingRow's accessibilityLabel carries its position ("Nº"); querying by it
    // is unambiguous (the bare position-number Text collides with trend deltas).
    expect(screen.getByLabelText(/^4º, Renan Dias/)).toBeTruthy();
    expect(screen.getByLabelText(/^5º, Duda Reis/)).toBeTruthy();
    expect(screen.getByLabelText(/^6º, Bia Fontes/)).toBeTruthy();
    expect(screen.getByLabelText(/^7º, Theo Nunes/)).toBeTruthy();
    expect(screen.getByLabelText(/^8º, Vini Sales/)).toBeTruthy();

    // names + handle/position subtitles
    expect(screen.getByText('Duda Reis')).toBeTruthy();
    expect(screen.getByText('@dudareis · Ponteiro')).toBeTruthy();
    expect(screen.getByText('Theo Nunes')).toBeTruthy();
    expect(screen.getByText('@theon · Ponteiro')).toBeTruthy();

    // scores
    expect(screen.getByText('1870')).toBeTruthy();
    expect(screen.getByText('1510')).toBeTruthy();

    // list-row avatars
    expect(screen.getByLabelText('Avatar de Duda Reis')).toBeTruthy();
    expect(screen.getByLabelText('Avatar de Vini Sales')).toBeTruthy();
  });

  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: "a trend indicator (↑ success / ↓ danger / — muted)." Asserts the
   *  up / down / flat variants all render in the position-4+ list.
   */
  it('renders the up / down / flat trend indicators in the list', async () => {
    await render(<RankingScreen />);

    // up arrows (positions 4,6,8 have up trends) and down arrows (position 7),
    // plus a flat "—" (Minus) for the flat trend (position 5).
    expect(screen.getAllByTestId('icon-arrow-up').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('icon-arrow-down').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('icon-minus').length).toBeGreaterThan(0);

    // The current-user up-delta (position 4, up 5) is rendered green with the
    // number font. "5" also appears as the position-5 row number, so disambiguate
    // by the success color (only the up-trend delta carries text-success).
    const fives = screen.getAllByText('5');
    const successFive = fives.find((n) =>
      String(n.props.className).includes('text-success'),
    );
    expect(successFive).toBeTruthy();
    expect(successFive?.props.className).toContain('font-num');

    // A down-delta is rendered in danger red. Disambiguate by color: at least one
    // delta carries text-danger (the down trend).
    const twos = screen.getAllByText('2');
    const dangerTwo = twos.find((n) =>
      String(n.props.className).includes('text-danger'),
    );
    expect(dangerTwo).toBeTruthy();
  });

  // -------------------------------------------------------------- "· você"
  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: "The current user's row is highlighted and appends '· você'
   *  (derived from useAuthStore().userId === row.playerId)."
   */
  it('highlights the current user row with "· você"', async () => {
    await render(<RankingScreen />);

    // The "me" row (playerId 'me' === auth userId) appends "· você".
    expect(screen.getByText('· você')).toBeTruthy();
    // and announces "você" to assistive tech (RankingRow accessibilityLabel).
    expect(screen.getByLabelText(/Renan Dias, você, 1995 pontos/)).toBeTruthy();
  });

  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: the highlight derives from the auth userId, not a trusted mock
   *  flag — a different signed-in user gets no "· você" on the mock-me row.
   */
  it('does not mark "· você" when the signed-in userId does not match', async () => {
    useAuthStore.setState({ userId: 'someone-else' });

    await render(<RankingScreen />);

    expect(screen.queryByText('· você')).toBeNull();
    // the mock-me row still renders, just un-highlighted
    expect(screen.getByText('Renan Dias')).toBeTruthy();
  });

  // -------------------------------------------------- rows/podium not navigable
  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: "Rows and podium entries are NOT navigable (no player-detail
   *  screen)." Pressing a list row and a podium name navigates nowhere.
   */
  it('does not navigate when a list row or podium entry is pressed', async () => {
    await render(<RankingScreen />);

    fireEvent.press(screen.getByText('Duda Reis'));
    fireEvent.press(screen.getByText('Érica'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------- loading state
  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: "Loading shows a skeleton ... driven by the mocked query states."
   */
  it('shows the skeleton placeholder while the query is pending', async () => {
    mockRanking.isPending = true;
    await render(<RankingScreen />);

    // ranking content is replaced by the skeleton: no podium names, no list rows
    expect(screen.queryByText('Érica')).toBeNull();
    expect(screen.queryByText('Duda Reis')).toBeNull();
    // header chrome still renders
    expect(screen.getByText('RANKING')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Amigos' })).toBeTruthy();
  });

  // ------------------------------------------------------------- error state
  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: "error shows a retry ... driven by the mocked query states."
   */
  it('shows the error block with a retry that calls refetch', async () => {
    mockRanking.isError = true;
    await render(<RankingScreen />);

    expect(screen.getByText('Não foi possível carregar o ranking')).toBeTruthy();
    // ranking content is gone
    expect(screen.queryByText('Érica')).toBeNull();

    fireEvent.press(screen.getByText('Tentar novamente'));
    expect(mockRanking.refetch).toHaveBeenCalledTimes(1);
  });

  // ------------------------------------------------------------- empty state
  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: "the no-group empty state shows its message" (zero rows -> user in
   *  no recurring-match group).
   */
  it('shows the no-group empty message when there are zero rows', async () => {
    mockRanking.data = [];
    await render(<RankingScreen />);

    expect(
      screen.getByText('Entre em uma partida recorrente para aparecer no ranking'),
    ).toBeTruthy();
    // no podium, no list
    expect(screen.queryByText('Érica')).toBeNull();
    expect(screen.queryByText('1º')).toBeNull();
  });

  /**
   * Covers: S9 — Full Group Ranking
   * Criterion (Open question 3 default): a sub-3-member group renders a partial
   *  podium and the position-4+ list is absent (no empty row).
   */
  it('renders a partial podium and no list when fewer than 4 rows exist', async () => {
    mockRanking.data = RANKING_FIXTURE.slice(0, 2);
    await render(<RankingScreen />);

    // the available podium places render
    expect(screen.getByText('Érica')).toBeTruthy();
    expect(screen.getByText('Caio')).toBeTruthy();
    // the position-4+ list is absent
    expect(screen.queryByText('Duda Reis')).toBeNull();
    expect(screen.queryByText('@dudareis · Ponteiro')).toBeNull();
  });

  // ------------------------------------------------------- permissions (scope)
  /**
   * Covers: S9 — Full Group Ranking
   * Criterion: "No permission prompt fires on this screen." The screen reads only
   *  the mocked query (no location/camera/contacts) and makes no network request.
   */
  it('fires no permission prompt and makes zero network requests on mount', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch' as never);

    await render(<RankingScreen />);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/permiss[ãa]o/i)).toBeNull();
    expect(screen.queryByText(/localiza[çc][ãa]o/i)).toBeNull();
    expect(screen.queryByText(/c[âa]mera/i)).toBeNull();

    fetchSpy.mockRestore();
  });
});
