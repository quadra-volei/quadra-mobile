/**
 * "Buscar jogador" (`app/network/search.tsx`): searches by @ only and opens the player found.
 * The search hook is stubbed; the debounce runs on fake timers.
 */
import React from 'react';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return new Proxy({}, { get: () => (props: any) => ReactLocal.createElement(View, props) });
});
jest.mock('expo-image', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return { Image: (props: any) => ReactLocal.createElement(View, props) };
});
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: any[]) => mockPush(...a), back: jest.fn() } }));

const mockSearch = jest.fn();
jest.mock('@/features/network/api/postsApi', () => ({
  ...jest.requireActual('@/features/network/api/postsApi'),
  usePlayerSearch: (q: string | null) => mockSearch(q),
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { toHandleQuery } from '@/features/network/api/postsApi';

import PlayerSearchScreen from '../../../../app/network/search';

describe('Buscar jogador', () => {
  it('normalizes what is typed into a handle prefix', () => {
    expect(toHandleQuery('@Ana_')).toBe('ana_');
    expect(toHandleQuery('a')).toBeNull();
    expect(toHandleQuery('Ana Maria')).toBeNull();
  });

  it('searches by @ after a pause and opens the player', async () => {
    jest.useFakeTimers();
    mockSearch.mockImplementation((q: string | null) =>
      q === 'ana'
        ? { isPending: false, isError: false, data: [{ userId: 'u1', displayName: 'Ana Lima', handle: 'ana', photoUrl: null, position: 'LEV' }] }
        : { isPending: true, isError: false, data: undefined },
    );
    await render(<PlayerSearchScreen />);

    await fireEvent.changeText(screen.getByTestId('player-search-input'), '@Ana');
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(mockSearch).toHaveBeenLastCalledWith('ana');
    await fireEvent.press(screen.getByTestId('player-search-result'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/players/[id]', params: { id: 'u1' } });
    jest.useRealTimers();
  });
});
