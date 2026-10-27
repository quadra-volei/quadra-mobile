/**
 * Season pass screen (API DECISIONS #98): the season card with the pieces won,
 * the points to the next piece and this week's, the 12 levels, using a title
 * and equipping the complete card. Hooks are mocked at the boundary.
 */
import React from 'react';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-gesture-handler', () => {
  const chain: any = new Proxy({}, { get: () => () => chain });
  return {
    GestureDetector: ({ children }: any) => children,
    Gesture: { Pan: () => chain, Tap: () => chain, Race: () => chain },
  };
});

jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (props: any) => ReactLocal.createElement(View, props);
  return { Check: stub, ChevronLeft: stub, Lock: stub };
});

jest.mock('@/components/ui/Button', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID }: any) =>
      ReactLocal.createElement(Pressable, { onPress, testID, accessibilityRole: 'button' },
        ReactLocal.createElement(Text, null, children)),
  };
});

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ router: { back: (...args: any[]) => mockBack(...args), push: jest.fn() } }));

import type { SeasonPass } from '@/features/pass/api/seasonPass';
import type { MyProfile } from '@/features/profile/types/profile';

const mockProfileData: MyProfile = {
  id: 'me',
  firstName: 'Renan',
  lastName: 'Dias',
  avatarUrl: undefined,
  handle: 'renan',
  position: 'LEV',
  overall: 68,
  ace: 30,
  blk: 25,
  atk: 19,
  def: 31,
  actions: { matches: 0, byAction: { kills: { total: 0, perMatch: null }, blocks: { total: 0, perMatch: null }, aces: { total: 0, perMatch: null }, digs: { total: 0, perMatch: null }, assists: { total: 0, perMatch: null } } },
  level: 7,
  xp: 40,
  xpToNext: 140,
  record: { matches: 32, wins: 20, losses: 11, draws: 1, mvps: 4 },
  points: 720,
  cardStyle: { finish: 'Prisma', title: null, photoObjectKey: null },
};

const mockPass: { data: SeasonPass | null | undefined; isPending: boolean; isError: boolean } = {
  data: undefined,
  isPending: false,
  isError: false,
};
jest.mock('@/features/pass/api/seasonPass', () => ({
  ...jest.requireActual('@/features/pass/api/seasonPass'),
  useSeasonPass: () => ({ ...mockPass, refetch: jest.fn() }),
}));
jest.mock('@/features/profile/api/getMyProfile', () => ({
  useMyProfile: () => ({ data: mockProfileData, isPending: false, isError: false, refetch: jest.fn() }),
}));
const mockMutate = jest.fn();
jest.mock('@/features/profile/api/saveCardStyle', () => ({
  useSaveCardStyle: () => ({ mutate: mockMutate, isPending: false, error: null }),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';

import { useAuthStore } from '@/stores/auth';

import { seasonPassFixture } from '../../support/seasonPass';
import SeasonPassScreen from '../../../app/profile/pass';

beforeEach(() => {
  mockMutate.mockClear();
  mockPass.data = seasonPassFixture(4);
  mockPass.isPending = false;
  mockPass.isError = false;
  useAuthStore.setState({ userId: 'me', isAuthenticated: true, hasProfile: true });
});

describe('Passe da temporada', () => {
  it('shows the season, the pieces won and the points to the next piece and this week', async () => {
    await render(<SeasonPassScreen />);

    expect(screen.getByText('TEMPORADA 1')).toBeTruthy();
    expect(screen.getByText('1 nov – 31 jan')).toBeTruthy();
    expect(screen.getByTestId('pass-pieces').props.children).toBe('4 de 12');
    expect(screen.getByText('6 / 20 pts')).toBeTruthy();
    expect(screen.getByText('26 / 60 pts')).toBeTruthy();
    expect(screen.getByTestId('card-pieces')).toBeTruthy();
  });

  it('lists the 12 levels and says what the next one needs', async () => {
    await render(<SeasonPassScreen />);

    expect(screen.getByTestId('pass-level-1')).toBeTruthy();
    expect(screen.getByTestId('pass-level-12')).toBeTruthy();
    expect(screen.getByText('Faltam 14 pts')).toBeTruthy();
    expect(screen.getByText('Último pedaço · carta completa')).toBeTruthy();
  });

  it('puts a title reached on the card', async () => {
    await render(<SeasonPassScreen />);

    await fireEvent.press(screen.getByTestId('use-title-SEMPRE_PRESENTE'));
    expect(mockMutate).toHaveBeenCalledWith({ finish: 'Prisma', title: 'SEMPRE_PRESENTE' });
    expect(screen.queryByTestId('use-title-CRIA_DA_QUADRA')).toBeNull();
  });

  it('offers the complete card to equip only at the last level', async () => {
    await render(<SeasonPassScreen />);
    expect(screen.queryByTestId('equip-season-card')).toBeNull();

    mockPass.data = seasonPassFixture(12, { points: 240 });
    await render(<SeasonPassScreen />);

    expect(screen.getByText('Você completou o passe. A carta é sua.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('equip-season-card'));
    expect(mockMutate).toHaveBeenCalledWith({ finish: 'Pioneira', title: null });
  });

  it('says when the weekly cap is reached', async () => {
    mockPass.data = seasonPassFixture(4, { weekPoints: 60 });
    await render(<SeasonPassScreen />);

    expect(screen.getByText('Você chegou ao limite da semana. Os pontos voltam a contar na segunda.')).toBeTruthy();
  });

  it('shows a season still to come without the weekly bar', async () => {
    mockPass.data = seasonPassFixture(0, { status: 'Upcoming', points: 0, weekPoints: 0, weekEndsAt: null });
    await render(<SeasonPassScreen />);

    expect(screen.getByText('A temporada começa em 1 nov. Os pontos das suas partidas contam a partir daí.')).toBeTruthy();
    expect(screen.queryByText('Esta semana')).toBeNull();
  });

  it('says so when no season is set up', async () => {
    mockPass.data = null;
    await render(<SeasonPassScreen />);

    expect(screen.getByText('Nenhuma temporada no momento.')).toBeTruthy();
  });
});
