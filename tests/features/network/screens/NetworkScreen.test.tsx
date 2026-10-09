/**
 * S7 — Rede: the feed of posts.
 *
 * The screen reads the feed through `usePostFeed` and deletes through
 * `useDeletePost`; both hooks are stubbed, so nothing touches the network.
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
    Plus: stub('plus'),
    Settings: stub('settings'),
    Trash2: stub('trash'),
    Trophy: stub('trophy'),
  };
});

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: any[]) => mockPush(...args) },
}));

const mockFeed = jest.fn();
const mockDelete = jest.fn();
jest.mock('@/features/network/api/postsApi', () => ({
  ...jest.requireActual('@/features/network/api/postsApi'),
  usePostFeed: () => mockFeed(),
  useDeletePost: () => ({ mutate: mockDelete }),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';

import { dialog } from '@/components/ui/Dialog';
import { type Post, timeAgo } from '@/features/network/api/postsApi';

import NetworkScreen from '../../../../app/(tabs)/network';

const post = (over: Partial<Post>): Post => ({
  id: 'p1',
  author: { userId: 'u1', displayName: 'Ana Lima', handle: 'ana', photoUrl: null },
  text: 'Que jogo!',
  photoUrl: null,
  match: null,
  createdAt: new Date().toISOString(),
  mine: false,
  ...over,
});

const feedWith = (items: Post[], over: object = {}) => ({
  data: { pages: [{ items, nextBefore: null }] },
  isPending: false,
  isError: false,
  isRefetching: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  ...over,
});

beforeEach(() => {
  mockPush.mockClear();
  mockDelete.mockClear();
});

describe('S7 — Rede (feed)', () => {
  it('shows each post with its author, text and match', async () => {
    mockFeed.mockReturnValue(
      feedWith([
        post({ match: { id: 'm1', name: 'Vôlei de quinta' } }),
        post({ id: 'p2', text: 'Outro', author: { userId: 'u2', displayName: 'Beto', handle: null, photoUrl: null } }),
      ]),
    );

    await render(<NetworkScreen />);

    expect(screen.getByText('REDE')).toBeTruthy();
    expect(screen.getByText('Ana Lima')).toBeTruthy();
    expect(screen.getByText('@ana · agora')).toBeTruthy();
    expect(screen.getByText('Que jogo!')).toBeTruthy();
    expect(screen.getByText('Vôlei de quinta')).toBeTruthy();
    expect(screen.getByText('Beto')).toBeTruthy();
    expect(screen.getAllByTestId('post')).toHaveLength(2);
  });

  it('offers to delete only my own post, after a confirmation', async () => {
    mockFeed.mockReturnValue(feedWith([post({ mine: true }), post({ id: 'p2' })]));
    const alert = jest.spyOn(dialog, 'alert').mockImplementation(() => {});

    await render(<NetworkScreen />);

    const deleteButtons = screen.getAllByLabelText('Apagar post');
    expect(deleteButtons).toHaveLength(1);
    await fireEvent.press(deleteButtons[0]!);

    expect(mockDelete).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0]![2]!;
    buttons.find((b) => b.text === 'Apagar')!.onPress!();
    expect(mockDelete).toHaveBeenCalledWith('p1');
  });

  it('invites to write the first post when the feed is empty', async () => {
    mockFeed.mockReturnValue(feedWith([]));

    await render(<NetworkScreen />);
    await fireEvent.press(screen.getByText('Criar o primeiro post'));

    expect(mockPush).toHaveBeenCalledWith('/network/new');
  });

  it('opens the new-post screen from the header', async () => {
    mockFeed.mockReturnValue(feedWith([post({})]));

    await render(<NetworkScreen />);
    await fireEvent.press(screen.getByLabelText('Novo post'));

    expect(mockPush).toHaveBeenCalledWith('/network/new');
  });

  it('offers a retry when the feed fails to load', async () => {
    const refetch = jest.fn();
    mockFeed.mockReturnValue(feedWith([], { data: undefined, isError: true, refetch }));

    await render(<NetworkScreen />);
    await fireEvent.press(screen.getByText('Tentar novamente'));

    expect(refetch).toHaveBeenCalled();
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-10-09T12:00:00Z').getTime();
  const ago = (ms: number) => timeAgo(new Date(now - ms).toISOString(), now);

  it('goes from "agora" to minutes, hours, days and then the date', () => {
    expect(ago(20_000)).toBe('agora');
    expect(ago(5 * 60_000)).toBe('há 5 min');
    expect(ago(3 * 3_600_000)).toBe('há 3 h');
    expect(ago(2 * 86_400_000)).toBe('há 2 d');
    expect(ago(30 * 86_400_000)).toMatch(/^\d{2}\/09$/);
  });
});
