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
  groupName: null,
  groupId: null,
  minMatches: 1,
  seasonStart: '2026-10-01T03:00:00Z',
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
      refetch: mockState.refetch,
    };
  },
  useRankingGroups: () => ({ data: mockState.groups, isSuccess: true }),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';

import RankingScreen from '../../../../app/profile/ranking';

const lastParams = () => mockState.params[mockState.params.length - 1];

beforeEach(() => {
  mockPush.mockClear();
  mockSearchParams.current = {};
  Object.assign(mockState, { data: RANKING, isPending: false, isError: false, params: [], groups: [] });
  mockState.refetch.mockClear();
});

describe('Ranking screen (season, DECISIONS #63)', () => {
  it('opens on the friends scope with every position and shows the season', async () => {
    await render(<RankingScreen />);

    expect(lastParams()).toEqual({ scope: 'friends', groupId: undefined, position: undefined });
    expect(screen.getByText('Temporada de outubro')).toBeTruthy();
    expect(screen.getByText('Érica')).toBeTruthy();
    expect(screen.getByText(/Renan Dias/)).toBeTruthy();
  });

  it('switches to general and filters by position', async () => {
    await render(<RankingScreen />);

    await fireEvent.press(screen.getByText('Geral'));
    await fireEvent.press(screen.getByText('Levantador'));

    expect(lastParams()).toEqual({ scope: 'general', groupId: undefined, position: 'LEV' });
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

  it('opens the player profile from the podium and the list', async () => {
    await render(<RankingScreen />);

    await fireEvent.press(screen.getByLabelText('1º, Érica, 81 pontos'));
    await fireEvent.press(screen.getByText('Duda Reis'));

    expect(mockPush).toHaveBeenNthCalledWith(1, '/players/p-erica');
    expect(mockPush).toHaveBeenNthCalledWith(2, '/players/p-duda');
  });

  it('shows my line and how many games I miss when I do not qualify yet', async () => {
    const me = row(null, 'me', 'Renan Dias', 35, { matches: 1, isMe: true });
    mockState.data = { ...RANKING, rows: ROWS.filter((r) => r.playerId !== 'me'), me, minMatches: 3 };
    await render(<RankingScreen />);

    expect(screen.getByText(/Renan Dias/)).toBeTruthy();
    expect(screen.getByText(/Jogue mais 2 jogo\(s\) neste mês/)).toBeTruthy();
  });

  it('shows the scope empty message', async () => {
    mockState.data = { ...RANKING, rows: [], me: null };
    await render(<RankingScreen />);

    expect(screen.getByText(/Ninguém que você segue pontuou neste mês/)).toBeTruthy();
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
