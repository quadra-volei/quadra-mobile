/**
 * Rede: a post's comments (`app/network/[id].tsx`) and another player's profile
 * with the follow button (`app/players/[id].tsx`). The hooks are stubbed, so
 * nothing touches the network.
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
  return { Check: stub('check'), ChevronLeft: stub('back'), Send: stub('send'), Trash2: stub('trash') };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 'x1' }),
}));

const mockComments = jest.fn();
const mockAddComment = jest.fn();
const mockDeleteComment = jest.fn();
const mockProfile = jest.fn();
const mockFollowState = jest.fn();
const mockSetFollow = jest.fn();
jest.mock('@/features/network/api/postsApi', () => ({
  ...jest.requireActual('@/features/network/api/postsApi'),
  usePostComments: () => mockComments(),
  useAddComment: () => ({ mutate: mockAddComment, isPending: false, isError: false }),
  useDeleteComment: () => ({ mutate: mockDeleteComment }),
  usePlayerProfile: () => mockProfile(),
  useFollowState: () => mockFollowState(),
  useSetFollow: () => ({ mutate: mockSetFollow, isPending: false, isError: false }),
}));

const mockMe = jest.fn();
jest.mock('@/features/profile/api/getMyProfile', () => ({
  useMyProfile: () => mockMe(),
}));

// The player's card collection (API DECISIONS #99): none unless a test sets one.
const mockCollection: { data: unknown } = { data: undefined };
jest.mock('@/features/pass/api/seasonPass', () => ({
  ...jest.requireActual('@/features/pass/api/seasonPass'),
  useCardCollection: () => ({ data: mockCollection.data }),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';

import PostCommentsScreen from '../../../../app/network/[id]';
import PlayerScreen from '../../../../app/players/[id]';

const author = { userId: 'u1', displayName: 'Ana Lima', handle: 'ana', photoUrl: null };

beforeEach(() => {
  mockAddComment.mockClear();
  mockDeleteComment.mockClear();
  mockSetFollow.mockClear();
});

describe('Rede — comentários', () => {
  it('lists the conversation and lets only deletable comments be removed', async () => {
    mockComments.mockReturnValue({
      data: [
        { id: 'c1', author, text: 'Bom jogo!', createdAt: new Date().toISOString(), canDelete: true },
        { id: 'c2', author, text: 'Semana que vem tem mais', createdAt: new Date().toISOString(), canDelete: false },
      ],
      isPending: false,
      isError: false,
    });

    await render(<PostCommentsScreen />);

    expect(screen.getByText('Bom jogo!')).toBeTruthy();
    expect(screen.getByText('Semana que vem tem mais')).toBeTruthy();
    const deleteButtons = screen.getAllByLabelText('Apagar comentário');
    expect(deleteButtons).toHaveLength(1);
    await fireEvent.press(deleteButtons[0]!);
    expect(mockDeleteComment).toHaveBeenCalledWith('c1');
  });

  it('sends the trimmed text and never an empty comment', async () => {
    mockComments.mockReturnValue({ data: [], isPending: false, isError: false });

    await render(<PostCommentsScreen />);
    expect(screen.getByText('Ninguém comentou ainda. Seja a primeira pessoa.')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('comment-send'));
    expect(mockAddComment).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('comment-text'), '  Boa!  ');
    await fireEvent.press(screen.getByTestId('comment-send'));
    expect(mockAddComment).toHaveBeenCalledWith('Boa!', expect.anything());
  });
});

describe('Rede — perfil de outro jogador', () => {
  const profile = {
    data: {
      userId: 'x1',
      displayName: 'Ana Lima',
      handle: 'ana',
      level: 'Intermediate',
      position: 'LEV',
      photoUrl: null,
      stats: { matchesPlayed: 12, wins: 7, losses: 5, draws: 0, mvpsReceived: 2 },
    },
    isPending: false,
    isError: false,
  };

  it('shows the player and follows at the tap', async () => {
    mockProfile.mockReturnValue(profile);
    mockMe.mockReturnValue({ data: { id: 'me' } });
    mockFollowState.mockReturnValue({
      data: { followersCount: 3, followingCount: 9, followedByMe: false },
      isPending: false,
    });

    await render(<PlayerScreen />);

    expect(screen.getByText('Ana Lima')).toBeTruthy();
    expect(screen.getByText('@ana · Intermediário · Levantador')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    await fireEvent.press(screen.getByText('Seguir'));
    expect(mockSetFollow).toHaveBeenCalledWith(true);
  });

  it('offers to stop following someone I follow', async () => {
    mockProfile.mockReturnValue(profile);
    mockMe.mockReturnValue({ data: { id: 'me' } });
    mockFollowState.mockReturnValue({
      data: { followersCount: 4, followingCount: 9, followedByMe: true },
      isPending: false,
    });

    await render(<PlayerScreen />);
    await fireEvent.press(screen.getByTestId('follow-button'));

    expect(mockSetFollow).toHaveBeenCalledWith(false);
  });

  it('shows the season cards the player started, and nothing before the first piece', async () => {
    mockProfile.mockReturnValue(profile);
    mockMe.mockReturnValue({ data: { id: 'me' } });
    mockFollowState.mockReturnValue({ data: { followersCount: 0, followingCount: 0, followedByMe: false }, isPending: false });
    const t1 = {
      season: 'T1', name: 'Temporada 1', finish: 'Pioneira', startsAt: '2026-11-01T03:00:00Z', endsAt: '2027-02-01T03:00:00Z',
      status: 'Ended', pieces: 12, levels: 12, complete: true,
    };
    mockCollection.data = { userId: 'x1', cards: [{ ...t1, pieces: 0, complete: false, status: 'Upcoming' }] };

    await render(<PlayerScreen />);
    expect(screen.queryByTestId('player-collection')).toBeNull();

    mockCollection.data = { userId: 'x1', cards: [t1] };
    await render(<PlayerScreen />);
    expect(screen.getByText('Coleção · 1 carta completa')).toBeTruthy();
    expect(screen.getByText('Completa')).toBeTruthy();
    mockCollection.data = undefined;
  });

  it('has no follow button on my own profile', async () => {
    mockProfile.mockReturnValue(profile);
    mockMe.mockReturnValue({ data: { id: 'x1' } });
    mockFollowState.mockReturnValue({
      data: { followersCount: 4, followingCount: 9, followedByMe: false },
      isPending: false,
    });

    await render(<PlayerScreen />);

    expect(screen.queryByTestId('follow-button')).toBeNull();
  });
});
