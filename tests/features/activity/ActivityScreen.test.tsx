/**
 * "Ver tudo" of ATIVIDADE DOS AMIGOS (`app/activity.tsx`): the paged list of
 * what the followed players did. The feed hook is stubbed: nothing touches the
 * network.
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
    ArrowUp: stub('arrow-up'),
    Check: stub('check'),
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

const mockFeed = jest.fn();
jest.mock('@/features/activity/api/activityApi', () => ({
  ...jest.requireActual('@/features/activity/api/activityApi'),
  useActivityFeed: () => mockFeed(),
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { Activity } from '@/features/activity/api/activityApi';

import ActivityScreen from '../../../app/activity';

const started: Activity = {
  id: 'a1',
  type: 'MatchStarted',
  actor: { userId: 'bia', displayName: 'Bia', handle: 'bia', photoUrl: null, level: 9 },
  match: { id: 'm-1', name: 'Racha da Galera' },
  othersCount: 1,
  outcome: null,
  setsWon: null,
  setsLost: null,
  levelFrom: null,
  levelTo: null,
  occurredAt: new Date().toISOString(),
};

function feed(items: Activity[], extra: object = {}) {
  return {
    data: { pages: [{ items, nextBefore: null }] },
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

describe('Atividade dos amigos — Ver tudo', () => {
  it('lists every activity and opens the match on tap', async () => {
    mockFeed.mockReturnValue(feed([started]));
    await render(<ActivityScreen />);

    expect(screen.getByText('Atividade dos amigos')).toBeTruthy();
    expect(screen.getByText(' e mais 1 iniciaram uma partida ')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('activity-row'));
    });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/matches/[id]', params: { id: 'm-1' } });
  });

  it('explains an empty list', async () => {
    mockFeed.mockReturnValue(feed([]));
    await render(<ActivityScreen />);

    expect(screen.getByText(/Seus amigos ainda não jogaram/)).toBeTruthy();
  });

  it('retries after an error', async () => {
    const state = feed([], { data: undefined, isError: true });
    mockFeed.mockReturnValue(state);
    await render(<ActivityScreen />);

    fireEvent.press(screen.getByText('Tentar novamente'));
    expect(state.refetch).toHaveBeenCalled();
  });
});
