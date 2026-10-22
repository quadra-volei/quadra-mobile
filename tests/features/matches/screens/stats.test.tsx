/**
 * The match's stats sheet (`app/matches/[id]/stats.tsx`, API DECISIONS #84).
 * The organizer taps a count to add one and "−" to take one back; only players
 * someone tapped go into the sheet (the others stay without a record, never
 * zero). Everyone else reads it, with no controls.
 */
import React from 'react';

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return { SafeAreaView: ({ children, ...props }: any) => ReactLocal.createElement(View, props, children) };
});

jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const Icon = (props: any) => ReactLocal.createElement(View, props);
  return { ChevronLeft: Icon, Minus: Icon };
});

jest.mock('@/components/ui/Button', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID, disabled }: any) =>
      ReactLocal.createElement(Pressable, { onPress, testID, disabled: Boolean(disabled) }, ReactLocal.createElement(Text, null, children)),
  };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 'match-1' }),
}));

let mockUserId = 'org';
jest.mock('@/stores/auth', () => ({
  useAuthStore: (select: (s: { userId: string }) => unknown) => select({ userId: mockUserId }),
}));

jest.mock('@/features/matches/api/getMatchDetail', () => ({
  useMatchDetail: () => ({
    isPending: false,
    isError: false,
    data: {
      name: 'Racha de Quinta',
      organizerId: 'org',
      players: [
        { id: 'p1', name: 'Ana Lima', handle: 'ana', status: 'CONFIRMADO' },
        { id: 'p2', name: 'Bia Souza', handle: 'bia', status: 'CONFIRMADO' },
        { id: 'g1', name: 'Zé', status: 'CONFIRMADO', isGuest: true },
      ],
    },
  }),
}));

const mockSave = { isPending: false, mutate: jest.fn() };
jest.mock('@/features/matches/api/playerStats', () => ({
  usePlayerStats: () => ({ isPending: false, isError: false, data: { editable: true, byPlayer: {} } }),
  useSavePlayerStats: () => mockSave,
}));

import { fireEvent, render, screen } from '@testing-library/react-native';

import StatsScreen from '../../../../app/matches/[id]/stats';

describe('Stats sheet', () => {
  beforeEach(() => {
    mockUserId = 'org';
    mockSave.mutate.mockClear();
  });

  it('saves only the players the organizer tapped, with the counts they set', async () => {
    await render(<StatsScreen />);

    expect(screen.queryByTestId('stats-row-g1')).toBeNull(); // guests have no profile
    await fireEvent.press(screen.getByTestId('stats-add-kills-p1'));
    await fireEvent.press(screen.getByTestId('stats-add-kills-p1'));
    await fireEvent.press(screen.getByTestId('stats-minus-kills-p1'));
    await fireEvent.press(screen.getByTestId('stats-add-digs-p1'));
    await fireEvent.press(screen.getByTestId('stats-save'));

    expect(mockSave.mutate).toHaveBeenCalledWith(
      { p1: { kills: 1, blocks: 0, aces: 0, digs: 1, assists: 0 } },
      expect.anything(),
    );
  });

  it('shows no controls to someone who does not organize', async () => {
    mockUserId = 'p1';
    await render(<StatsScreen />);

    expect(screen.getByTestId('stats-row-p1')).toBeTruthy();
    expect(screen.queryByTestId('stats-add-kills-p1')).toBeNull();
    expect(screen.queryByTestId('stats-save')).toBeNull();
  });
});
