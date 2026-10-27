/**
 * Card collection (API DECISIONS #99): a card per season with how far the
 * player got, the slot of the cards to come; the season being played opens
 * the pass, an ended one opens the card as it was left.
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
  return { Check: stub, ChevronLeft: stub, X: stub };
});

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: (...args: any[]) => mockPush(...args) } }));

import type { CollectionCard } from '@/features/pass/api/seasonPass';
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

const card = (over: Partial<CollectionCard>): CollectionCard => ({
  season: 'T1',
  name: 'Temporada 1',
  finish: 'Pioneira',
  startsAt: '2026-11-01T03:00:00Z',
  endsAt: '2027-02-01T03:00:00Z',
  status: 'Active',
  pieces: 4,
  levels: 12,
  complete: false,
  ...over,
});

const mockCollection: { cards: CollectionCard[] } = { cards: [] };
jest.mock('@/features/pass/api/seasonPass', () => ({
  ...jest.requireActual('@/features/pass/api/seasonPass'),
  useCardCollection: () => ({ data: { userId: 'me', cards: mockCollection.cards }, isPending: false, isError: false, refetch: jest.fn() }),
}));
jest.mock('@/features/profile/api/getMyProfile', () => ({
  useMyProfile: () => ({ data: mockProfileData, isPending: false, isError: false }),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';

import CollectionScreen from '../../../app/profile/collection';

beforeEach(() => {
  mockPush.mockClear();
});

describe('Coleção de cartas', () => {
  it('lists each season card with how far the player got, and the slot of the cards to come', async () => {
    mockCollection.cards = [card({ season: 'T2', name: 'Temporada 2' }), card({ status: 'Ended', pieces: 12, complete: true })];

    await render(<CollectionScreen />);

    expect(screen.getByTestId('collection-count').props.children).toBe('1 CARTA COMPLETA · 2 NA COLEÇÃO');
    expect(screen.getByText('4 de 12 · em andamento')).toBeTruthy();
    expect(screen.getByText('Completa')).toBeTruthy();
    expect(screen.getByText('Próximas cartas')).toBeTruthy();
  });

  it('opens the pass for the season being played', async () => {
    mockCollection.cards = [card({})];

    await render(<CollectionScreen />);
    await fireEvent.press(screen.getByTestId('collection-T1'));

    expect(mockPush).toHaveBeenCalledWith('/profile/pass');
  });

  it('shows an ended card as it was left, with the pieces missing', async () => {
    mockCollection.cards = [card({ status: 'Ended', pieces: 9 })];

    await render(<CollectionScreen />);
    expect(screen.getByText('9 de 12 · incompleta')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('collection-T1'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByTestId('collection-open-card')).toBeTruthy();
    expect(screen.getAllByTestId('card-pieces').length).toBeGreaterThan(0);
  });
});
