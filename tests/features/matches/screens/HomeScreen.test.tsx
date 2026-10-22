jest.mock('@/components/domain/BellWithBadge', () => ({
  BellWithBadge: () => require('react').createElement(require('react-native').View, { testID: 'icon-bell' }),
}));
/**
 * S5 — Home screen tests.
 *
 * Covers every acceptance criterion in docs/specs/S5-home.md:
 *  - Header shows "INÍCIO" + bell + theme toggle — NO avatar, NO greeting.
 *  - "SEU PRÓXIMO JOGO" shows one card: the soonest confirmed match (#98).
 *  - With nothing to show, only the header and the blue hero (#98).
 *  - "Ver todas" navigates to /explore.
 *  - "PRÓXIMAS PARTIDAS" renders a horizontal scroll of MatchCardCompact from
 *    useUpcomingMatches; tapping a card navigates to S12 with its id.
 *  - No "JOGOS PERTO DE VOCÊ" on Home (#104).
 *  - The upcoming section shows its loading placeholder and its retry row.
 *  - No stories/feed/weather/ads.
 *
 * Both read hooks are mocked at the hook boundary so the four query states
 * (pending / error / empty / populated) are controlled deterministically per
 * section, with no network and no MSW. Navigation is mocked via expo-router.
 * Native modules (gradient, safe-area, expo-image, lucide) are stubbed inline —
 * the repo's tests/__mocks__ are NOT auto-applied.
 *
 * The bottom tab bar is owned by app/(tabs)/_layout.tsx (not by this screen).
 * Criterion 9 (bar persists / Home active) is covered in
 * tests/features/matches/screens/TabsLayout.test.tsx.
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
    Plus: stub('plus'),
    Search: stub('search'),
    Volleyball: stub('volleyball'),
    ArrowUp: stub('arrow-up'),
    Check: stub('check'),
    Star: stub('star'),
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
import type { UpcomingMatch } from '@/features/matches/types/match';

const UPCOMING_FIXTURE: UpcomingMatch[] = [
  {
    id: 'up-1',
    name: 'Vôlei de Quinta',
    startsAt: '2026-06-20T19:30:00-03:00',
    level: 'INTERMEDIARIO',
    openSlots: 2,
    priceLabel: 'R$ 15',
    avatarUrls: ['https://example.com/a.png', 'https://example.com/b.png'],
    tint: '#1A1AFF',
    venue: 'Arena Pinheiros',
    confirmed: false,
  },
  {
    id: 'up-2',
    name: 'Racha da Galera',
    startsAt: '2026-06-21T20:00:00-03:00',
    level: 'AVANCADO',
    openSlots: 4,
    priceLabel: 'Grátis',
    avatarUrls: ['https://example.com/c.png'],
    tint: '#6B1AFF',
    venue: 'Quadra da Vila',
    confirmed: false,
  },
];

type QueryState<T> = {
  data: T[];
  isPending: boolean;
  isError: boolean;
};

// Players the signed-in user follows (hero "amigos" chip).
const mockFollow = { followingCount: 0 };
jest.mock('@/features/network/api/postsApi', () => ({
  useFollowState: () => ({
    data: { followersCount: 0, followingCount: mockFollow.followingCount, followedByMe: false },
  }),
  timeAgo: () => 'há 18 min',
}));

// Friends' activity (ATIVIDADE DOS AMIGOS), mocked at the hook boundary.
import type { Activity } from '@/features/activity/api/activityApi';

const ACTIVITY_FIXTURE: Activity[] = [
  {
    id: 'act-1',
    type: 'LevelUp',
    actor: { userId: 'caio', displayName: 'Caio', handle: 'caio', photoUrl: null, level: 16 },
    match: null,
    othersCount: 0,
    outcome: null,
    setsWon: null,
    setsLost: null,
    levelFrom: 15,
    levelTo: 16,
    occurredAt: '2026-10-14T20:00:00Z',
  },
  {
    id: 'act-2',
    type: 'MatchEnded',
    actor: { userId: 'erica', displayName: 'Érica', handle: 'erica', photoUrl: null, level: 18 },
    match: { id: 'm-9', name: 'Vôlei de Quinta' },
    othersCount: 0,
    outcome: 'Win',
    setsWon: 2,
    setsLost: 1,
    levelFrom: null,
    levelTo: null,
    occurredAt: '2026-10-14T19:30:00Z',
  },
];

const mockActivity = {
  data: ACTIVITY_FIXTURE as Activity[] | undefined,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
};
jest.mock('@/features/activity/api/activityApi', () => ({
  ...jest.requireActual('@/features/activity/api/activityApi'),
  useFriendsActivity: () => mockActivity,
}));
jest.mock('@/stores/auth', () => ({
  useAuthStore: (select: (s: { userId: string }) => unknown) => select({ userId: 'me' }),
}));

const mockUpcoming: QueryState<UpcomingMatch> & { refetch: jest.Mock } = {
  data: UPCOMING_FIXTURE,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
};

// The screen re-reads queries through the query client (pull to refresh).
const mockRefetchQueries = jest.fn(async () => undefined);
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ refetchQueries: mockRefetchQueries }),
}));

jest.mock('@/features/matches/api/getUpcoming', () => ({
  useUpcomingMatches: () => ({
    data: mockUpcoming.data,
    isPending: mockUpcoming.isPending,
    isError: mockUpcoming.isError,
    refetch: mockUpcoming.refetch,
    isSuccess: !mockUpcoming.isPending && !mockUpcoming.isError,
  }),
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import HomeScreen from '../../../../app/(tabs)/index';

function resetUpcoming() {
  mockUpcoming.data = UPCOMING_FIXTURE;
  mockUpcoming.isPending = false;
  mockUpcoming.isError = false;
  mockUpcoming.refetch.mockClear();
}

beforeEach(() => {
  mockPush.mockClear();
  mockFollow.followingCount = 0;
  mockActivity.data = ACTIVITY_FIXTURE;
  mockActivity.isPending = false;
  mockActivity.isError = false;
  mockActivity.refetch.mockClear();
  mockRefetchQueries.mockClear();
  resetUpcoming();
});

describe('S5 — Home screen', () => {
  // The tab stays mounted: a pull re-reads my matches and my friends' activity.
  it('re-reads the matches and the friends activity on a pull', async () => {
    const { container } = await render(<HomeScreen />);
    // The scroll view carries the RefreshControl; a pull calls its onRefresh.
    const [scroll] = container.queryAll((node) => Boolean(node.props.refreshControl));
    await act(async () => {
      await scroll!.props.refreshControl.props.onRefresh();
    });
    expect(mockUpcoming.refetch).toHaveBeenCalled();
    expect(mockRefetchQueries).toHaveBeenCalledWith({ queryKey: ['activity'], type: 'active' });
  });

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
    // compact-card meta (vagas + level badge) confirms it's the compact card
    expect(screen.getByText('2 vagas')).toBeTruthy();
    expect(screen.getByText('Avançado')).toBeTruthy();
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

  // ---------------------------------------------- no "perto de você" on Home
  /** "JOGOS PERTO DE VOCÊ" left the Home (DECISIONS #104); the map stays in Explorar. */
  it('does not show the nearby section', async () => {
    await render(<HomeScreen />);

    expect(screen.queryByText('JOGOS PERTO DE VOCÊ')).toBeNull();
    expect(screen.queryByText('Mapa')).toBeNull();
  });

  // ------------------------------------------------- upcoming loading / error
  it('shows the upcoming loading placeholder, not the hero, while pending', async () => {
    mockUpcoming.isPending = true;
    await render(<HomeScreen />);

    expect(screen.getByText('PRÓXIMAS PARTIDAS')).toBeTruthy();
    expect(screen.queryByText('Vôlei de Quinta')).toBeNull();
    expect(screen.queryByTestId('home-hero')).toBeNull();
  });

  it('shows the upcoming retry row on error and refetches on retry', async () => {
    mockUpcoming.isError = true;
    await render(<HomeScreen />);

    expect(screen.getByText('Não foi possível carregar')).toBeTruthy();
    expect(screen.queryByTestId('home-hero')).toBeNull();

    await fireEvent.press(screen.getByText('Tentar novamente'));
    expect(mockUpcoming.refetch).toHaveBeenCalledTimes(1);
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

  /** The bell opens the notification settings (the closest existing screen). */
  it('navigates to /notifications when the bell is tapped', async () => {
    await render(<HomeScreen />);

    fireEvent.press(screen.getByLabelText('Notificações'));

    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  // ------------------------------------------------------- SEU PRÓXIMO JOGO
  /** One card only: the soonest future match where the user is confirmed. */
  it('shows a single next-game card for the soonest confirmed match', async () => {
    const soon = new Date(Date.now() + 2 * 3600_000).toISOString();
    const later = new Date(Date.now() + 26 * 3600_000).toISOString();
    mockUpcoming.data = [
      { ...UPCOMING_FIXTURE[1]!, id: 'later', name: 'Treino Misto', startsAt: later, confirmed: true },
      { ...UPCOMING_FIXTURE[0]!, id: 'soon', startsAt: soon, confirmed: true },
      { ...UPCOMING_FIXTURE[1]!, id: 'pending', startsAt: soon, confirmed: false },
    ];
    await render(<HomeScreen />);

    expect(screen.getByText('SEU PRÓXIMO JOGO')).toBeTruthy();
    expect(screen.getAllByText('Confirmado')).toHaveLength(1);
    const card = screen.getByLabelText(/^Seu próximo jogo: Vôlei de Quinta/);
    expect(screen.getByText(/· Arena Pinheiros$/)).toBeTruthy();
    // the next game leaves the carousel; the others stay
    expect(screen.getAllByText('Vôlei de Quinta')).toHaveLength(1);
    expect(screen.getByText('Treino Misto')).toBeTruthy();

    await fireEvent.press(card);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/matches/[id]', params: { id: 'soon' } });

    mockPush.mockClear();
    await fireEvent.press(screen.getByText('Ver jogo'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/matches/[id]', params: { id: 'soon' } });
  });

  it('hides SEU PRÓXIMO JOGO when no upcoming match is confirmed', async () => {
    await render(<HomeScreen />);

    expect(screen.queryByText('SEU PRÓXIMO JOGO')).toBeNull();
    expect(screen.queryByText('Confirmado')).toBeNull();
  });

  // --------------------------------------------------------------- empty Home
  /** Nothing to show: only the header and the blue hero, no sections. */
  it('shows only the hero when there are no upcoming matches', async () => {
    mockUpcoming.data = [];
    mockFollow.followingCount = 3;
    await render(<HomeScreen />);

    expect(screen.getByTestId('home-hero')).toBeTruthy();
    expect(screen.getByText('Seu próximo jogo começa aqui')).toBeTruthy();
    expect(screen.getByText('Bora pra')).toBeTruthy();
    expect(screen.getByText('Quadra?')).toBeTruthy();
    expect(screen.getByText('3 amigos no Quadra')).toBeTruthy();
    expect(screen.queryByText('PRÓXIMAS PARTIDAS')).toBeNull();
    expect(screen.getByTestId('home-hero-art')).toBeTruthy();
    expect(screen.getByTestId('home-hero').props.style).toEqual(
      expect.objectContaining({ aspectRatio: 4 / 5 }),
    );
    expect(screen.getByText('INÍCIO')).toBeTruthy();
  });

  it('hides the friends chip when the user follows nobody', async () => {
    mockUpcoming.data = [];
    await render(<HomeScreen />);

    expect(screen.getByTestId('home-hero')).toBeTruthy();
    expect(screen.queryByText(/no Quadra$/)).toBeNull();
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

  // ---------------------------------------------------- friends' activity
  describe('ATIVIDADE DOS AMIGOS', () => {
    it('is hidden while the user follows nobody', async () => {
      await render(<HomeScreen />);

      expect(screen.queryByText('ATIVIDADE DOS AMIGOS')).toBeNull();
    });

    it('lists what the followed players did, with their level number', async () => {
      mockFollow.followingCount = 3;
      await render(<HomeScreen />);

      expect(screen.getByText('ATIVIDADE DOS AMIGOS')).toBeTruthy();
      expect(screen.getAllByTestId('activity-row')).toHaveLength(2);
      expect(screen.getByText('nível 16')).toBeTruthy();
      expect(screen.getByText('Novo nível desbloqueado · há 18 min')).toBeTruthy();
      expect(screen.getByText('Vitória por 2 sets a 1 · há 18 min')).toBeTruthy();
      expect(screen.getAllByTestId('avatar-level-badge').map((b) => b.props.accessibilityLabel)).toEqual([
        'Nível 16',
        'Nível 18',
      ]);
    });

    it("opens the friend's profile for a level up and the match for a game", async () => {
      mockFollow.followingCount = 3;
      await render(<HomeScreen />);

      const rows = screen.getAllByTestId('activity-row');
      await act(async () => {
        fireEvent.press(rows[0]!);
        fireEvent.press(rows[1]!);
      });

      expect(mockPush).toHaveBeenNthCalledWith(1, { pathname: '/players/[id]', params: { id: 'caio' } });
      expect(mockPush).toHaveBeenNthCalledWith(2, { pathname: '/matches/[id]', params: { id: 'm-9' } });
    });

    it('opens the full list from "Ver tudo"', async () => {
      mockFollow.followingCount = 3;
      await render(<HomeScreen />);

      fireEvent.press(screen.getByText('Ver tudo'));

      expect(mockPush).toHaveBeenCalledWith('/activity');
    });

    it('says so when the friends did nothing yet', async () => {
      mockFollow.followingCount = 3;
      mockActivity.data = [];
      await render(<HomeScreen />);

      expect(screen.getByText('Seus amigos ainda não jogaram esta semana')).toBeTruthy();
    });

    it('shows its loading placeholder and its retry row', async () => {
      mockFollow.followingCount = 3;
      mockActivity.isPending = true;
      mockActivity.data = undefined;
      await render(<HomeScreen />);
      expect(screen.getByTestId('activity-loading')).toBeTruthy();

      mockActivity.isPending = false;
      mockActivity.isError = true;
      await render(<HomeScreen />);
      fireEvent.press(screen.getAllByText('Tentar novamente').at(-1)!);
      expect(mockActivity.refetch).toHaveBeenCalled();
    });

    it('joins the empty Home only when there is activity to show', async () => {
      mockFollow.followingCount = 3;
      mockUpcoming.data = [];
      await render(<HomeScreen />);
      expect(screen.getByTestId('home-hero')).toBeTruthy();
      expect(screen.getAllByTestId('activity-row')).toHaveLength(2);

      mockActivity.data = [];
      await render(<HomeScreen />);
      expect(screen.queryByText('Seus amigos ainda não jogaram esta semana')).toBeNull();
    });
  });
});
