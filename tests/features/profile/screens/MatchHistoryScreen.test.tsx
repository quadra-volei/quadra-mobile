/**
 * "Ver tudo" of MINHAS PARTIDAS (`app/profile/history.tsx`): every finished
 * match of the user, grouped by month. The history hook is stubbed: nothing
 * touches the network.
 */
import React from 'react';

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      ReactLocal.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) =>
    ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  return {
    ChevronLeft: stub('back'),
    ChevronRight: stub('chevron-right'),
    Star: stub('star'),
    Volleyball: stub('volleyball'),
  };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: (...args: unknown[]) => mockPush(...args) },
}));

const mockHistory = jest.fn();
jest.mock('@/features/profile/api/getRecentMatches', () => ({
  ...jest.requireActual('@/features/profile/api/getRecentMatches'),
  useMatchHistory: () => mockHistory(),
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { RecentMatch } from '@/features/profile/types/profile';

import MatchHistoryScreen from '../../../../app/profile/history';

const match = (id: string, playedAt: string, extra: Partial<RecentMatch> = {}): RecentMatch => ({
  id,
  name: `Racha ${id}`,
  playedAt,
  format: '6X6',
  result: 'VITORIA',
  setScore: '1-0',
  actionsLine: '',
  isMvp: false,
  ...extra,
});

function history(items: RecentMatch[], extra: object = {}) {
  return {
    data: { pages: [{ items, total: items.length, hasNextPage: false }] },
    isPending: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    isRefetching: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    ...extra,
  };
}

beforeEach(() => mockPush.mockClear());

describe('Minhas partidas — Ver tudo', () => {
  it('groups the matches by month and opens the summary on tap', async () => {
    mockHistory.mockReturnValue(
      history([
        match('a', '2026-10-20T12:00:00', { isMvp: true }),
        match('b', '2026-10-02T12:00:00'),
        match('c', '2026-09-28T12:00:00'),
      ]),
    );
    await render(<MatchHistoryScreen />);

    expect(screen.getByText('Minhas partidas')).toBeTruthy();
    expect(screen.getByText('OUTUBRO 2026')).toBeTruthy();
    expect(screen.getByText('SETEMBRO 2026')).toBeTruthy();
    expect(screen.getAllByTestId('match-history-row')).toHaveLength(3);
    expect(screen.getAllByTestId('mvp-badge')).toHaveLength(1);

    await act(async () => {
      fireEvent.press(screen.getAllByTestId('match-history-row')[2]!);
    });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/matches/[id]/summary', params: { id: 'c' } });
  });

  it('loads the next page at the end of the list', async () => {
    const state = history([match('a', '2026-10-20T12:00:00')], { hasNextPage: true });
    mockHistory.mockReturnValue(state);
    await render(<MatchHistoryScreen />);

    fireEvent(screen.getByTestId('match-history'), 'onEndReached');
    expect(state.fetchNextPage).toHaveBeenCalled();
  });

  it('says when there is no match yet', async () => {
    mockHistory.mockReturnValue(history([]));
    await render(<MatchHistoryScreen />);

    expect(screen.getByText('Você ainda não jogou nenhuma partida')).toBeTruthy();
  });

  it('retries after an error', async () => {
    const state = history([], { data: undefined, isError: true });
    mockHistory.mockReturnValue(state);
    await render(<MatchHistoryScreen />);

    fireEvent.press(screen.getByText('Tentar novamente'));
    expect(state.refetch).toHaveBeenCalled();
  });
});
