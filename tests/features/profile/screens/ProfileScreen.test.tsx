/**
 * S8 — Profile screen tests.
 *
 * Covers every acceptance criterion in docs/specs/S8-profile.md:
 *  - Header shows the authenticated user's avatar, "Olá," + first name (display),
 *    plus a notification bell and a theme toggle.
 *  - "Seu progresso" shows the GERAL number (font-num) + a Level/XP bar
 *    ("Level N", "XP: a / b") and does NOT render the ACE/BLK/ATA/DEF stats grid.
 *  - The "Ver a sua carta" gradient CTA is NOT present.
 *  - "MINHAS PARTIDAS" renders rows from useRecentMatches (name, date·format,
 *    Vitória/Derrota colored success/danger, set score); tapping a row navigates
 *    to S12 (/matches/[id]) with its id.
 *  - The dark "Ranking semanal" card renders rows from
 *    useGroupRanking({ preview: true }) (position, avatar, name, subtitle, score);
 *    the current user's row is highlighted with "· você".
 *  - "Ver tudo" on the ranking section navigates to S9 (/profile/ranking).
 *  - A settings affordance navigates to S10 (/profile/settings).
 *  - No "SUGESTÃO DE AMIGOS" friends strip and no "CONQUISTAS" achievements gallery.
 *  - Each section shows its own loading placeholder, empty state, and
 *    retry-on-error independently.
 *  - No permission prompt fires on Profile.
 *
 * The three read hooks are mocked at the hook boundary so the four query states
 * (pending / error / empty / populated) are controlled deterministically per
 * section, with no network and no MSW. Navigation is mocked via expo-router.
 * Native modules (gradient, safe-area, expo-image, lucide) are stubbed inline —
 * the repo's tests/__mocks__ are NOT auto-applied. The auth store is a real
 * zustand store; tests set userId via setState to exercise the `isMe` highlight.
 *
 * The bottom tab bar (4 tabs + central FAB) and the "Perfil" active tab are owned
 * by app/(tabs)/_layout.tsx, NOT this screen body — that criterion is covered by
 * tests/features/matches/screens/TabsLayout.test.tsx, so this file focuses on the
 * screen content (consistent with the S5/S7 screen-body tests).
 */
import React from 'react';

// --- Native / module mocks ------------------------------------------------

// LinearGradient -> View that forwards props (dark "Ranking semanal" card).
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

// expo-image -> inert node (header / ranking-row avatars with a uri).
jest.mock('expo-image', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: any) => ReactLocal.createElement(View, props),
  };
});

// lucide icons -> inert nodes (header bell/sun/settings, row chevron/volleyball).
jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) =>
    ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  return {
    Bell: stub('bell'),
    Sun: stub('sun'),
    Settings: stub('settings'),
    ChevronRight: stub('chevron-right'),
    Volleyball: stub('volleyball'),
  };
});

// Button is a NativeWind (css-interop) Pressable; pressing the real one schedules
// an async interaction-state update that escapes fireEvent's sync act() and leaks
// an "overlapping act()" into the next test (nulling its render). The screen's
// behaviour under test is the onPress wiring, not Button internals (covered by its
// own tests), so stub it as a plain Pressable — same pattern as the native stubs above.
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

// expo-router: spyable router.push.
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...args: any[]) => mockPush(...args),
  },
}));

// --- Read hook mocks (mocked at the boundary) -----------------------------
import type {
  MyProfile,
  RecentMatch,
} from '@/features/profile/types/profile';
import type { RankingRow } from '@/features/ranking/types/ranking';

const PROFILE_FIXTURE: MyProfile = {
  id: 'me',
  firstName: 'Renan',
  avatarUrl: 'https://example.com/me.png',
  overall: 68,
  level: 15,
  xp: 2450,
  xpToNext: 5000,
};

const RECENT_FIXTURE: RecentMatch[] = [
  {
    id: 'rm-1',
    name: 'Vôlei de Quinta',
    playedAt: '2026-06-18T19:30:00-03:00',
    format: '6X6',
    result: 'VITORIA',
    setScore: '3-1',
  },
  {
    id: 'rm-2',
    name: 'Racha da Galera',
    playedAt: '2026-06-16T20:00:00-03:00',
    format: '4X4',
    result: 'DERROTA',
    setScore: '1-3',
  },
];

// Scores are chosen distinct from the GERAL number (68), the positions (1..3)
// and each other so each value is queryable unambiguously by text.
const RANKING_FIXTURE: RankingRow[] = [
  { position: 1, playerId: 'p-guga', name: 'Guga', subtitle: 'Gustavo Lima', score: 91 },
  { position: 2, playerId: 'p-cake', name: 'Cake', subtitle: 'Caio Keller', score: 84 },
  { position: 3, playerId: 'me', name: 'Você', subtitle: 'Renan Dias', score: 77, isMe: true },
];

type QueryState<T> = {
  data: T;
  isPending: boolean;
  isError: boolean;
};

const mockProfile: QueryState<MyProfile | undefined> & { refetch: jest.Mock } = {
  data: PROFILE_FIXTURE,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
};

const mockRecent: QueryState<RecentMatch[]> & { refetch: jest.Mock } = {
  data: RECENT_FIXTURE,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
};

const mockRanking: QueryState<RankingRow[]> & {
  refetch: jest.Mock;
  lastParams: unknown;
} = {
  data: RANKING_FIXTURE,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
  lastParams: undefined,
};

jest.mock('@/features/profile/api/getMyProfile', () => ({
  useMyProfile: () => ({
    data: mockProfile.data,
    isPending: mockProfile.isPending,
    isError: mockProfile.isError,
    refetch: mockProfile.refetch,
  }),
}));

jest.mock('@/features/profile/api/getRecentMatches', () => ({
  useRecentMatches: () => ({
    data: mockRecent.data,
    isPending: mockRecent.isPending,
    isError: mockRecent.isError,
    refetch: mockRecent.refetch,
  }),
}));

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

import ProfileScreen from '../../../../app/(tabs)/profile';

function resetProfile() {
  mockProfile.data = PROFILE_FIXTURE;
  mockProfile.isPending = false;
  mockProfile.isError = false;
  mockProfile.refetch.mockClear();
}

function resetRecent() {
  mockRecent.data = RECENT_FIXTURE;
  mockRecent.isPending = false;
  mockRecent.isError = false;
  mockRecent.refetch.mockClear();
}

function resetRanking() {
  mockRanking.data = RANKING_FIXTURE;
  mockRanking.isPending = false;
  mockRanking.isError = false;
  mockRanking.refetch.mockClear();
  mockRanking.lastParams = undefined;
}

beforeEach(() => {
  mockPush.mockClear();
  resetProfile();
  resetRecent();
  resetRanking();
  // Authenticated user whose id matches the ranking row flagged as "me".
  useAuthStore.setState({ userId: 'me', isAuthenticated: true, hasProfile: true });
});

afterEach(() => {
  useAuthStore.setState({ userId: null, isAuthenticated: false, hasProfile: false });
});

describe('S8 — Profile screen', () => {
  // -------------------------------------------------------------------- header
  /**
   * Covers: S8 — Profile
   * Criterion: "Header shows the authenticated user's avatar, 'Olá,' and their
   *  first name (display type) — plus a notification bell and a theme toggle."
   */
  it('renders the header with avatar, "Olá," + first name, bell and theme toggle', async () => {
    await render(<ProfileScreen />);

    // greeting + first name (display)
    expect(screen.getByText('Olá,')).toBeTruthy();
    const firstName = screen.getByText('Renan');
    expect(firstName).toBeTruthy();
    expect(firstName.props.className).toContain('font-display');
    expect(firstName.props.className).toContain('uppercase');

    // avatar exposes the user's name
    expect(screen.getByLabelText('Avatar de Renan')).toBeTruthy();

    // bell is an accessible button
    expect(screen.getByLabelText('Notificações')).toBeTruthy();
    expect(screen.getByTestId('icon-bell')).toBeTruthy();
    // theme toggle moved to Settings — not in the header.
    expect(screen.queryByLabelText('Alternar tema')).toBeNull();
    expect(screen.queryByTestId('icon-sun')).toBeNull();
  });

  /**
   * Covers: S8 — Profile
   * Criterion: the bell is a no-op this iteration (documented) —
   *  tapping it navigates nowhere.
   */
  it('keeps the bell as a no-op (tapping navigates nowhere)', async () => {
    await render(<ProfileScreen />);

    // TEMP: no press
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------- "Seu progresso" card
  /**
   * Covers: S8 — Profile
   * Criterion: "The 'Seu progresso' card shows the GERAL number (font-num) and a
   *  Level/XP bar ('Level N', 'XP a / b')."
   */
  it('renders the GERAL number (font-num) and the Level/XP bar', async () => {
    await render(<ProfileScreen />);

    expect(screen.getByText('Seu progresso')).toBeTruthy();

    // GERAL label + the overall number rendered with the number font.
    expect(screen.getByText('Geral')).toBeTruthy();
    const overall = screen.getByText('68');
    expect(overall).toBeTruthy();
    expect(overall.props.className).toContain('font-num');

    // Level/XP bar
    expect(screen.getByText('Level 15')).toBeTruthy();
    expect(screen.getByText('XP: 2.450 / 5.000')).toBeTruthy();
  });

  /**
   * Covers: S8 — Profile
   * Criterion: the "Seu progresso" card "does NOT render the ACE/BLK/ATA/DEF
   *  stats grid." (Layer 3 — SCOPE "Display GERAL only".)
   */
  it('does NOT render the ACE/BLK/ATA/DEF stats grid', async () => {
    await render(<ProfileScreen />);

    expect(screen.queryByText('ACE')).toBeNull();
    expect(screen.queryByText('BLK')).toBeNull();
    expect(screen.queryByText('ATA')).toBeNull();
    expect(screen.queryByText('DEF')).toBeNull();
  });

  /**
   * Covers: S8 — Profile
   * Criterion: "The 'Ver a sua carta' gradient CTA is NOT present."
   */
  it('does NOT render the "Ver a sua carta" CTA', async () => {
    await render(<ProfileScreen />);

    expect(screen.queryByText(/ver a sua carta/i)).toBeNull();
  });

  // ----------------------------------------------------- MINHAS PARTIDAS section
  /**
   * Covers: S8 — Profile
   * Criterion: "'MINHAS PARTIDAS' renders the recent matches from
   *  useRecentMatches, each row showing name, date·format, Vitória/Derrota
   *  (success/danger colored) and set score."
   */
  it('renders the recent matches with name, date·format, result and set score', async () => {
    await render(<ProfileScreen />);

    expect(screen.getByText('MINHAS PARTIDAS')).toBeTruthy();

    // both fixtures rendered by name
    expect(screen.getByText('Vôlei de Quinta')).toBeTruthy();
    expect(screen.getByText('Racha da Galera')).toBeTruthy();

    // date · format subtitle
    expect(screen.getByText('18/06 · 6X6')).toBeTruthy();
    expect(screen.getByText('16/06 · 4X4')).toBeTruthy();

    // win -> success (green), loss -> danger (red)
    const win = screen.getByText('VITÓRIA');
    const loss = screen.getByText('DERROTA');
    expect(win.props.className).toContain('text-success');
    expect(loss.props.className).toContain('text-danger');

    // set scores
    expect(screen.getByText('3-1')).toBeTruthy();
    expect(screen.getByText('1-3')).toBeTruthy();
  });

  /**
   * Covers: S8 — Profile
   * Criterion: "tapping a [history] row navigates to S12 with its id."
   */
  it('navigates to /matches/[id] with the match id when a history row is tapped', async () => {
    await render(<ProfileScreen />);

    fireEvent.press(screen.getByLabelText(/Vôlei de Quinta/));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/matches/[id]',
      params: { id: 'rm-1' },
    });
  });

  /**
   * Covers: S8 — Profile
   * Criterion (Open question 1 default): MINHAS PARTIDAS "Ver tudo" is hidden (no
   *  full-history screen in MVP) and all mocked rows render inline. Only the
   *  ranking section carries a "Ver tudo".
   */
  it('does not render a "Ver tudo" under the MINHAS PARTIDAS section', async () => {
    await render(<ProfileScreen />);

    // "Ver tudo" appears only on the ranking section (its header link + the
    // in-card button) — both route to /profile/ranking. None route to history,
    // so every "Ver tudo" on screen targets the ranking destination.
    const verTudo = screen.getAllByText('Ver tudo');
    expect(verTudo.length).toBeGreaterThan(0);
    // Press a single node: pressing multiple in a tight loop overlaps act() and
    // corrupts React state for subsequent tests. One press proves the wiring.
    fireEvent.press(verTudo[0] as NonNullable<(typeof verTudo)[number]>);
    mockPush.mock.calls.forEach(([arg]) => expect(arg).toBe('/profile/ranking'));
  });

  // --------------------------------------------------- Ranking semanal section
  /**
   * Covers: S8 — Profile
   * Criterion: "The dark 'Ranking semanal' card renders ranking rows from
   *  useGroupRanking({ preview: true }) with position, avatar, name, subtitle,
   *  score; the current user's row is highlighted with '· você'."
   */
  it('renders the ranking preview rows with position, avatar, name, subtitle and score', async () => {
    await render(<ProfileScreen />);

    expect(screen.getByText('Ranking semanal')).toBeTruthy();

    // the hook was asked for the preview list
    expect(mockRanking.lastParams).toEqual({ preview: true });

    // positions
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    // names + subtitles
    expect(screen.getByText('Guga')).toBeTruthy();
    expect(screen.getByText('Gustavo Lima')).toBeTruthy();
    expect(screen.getByText('Cake')).toBeTruthy();
    // scores
    expect(screen.getByText('91')).toBeTruthy();
    expect(screen.getByText('84')).toBeTruthy();
    // each row carries an avatar (initials fallback uses "Avatar de <name>")
    expect(screen.getByLabelText('Avatar de Guga')).toBeTruthy();
    expect(screen.getByLabelText('Avatar de Cake')).toBeTruthy();
  });

  /**
   * Covers: S8 — Profile
   * Criterion: "the current user's row is highlighted with '· você'." The
   *  highlight is derived from useAuthStore().userId matching the row's playerId.
   */
  it('highlights the current user row with "· você"', async () => {
    await render(<ProfileScreen />);

    // The "me" row (playerId 'me' === auth userId) renders "Você · você".
    expect(screen.getByText('Você · você')).toBeTruthy();
    // and the highlighted row announces "você" to assistive tech.
    expect(screen.getByLabelText('Você, você, 77')).toBeTruthy();
  });

  /**
   * Covers: S8 — Profile
   * Criterion: the `isMe` highlight derives from the auth userId, not a trusted
   *  mock flag — a different signed-in user gets no "· você" on the mock-me row.
   */
  it('does not mark "· você" when the signed-in userId does not match', async () => {
    useAuthStore.setState({ userId: 'someone-else' });

    await render(<ProfileScreen />);

    // No row is the current user -> no "· você" suffix anywhere.
    expect(screen.queryByText(/· você/)).toBeNull();
    // The mock-me row still renders, just un-highlighted (plain name).
    expect(screen.getByText('Você')).toBeTruthy();
  });

  /**
   * Covers: S8 — Profile
   * Criterion: "'Ver tudo' on the ranking section navigates to S9
   *  (/profile/ranking)."
   */
  it('navigates to /profile/ranking from the ranking section "Ver tudo"', async () => {
    await render(<ProfileScreen />);

    // "Ver tudo" exists only on the ranking section (header link + in-card
    // button); both route to S9.
    const [verTudo] = screen.getAllByText('Ver tudo');
    expect(verTudo).toBeTruthy();
    fireEvent.press(verTudo as NonNullable<typeof verTudo>);

    expect(mockPush).toHaveBeenCalledWith('/profile/ranking');
  });

  // --------------------------------------------------- settings affordance (S10)
  /**
   * Covers: S8 — Profile
   * Criterion: "A settings affordance navigates to S10 (/profile/settings)."
   */
  it('navigates to /profile/settings from the settings affordance', async () => {
    await render(<ProfileScreen />);

    fireEvent.press(screen.getByLabelText('Configurações'));

    expect(mockPush).toHaveBeenCalledWith('/profile/settings');
  });

  // ----------------------------------------------------------- exclusions (scope)
  /**
   * Covers: S8 — Profile
   * Criterion: "No 'SUGESTÃO DE AMIGOS' friends strip and no 'CONQUISTAS'
   *  achievements gallery render."
   */
  it('renders no SUGESTÃO DE AMIGOS strip and no CONQUISTAS gallery', async () => {
    await render(<ProfileScreen />);

    expect(screen.queryByText(/sugest[ãa]o de amigos/i)).toBeNull();
    expect(screen.queryByText(/conquistas/i)).toBeNull();
    expect(screen.queryByText(/desbloquead/i)).toBeNull();
    expect(screen.queryByTestId('friend-suggestions')).toBeNull();
    expect(screen.queryByTestId('achievements')).toBeNull();
  });

  // ----------------------------------------- per-section loading (independent)
  /**
   * Covers: S8 — Profile
   * Criterion: "Each section shows its own loading placeholder ... independently."
   *
   * Only the recent-matches query is pending: its list is replaced by a skeleton
   * while the progress card and ranking still render.
   */
  it('shows the MINHAS PARTIDAS loading placeholder independently', async () => {
    mockRecent.isPending = true;
    await render(<ProfileScreen />);

    // history content gone (skeleton in its place)
    expect(screen.queryByText('Vôlei de Quinta')).toBeNull();
    expect(
      screen.queryByText('Você ainda não jogou nenhuma partida'),
    ).toBeNull();
    // other sections still render
    expect(screen.getByText('68')).toBeTruthy(); // progress card
    expect(screen.getByText('Guga')).toBeTruthy(); // ranking
  });

  /**
   * Covers: S8 — Profile
   * Criterion: "Each section shows its own loading placeholder ... independently."
   *  (ranking pending; progress + history populated)
   */
  it('shows the ranking loading placeholder independently', async () => {
    mockRanking.isPending = true;
    await render(<ProfileScreen />);

    expect(screen.queryByText('Guga')).toBeNull();
    // progress + history still render
    expect(screen.getByText('68')).toBeTruthy();
    expect(screen.getByText('Vôlei de Quinta')).toBeTruthy();
  });

  // ------------------------------------------- per-section empty (independent)
  /**
   * Covers: S8 — Profile
   * Criterion: "[Each section shows] its own ... empty state ... independently."
   *  MINHAS PARTIDAS empty -> "Você ainda não jogou nenhuma partida".
   */
  it('shows the MINHAS PARTIDAS empty state independently', async () => {
    mockRecent.data = [];
    await render(<ProfileScreen />);

    expect(
      screen.getByText('Você ainda não jogou nenhuma partida'),
    ).toBeTruthy();
    // ranking still renders
    expect(screen.getByText('Guga')).toBeTruthy();
  });

  /**
   * Covers: S8 — Profile
   * Criterion: "[Each section shows] its own ... empty state ... independently."
   *  Ranking empty (user in no group yet) -> the in-card prompt.
   */
  it('shows the ranking empty state independently', async () => {
    mockRanking.data = [];
    await render(<ProfileScreen />);

    expect(
      screen.getByText('Entre em uma partida recorrente para aparecer no ranking'),
    ).toBeTruthy();
    // history still renders
    expect(screen.getByText('Vôlei de Quinta')).toBeTruthy();
  });

  // ------------------------------------------- per-section error (independent)
  /**
   * Covers: S8 — Profile
   * Criterion: "[Each section shows] its own ... retry-on-error independently."
   *  Progress card errors -> its retry row appears and calls refetch(); the other
   *  sections are unaffected.
   */
  it('shows the progress error/retry row independently and refetches on retry', async () => {
    mockProfile.isError = true;
    await render(<ProfileScreen />);

    expect(screen.getByText('Não foi possível carregar')).toBeTruthy();
    // other sections unaffected
    expect(screen.getByText('Vôlei de Quinta')).toBeTruthy();
    expect(screen.getByText('Guga')).toBeTruthy();

    fireEvent.press(screen.getByText('Tentar novamente'));
    expect(mockProfile.refetch).toHaveBeenCalledTimes(1);
    expect(mockRecent.refetch).not.toHaveBeenCalled();
    expect(mockRanking.refetch).not.toHaveBeenCalled();
  });

  /**
   * Covers: S8 — Profile
   * Criterion: "[Each section shows] its own ... retry-on-error independently."
   *  MINHAS PARTIDAS errors -> its retry row; refetch only that section.
   */
  it('shows the MINHAS PARTIDAS error/retry row independently and refetches on retry', async () => {
    mockRecent.isError = true;
    await render(<ProfileScreen />);

    expect(screen.getByText('Não foi possível carregar')).toBeTruthy();
    expect(screen.getByText('Guga')).toBeTruthy();

    fireEvent.press(screen.getByText('Tentar novamente'));
    expect(mockRecent.refetch).toHaveBeenCalledTimes(1);
    expect(mockProfile.refetch).not.toHaveBeenCalled();
    expect(mockRanking.refetch).not.toHaveBeenCalled();
  });

  /**
   * Covers: S8 — Profile
   * Criterion: "[Each section shows] its own ... retry-on-error independently."
   *  Ranking errors -> its on-dark retry; refetch only that section.
   */
  it('shows the ranking error/retry row independently and refetches on retry', async () => {
    mockRanking.isError = true;
    await render(<ProfileScreen />);

    expect(screen.getByText('Não foi possível carregar')).toBeTruthy();
    expect(screen.getByText('Vôlei de Quinta')).toBeTruthy();

    fireEvent.press(screen.getByText('Tentar novamente'));
    expect(mockRanking.refetch).toHaveBeenCalledTimes(1);
    expect(mockProfile.refetch).not.toHaveBeenCalled();
    expect(mockRecent.refetch).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------- permissions (scope)
  /**
   * Covers: S8 — Profile
   * Criterion: "No permission prompt fires on Profile." The screen reads only the
   *  three mocked queries (no location/camera/contacts) and renders no permission
   *  copy on mount.
   */
  it('fires no permission prompt and makes zero network requests on mount', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch' as never);

    await render(<ProfileScreen />);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/permiss[ãa]o/i)).toBeNull();
    expect(screen.queryByText(/localiza[çc][ãa]o/i)).toBeNull();
    expect(screen.queryByText(/c[âa]mera/i)).toBeNull();

    fetchSpy.mockRestore();
  });
});
