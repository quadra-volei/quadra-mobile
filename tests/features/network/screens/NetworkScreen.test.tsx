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
    Clock: stub('clock'),
    Heart: stub('heart'),
    MessageCircle: stub('message'),
    Bell: stub('bell'),
    Settings: stub('settings'),
    Trash2: stub('trash'),
    Trophy: stub('trophy'),
  };
});

const mockPush = jest.fn();
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

jest.mock('expo-router', () => ({
  router: { push: (...args: any[]) => mockPush(...args) },
}));

const mockFeed = jest.fn();
const mockDelete = jest.fn();
const mockSetLike = jest.fn();
jest.mock('@/features/network/api/postsApi', () => ({
  ...jest.requireActual('@/features/network/api/postsApi'),
  usePostFeed: (scope: string) => mockFeed(scope),
  useDeletePost: () => ({ mutate: mockDelete }),
  useSetPostLike: () => ({ mutate: mockSetLike }),
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
  likeCount: 0,
  likedByMe: false,
  commentCount: 0,
  kind: 'Post',
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
  mockSetLike.mockClear();
});

describe('S7 — Rede (feed)', () => {
  it('shows each post with its author, text and match', async () => {
    mockFeed.mockReturnValue(
      feedWith([
        post({ match: { id: 'm1', name: 'Vôlei de quinta', startsAt: '2026-01-01T22:00:00Z' } }),
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
    // A match already played is a label, not an invite.
    expect(screen.queryByText('Participar')).toBeNull();
  });

  it('turns a post tied to a match still to come into an invite that opens the match', async () => {
    const startsAt = new Date(Date.now() + 3 * 3_600_000).toISOString();
    mockFeed.mockReturnValue(
      feedWith([post({ match: { id: 'm9', name: 'Racha da Galera', startsAt } })]),
    );

    await render(<NetworkScreen />);
    expect(screen.getByTestId('post-invite')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Participar de Racha da Galera'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/matches/[id]', params: { id: 'm9' } });
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

  it('shows the likes and toggles mine at the tap', async () => {
    const liked = post({ likeCount: 8, likedByMe: true });
    const fresh = post({ id: 'p2', likeCount: 3 });
    mockFeed.mockReturnValue(feedWith([liked, fresh]));

    await render(<NetworkScreen />);
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Descurtir'));
    await fireEvent.press(screen.getByLabelText('Curtir'));

    expect(mockSetLike).toHaveBeenNthCalledWith(1, { post: liked, liked: false });
    expect(mockSetLike).toHaveBeenNthCalledWith(2, { post: fresh, liked: true });
  });

  it('opens the comments and the author from the card', async () => {
    mockFeed.mockReturnValue(feedWith([post({ commentCount: 5 })]));

    await render(<NetworkScreen />);
    expect(screen.getByText('5')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Comentários'));
    await fireEvent.press(screen.getByLabelText('Ver perfil de Ana Lima'));

    expect(mockPush).toHaveBeenNthCalledWith(1, { pathname: '/network/[id]', params: { id: 'p1' } });
    expect(mockPush).toHaveBeenNthCalledWith(2, { pathname: '/players/[id]', params: { id: 'u1' } });
  });

  it('reads an automatic card as a sentence about the match', async () => {
    const startsAt = new Date(Date.now() + 3 * 3_600_000).toISOString();
    mockFeed.mockReturnValue(
      feedWith([
        post({ kind: 'MatchCreated', text: null, match: { id: 'm9', name: 'Racha da Galera', startsAt } }),
      ]),
    );

    await render(<NetworkScreen />);

    expect(screen.getByText(/criou a partida/)).toBeTruthy();
    // Still to come: the card carries the way into the match.
    expect(screen.getByLabelText('Participar de Racha da Galera')).toBeTruthy();
  });

  it('switches between "Para você" and "Seguindo"', async () => {
    mockFeed.mockImplementation((scope: string) =>
      feedWith(scope === 'following' ? [] : [post({})]),
    );

    await render(<NetworkScreen />);
    expect(mockFeed).toHaveBeenLastCalledWith('all');
    expect(screen.getByText('Que jogo!')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('feed-scope-following'));
    expect(mockFeed).toHaveBeenLastCalledWith('following');
    expect(screen.queryByText('Que jogo!')).toBeNull();
    // With nobody followed, the tab explains itself and leads back.
    await fireEvent.press(screen.getByText('Ver Para você'));
    expect(mockFeed).toHaveBeenLastCalledWith('all');
  });

  it('invites to write the first post when the feed is empty', async () => {
    mockFeed.mockReturnValue(feedWith([]));

    await render(<NetworkScreen />);
    await fireEvent.press(screen.getByText('Criar o primeiro post'));

    expect(mockPush).toHaveBeenCalledWith('/network/new');
  });

  it('opens the notifications from the header bell (new posts come from the tab bar +)', async () => {
    mockFeed.mockReturnValue(feedWith([post({})]));

    await render(<NetworkScreen />);
    await fireEvent.press(screen.getByLabelText('Notificações'));

    expect(mockPush).toHaveBeenCalledWith('/profile/notifications');
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
