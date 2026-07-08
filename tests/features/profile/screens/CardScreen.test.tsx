/**
 * S8b — Carta do Jogador (player card) screen tests.
 *
 * Covers:
 *  - Header shows a back affordance (→ router.back) and the "Carta do Jogador" title.
 *  - The card shows the GERAL number, the position tag, the player name +
 *    "@handle · Posição" subtitle, and the full 6-stat grid (ACE/BLK/ATA/DEF/SRV/REC).
 *  - "Compartilhar carta" opens the native share sheet.
 *  - Loading and error states render from the mocked useMyProfile query.
 *
 * useMyProfile is mocked at the hook boundary; native modules (safe-area,
 * expo-image, lucide, Button) are stubbed inline, mirroring the S8 screen test.
 */
import React from 'react';

// safe-area -> plain View.
jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      ReactLocal.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// expo-image -> inert node (the xl avatar with a uri).
jest.mock('expo-image', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return { Image: (props: any) => ReactLocal.createElement(View, props) };
});

// lucide icons -> inert nodes.
jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) =>
    ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  return {
    ChevronLeft: stub('chevron-left'),
    Lock: stub('lock'),
    Share2: stub('share'),
  };
});

// Button -> plain Pressable (its gradient/css-interop internals are covered by
// its own tests; here we only need the onPress wiring).
jest.mock('@/components/ui/Button', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID }: any) =>
      ReactLocal.createElement(
        Pressable,
        { onPress, testID, accessibilityRole: 'button' },
        ReactLocal.createElement(Text, null, children),
      ),
  };
});

// expo-router: spyable back() + push().
const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: (...args: any[]) => mockBack(...args),
    push: (...args: any[]) => mockPush(...args),
  },
}));

// react-native's `Share` is exposed on the index via a getter delegating to
// `./Libraries/Share/Share`.default; under jest-expo the auto-mocked reference
// the test spies on diverges from the one the component calls. Mock the module
// path directly so both sides observe the same `share` jest.fn.
jest.mock('react-native/Libraries/Share/Share', () => ({
  __esModule: true,
  default: {
    share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
    sharedAction: 'sharedAction',
    dismissedAction: 'dismissedAction',
  },
}));
const shareSpy = require('react-native/Libraries/Share/Share').default
  .share as jest.Mock;

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
  ata: 20,
  def: 31,
  srv: 27,
  rec: 24,
  level: 15,
  xp: 2450,
  xpToNext: 5000,
};

const mockProfile: {
  data: MyProfile | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: jest.Mock;
} = {
  data: PROFILE_FIXTURE,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/features/profile/api/getMyProfile', () => ({
  useMyProfile: () => ({
    data: mockProfile.data,
    isPending: mockProfile.isPending,
    isError: mockProfile.isError,
    refetch: mockProfile.refetch,
  }),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';

import CardScreen from '../../../../app/profile/card';

beforeEach(() => {
  mockBack.mockClear();
  mockPush.mockClear();
  shareSpy.mockClear();
  mockProfile.data = PROFILE_FIXTURE;
  mockProfile.isPending = false;
  mockProfile.isError = false;
  mockProfile.refetch.mockClear();
});

describe('S8b — Carta do Jogador', () => {
  it('renders the header with a back affordance and the title', async () => {
    await render(<CardScreen />);

    expect(screen.getByText('Carta do Jogador')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Voltar'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders the GERAL number and the position tag', async () => {
    await render(<CardScreen />);

    const geral = screen.getByText('68');
    expect(geral.props.className).toContain('font-num');
    // position tag (short code)
    expect(screen.getByText('LEV')).toBeTruthy();
  });

  it('renders the player name and "@handle · Posição" subtitle', async () => {
    await render(<CardScreen />);

    const name = screen.getByText('Renan Dias');
    expect(name.props.className).toContain('font-display');
    expect(name.props.className).toContain('uppercase');
    expect(screen.getByText('@renan · Levantador')).toBeTruthy();
  });

  it('renders the full 6-stat grid (ACE/BLK/ATA/DEF/SRV/REC)', async () => {
    await render(<CardScreen />);

    for (const label of ['ACE', 'BLK', 'ATA', 'DEF', 'SRV', 'REC']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    // a couple of the distinct values
    expect(screen.getByText('30')).toBeTruthy(); // ACE
    expect(screen.getByText('27')).toBeTruthy(); // SRV
    expect(screen.getByText('24')).toBeTruthy(); // REC
  });

  it('opens the native share sheet from "Compartilhar carta"', async () => {
    await render(<CardScreen />);

    fireEvent.press(screen.getByTestId('share-card'));
    expect(shareSpy).toHaveBeenCalledTimes(1);
    const [payload] = shareSpy.mock.calls[0] as [{ message: string }];
    expect(payload.message).toContain('Renan Dias');
    expect(payload.message).toContain('68');
  });

  it('shows a loading placeholder while the profile is pending', async () => {
    mockProfile.isPending = true;
    await render(<CardScreen />);

    // The card body content is absent while loading.
    expect(screen.queryByText('Renan Dias')).toBeNull();
    expect(screen.queryByText('Compartilhar carta')).toBeNull();
  });

  it('shows the error/retry row and refetches on retry', async () => {
    mockProfile.isError = true;
    await render(<CardScreen />);

    expect(screen.getByText('Não foi possível carregar a carta')).toBeTruthy();
    fireEvent.press(screen.getByText('Tentar novamente'));
    expect(mockProfile.refetch).toHaveBeenCalledTimes(1);
  });
});
