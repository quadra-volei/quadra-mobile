/**
 * "Sua carta" (S8b) screen tests: the card's front and back from the real
 * profile, flipping, the finish / title / stats tabs and saving a choice.
 * Native pieces (safe-area, gesture handler, image picker, icons) are stubbed;
 * the profile and save hooks are mocked at the hook boundary.
 */
import React from 'react';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// gesture-handler -> GestureDetector renders its child; gestures chain to themselves.
jest.mock('react-native-gesture-handler', () => {
  const chain: any = new Proxy({}, { get: () => () => chain });
  return {
    GestureDetector: ({ children }: any) => children,
    Gesture: { Pan: () => chain, Tap: () => chain, Race: () => chain },
  };
});

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
}));

const mockCapture = jest.fn((..._args: any[]) => Promise.resolve('file:///tmp/carta.png'));
jest.mock('react-native-view-shot', () => ({ captureRef: (...args: any[]) => mockCapture(...args) }));
const mockShare = jest.fn((..._args: any[]) => Promise.resolve());
jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => Promise.resolve(true),
  shareAsync: (...args: any[]) => mockShare(...args),
}));

jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (props: any) => ReactLocal.createElement(View, props);
  return { Check: stub, ChevronLeft: stub, ChevronRight: stub, Download: stub, Lock: stub, Maximize2: stub, Plus: stub, RefreshCw: stub };
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
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: (...args: any[]) => mockBack(...args), push: (...args: any[]) => mockPush(...args) },
}));

// Season pass and card collection: none unless a test sets them.
const mockPass: { data: unknown; cards: unknown[] } = { data: null, cards: [] };
jest.mock('@/features/pass/api/seasonPass', () => ({
  ...jest.requireActual('@/features/pass/api/seasonPass'),
  useSeasonPass: () => ({ data: mockPass.data, isPending: false, isError: false }),
  useCardCollection: () => ({ data: { userId: 'me', cards: mockPass.cards }, isPending: false, isError: false }),
}));

const T1 = {
  season: 'T1', name: 'Temporada 1', finish: 'Pioneira', startsAt: '2026-11-01T03:00:00Z', endsAt: '2027-02-01T03:00:00Z',
  status: 'Active', pieces: 4, levels: 12, complete: false,
};

import type { MyProfile } from '@/features/profile/types/profile';

const PROFILE_FIXTURE: MyProfile = {
  id: 'me',
  firstName: 'Renan',
  lastName: 'Dias',
  avatarUrl: 'https://example.com/me.png',
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

const mockProfile = {
  data: PROFILE_FIXTURE as MyProfile | undefined,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
};
jest.mock('@/features/profile/api/getMyProfile', () => ({
  useMyProfile: () => ({ ...mockProfile }),
}));

const mockMutate = jest.fn();
jest.mock('@/features/profile/api/saveCardStyle', () => ({
  useSaveCardStyle: () => ({ mutate: mockMutate, isPending: false, error: null, variables: undefined }),
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { seasonPassFixture } from '../../../support/seasonPass';
import CardScreen from '../../../../app/profile/card';

beforeEach(() => {
  mockBack.mockClear();
  mockPush.mockClear();
  mockPass.data = null;
  mockPass.cards = [];
  mockMutate.mockClear();
  mockProfile.data = PROFILE_FIXTURE;
  mockProfile.isPending = false;
  mockProfile.isError = false;
  mockProfile.refetch.mockClear();
});

describe('S8b — Sua carta', () => {
  it('renders the header with a back affordance', async () => {
    await render(<CardScreen />);

    expect(screen.getByText('Sua carta')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Voltar'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('shows the front: title from the position, name, @handle and position, GERAL in the corner, no premium note', async () => {
    await render(<CardScreen />);

    expect(screen.getAllByText('O Maestro').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Renan Dias').length).toBeGreaterThan(0);
    expect(screen.getAllByText('@renan').length).toBeGreaterThan(0);
    expect(screen.getByText('Levantador')).toBeTruthy();
    expect(screen.getAllByText('68').length).toBeGreaterThan(0); // GERAL
    expect(screen.queryByText(/Premium/)).toBeNull();
  });

  it('shows the real record on the back', async () => {
    await render(<CardScreen />);

    expect(screen.getByText('32')).toBeTruthy(); // partidas
    expect(screen.getByText('20')).toBeTruthy(); // vitórias
    expect(screen.getByText('4')).toBeTruthy(); // MVPs
    expect(screen.getByText('63%')).toBeTruthy(); // aproveitamento 20/32
  });

  it('flips with the "Ver verso" button', async () => {
    await render(<CardScreen />);

    await fireEvent.press(screen.getByTestId("flip-card"));
    expect(screen.getByText('Ver frente')).toBeTruthy();
  });

  it('exports the face being shown as a PNG and opens the share sheet', async () => {
    await render(<CardScreen />);

    await fireEvent.press(screen.getByTestId('export-card'));
    await waitFor(() => expect(mockShare).toHaveBeenCalledTimes(1));
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ format: 'png', result: 'tmpfile' }));
    expect(mockShare).toHaveBeenCalledWith('file:///tmp/carta.png', expect.objectContaining({ mimeType: 'image/png' }));
  });

  it('equips a finish and keeps the title', async () => {
    await render(<CardScreen />);

    fireEvent.press(screen.getByTestId('finish-Eclipse'));
    expect(mockMutate).toHaveBeenCalledWith({ finish: 'Eclipse', title: null });
  });

  it('picks a title on the Título tab', async () => {
    await render(<CardScreen />);

    await fireEvent.press(screen.getByText("Título"));
    fireEvent.press(screen.getByTestId('title-MURALHA'));
    expect(mockMutate).toHaveBeenCalledWith({ finish: 'Prisma', title: 'MURALHA' });
  });

  it('shows the collection on its own tab, the season card on the big card with its missing pieces (DECISIONS #194)', async () => {
    mockPass.cards = [T1];
    await render(<CardScreen />);
    expect(screen.queryByTestId('finish-Pioneira')).toBeNull(); // not among the finishes any more

    await fireEvent.press(screen.getByText('Coleção'));

    expect(screen.getByText('4 de 12 · em andamento')).toBeTruthy();
    expect(screen.getByText('Próximas cartas')).toBeTruthy();
    expect(screen.getAllByTestId('card-pieces').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByTestId('collection-open-pass'));
    expect(mockPush).toHaveBeenCalledWith('/profile/pass');
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('equips a complete card from the collection', async () => {
    mockPass.cards = [{ ...T1, status: 'Ended', pieces: 12, complete: true }];
    await render(<CardScreen />);

    await fireEvent.press(screen.getByText('Coleção'));
    await fireEvent.press(screen.getByTestId('collection-equip'));

    expect(mockMutate).toHaveBeenCalledWith({ finish: 'Pioneira', title: null });
  });

  it('says how an ended season left an incomplete card', async () => {
    mockPass.cards = [{ ...T1, status: 'Ended', pieces: 9 }];
    await render(<CardScreen />);

    await fireEvent.press(screen.getByText('Coleção'));

    expect(screen.getByText('A temporada acabou com 9 de 12 pedaços.')).toBeTruthy();
    expect(screen.queryByTestId('collection-equip')).toBeNull();
  });

  it('lists the season titles: the reached ones are picked, the others open the pass', async () => {
    mockPass.data = seasonPassFixture(4);
    await render(<CardScreen />);

    await fireEvent.press(screen.getByText("Título"));
    await fireEvent.press(screen.getByTestId('title-SEMPRE_PRESENTE'));
    expect(mockMutate).toHaveBeenCalledWith({ finish: 'Prisma', title: 'SEMPRE_PRESENTE' });
    expect(screen.getByText('Nível 6 do passe da temporada')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('title-CRIA_DA_QUADRA'));
    expect(mockPush).toHaveBeenCalledWith('/profile/pass');
  });

  it('lists the real numbers on the Estatísticas tab', async () => {
    await render(<CardScreen />);

    await fireEvent.press(screen.getByText("Estatísticas"));
    expect(screen.getAllByText('720')).toHaveLength(2); // back of the card + the list
    // Only the rule nobody can guess keeps a hint (owner's review 2026-10-21, item 14).
    expect(screen.queryByText('Vezes eleito o melhor da partida')).toBeNull();
    expect(screen.getByText('Presença +10, vitória +15, MVP +25')).toBeTruthy();
  });

  it('shows a loading placeholder while the profile is pending', async () => {
    mockProfile.isPending = true;
    await render(<CardScreen />);

    expect(screen.queryByText('Renan Dias')).toBeNull();
  });

  it('shows the error/retry row and refetches on retry', async () => {
    mockProfile.isError = true;
    await render(<CardScreen />);

    expect(screen.getByText('Não foi possível carregar a carta')).toBeTruthy();
    fireEvent.press(screen.getByText('Tentar novamente'));
    expect(mockProfile.refetch).toHaveBeenCalledTimes(1);
  });
});
