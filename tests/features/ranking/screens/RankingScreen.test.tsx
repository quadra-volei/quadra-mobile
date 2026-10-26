/**
 * Ranking screen: scopes (Amigos, Grupos, Geral), position filter, group picker,
 * season label, navigation to a player, and my line when I do not qualify yet.
 * The hooks are mocked at the boundary; native modules are stubbed inline.
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
    // GlassHeader reads the top inset to size its safe-area padding.
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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
  const icons: Record<string, unknown> = {
    Bell: stub('bell'),
    Sun: stub('sun'),
    ChevronLeft: stub('chevron-left'),
    ChevronDown: stub('chevron-down'),
    ArrowUp: stub('arrow-up'),
    ArrowDown: stub('arrow-down'),
    Minus: stub('minus'),
    ChevronRight: stub('chevron-right'),
    ChevronUp: stub('chevron-up'),
    Crown: stub('crown'),
  };
  const fallback = (props: any) => require('react').createElement(require('react-native').View, props);
  return new Proxy(icons, { get: (target, key: string) => (key in target ? target[key] : fallback) });
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
const mockSearchParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: {
    back: (...args: any[]) => mockBack(...args),
    push: (...args: any[]) => mockPush(...args),
  },
  useLocalSearchParams: () => mockSearchParams.current,
}));

// --- Read hook mocks (mocked at the boundary) -----------------------------
import type { Ranking, RankingParams } from '@/features/ranking/api/getGroupRanking';
import type { RankingRow } from '@/features/ranking/types/ranking';

const row = (position: number | null, id: string, name: string, score: number, extra: Partial<RankingRow> = {}): RankingRow => ({
  position,
  playerId: id,
  name,
  subtitle: `@${id} · 3 jogos`,
  score,
  matches: 3,
  ...extra,
});

const ROWS: RankingRow[] = [
  row(1, 'p-erica', 'Érica', 81),
  row(2, 'p-caio', 'Caio', 79),
  row(3, 'p-manu', 'Manu', 74),
  row(4, 'me', 'Renan Dias', 68, { isMe: true }),
  row(5, 'p-duda', 'Duda Reis', 65),
];

const RANKING: Ranking = {
  rows: ROWS,
  me: ROWS[3] ?? null,
  nextUp: ROWS[2] ?? null,
  groupName: null,
  groupId: null,
  minMatches: 1,
  seasonStart: '2026-10-01T03:00:00Z',
  seasonEnd: '2026-11-01T03:00:00Z',
};

const mockState: {
  data: Ranking | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: jest.Mock;
  params: RankingParams[];
  groups: { id: string; name: string }[];
} = { data: RANKING, isPending: false, isError: false, refetch: jest.fn(), params: [], groups: [] };

jest.mock('@/features/ranking/api/getGroupRanking', () => ({
  useRanking: (params: RankingParams) => {
    mockState.params.push(params);
    return {
      data: mockState.data,
      isPending: mockState.isPending,
      isError: mockState.isError,
      isRefetching: false,
      refetch: mockState.refetch,
    };
  },
  useRankingGroups: () => ({ data: mockState.groups, isSuccess: true }),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';

import RankingScreen from '../../../../app/profile/ranking';

const lastParams = () => mockState.params[mockState.params.length - 1];

// Only Date is faked: "today" is 20 November 2026, so the current season is November.
beforeAll(() => {
  jest.useFakeTimers({
    now: new Date('2026-11-20T15:00:00Z'),
    doNotFake: [
      'nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval',
      'clearInterval', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
      'requestIdleCallback', 'cancelIdleCallback', 'hrtime', 'performance',
    ],
  });
});
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  mockPush.mockClear();
  mockSearchParams.current = {};
  Object.assign(mockState, { data: RANKING, isPending: false, isError: false, params: [], groups: [] });
  mockState.refetch.mockClear();
});

describe('Ranking screen (season, DECISIONS #63, API #95)', () => {
  it('opens on the network scope, current season, every position, ordered by points', async () => {
    await render(<RankingScreen />);

    expect(lastParams()).toEqual({ scope: 'friends', groupId: undefined, position: undefined, season: undefined, sort: 'points' });
    expect(screen.getByText('Temporada de novembro')).toBeTruthy();
    expect(screen.getByText('Rede')).toBeTruthy();
    expect(screen.getAllByText(/Érica/).length).toBeGreaterThan(0);
  });

  it('switches to general, filters by position and orders by MVPs', async () => {
    await render(<RankingScreen />);

    await fireEvent.press(screen.getByText('Geral'));
    await fireEvent.press(screen.getByText('Levantador'));
    await fireEvent.press(screen.getByTestId('ranking-sort-mvps'));

    expect(lastParams()).toMatchObject({ scope: 'general', position: 'LEV', sort: 'mvps' });
  });

  it('goes back to last month, which shows its champion', async () => {
    await render(<RankingScreen />);

    await fireEvent.press(screen.getByTestId('ranking-season-prev'));

    expect(lastParams()).toMatchObject({ season: '2026-10' });
    expect(screen.getByText('Campeão de outubro')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('ranking-season-next'));
    expect(lastParams()).toMatchObject({ season: undefined });
  });

  it('picks the most recent group in the group scope and lets the player change it', async () => {
    mockState.groups = [
      { id: 'g1', name: 'Terça do vôlei' },
      { id: 'g2', name: 'Racha de sábado' },
    ];
    await render(<RankingScreen />);

    await fireEvent.press(screen.getByText('Grupos'));
    expect(lastParams()).toMatchObject({ scope: 'group', groupId: 'g1' });

    await fireEvent.press(screen.getByText('Racha de sábado'));
    expect(lastParams()).toMatchObject({ scope: 'group', groupId: 'g2' });
  });

  it('opens a group directly from the route params', async () => {
    mockSearchParams.current = { scope: 'group', groupId: 'g9' };
    await render(<RankingScreen />);

    expect(lastParams()).toMatchObject({ scope: 'group', groupId: 'g9' });
  });

  it('opens a profile from the podium, and a list row opens in place first', async () => {
    await render(<RankingScreen />);

    await fireEvent.press(screen.getByLabelText('1º, Érica, 81 pontos'));
    expect(mockPush).toHaveBeenLastCalledWith('/players/p-erica');

    await fireEvent.press(screen.getByTestId('ranking-row-p-duda'));
    expect(screen.getByTestId('ranking-row-detail')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('ranking-row-profile'));
    expect(mockPush).toHaveBeenLastCalledWith('/players/p-duda');
  });

  it('tells me who to pass next, with my points split by reason', async () => {
    const me = row(4, 'me', 'Renan Dias', 68, {
      isMe: true,
      breakdown: { attendance: 30, wins: 16, mvp: 22 },
      trend: { direction: 'up', delta: 2 },
    });
    mockState.data = { ...RANKING, me };
    await render(<RankingScreen />);

    expect(screen.getByTestId('ranking-me-goal').props.children).toBe('Faltam 7 pts para passar Manu');
    expect(screen.getByText(/subiu 2/)).toBeTruthy();
    expect(screen.getByTestId('ranking-breakdown')).toBeTruthy();
  });

  it('says how many matches I miss when I do not qualify yet', async () => {
    const me = row(null, 'me', 'Renan Dias', 30, { matches: 1, isMe: true });
    mockState.data = { ...RANKING, rows: ROWS.filter((r) => r.playerId !== 'me'), me, minMatches: 3 };
    await render(<RankingScreen />);

    expect(screen.getByText(/Jogue mais 2 partidas neste mês/)).toBeTruthy();
  });

  it('always shows how points are earned', async () => {
    await render(<RankingScreen />);

    expect(screen.getByText('Como pontuar')).toBeTruthy();
    expect(screen.getByText('MVP do dia')).toBeTruthy();
    expect(screen.getByText('+20')).toBeTruthy();
  });

  it('shows the scope empty message', async () => {
    mockState.data = { ...RANKING, rows: [], me: null };
    await render(<RankingScreen />);

    expect(screen.getByText(/Ninguém da sua rede pontuou neste mês/)).toBeTruthy();
  });

  it('retries after an error', async () => {
    Object.assign(mockState, { data: undefined, isError: true });
    await render(<RankingScreen />);

    await fireEvent.press(screen.getByText('Tentar novamente'));

    expect(mockState.refetch).toHaveBeenCalled();
  });

  it('says how to get a group ranking when I play in no recurring game', async () => {
    await render(<RankingScreen />);

    await fireEvent.press(screen.getByText('Grupos'));

    expect(screen.getByText('Jogue uma partida recorrente para ter o ranking do grupo')).toBeTruthy();
  });
});
