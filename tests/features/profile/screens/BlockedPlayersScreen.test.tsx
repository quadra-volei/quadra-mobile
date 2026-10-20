/**
 * "Jogadores bloqueados" (`app/profile/blocked.tsx`): lists who I blocked and unblocks after a
 * confirmation. The hooks are mocked at the boundary.
 */
import React from 'react';

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) => ReactLocal.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return new Proxy({}, { get: () => (props: any) => ReactLocal.createElement(View, props) });
});

jest.mock('@/components/ui/Button', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress }: any) =>
      ReactLocal.createElement(Pressable, { onPress, accessibilityRole: 'button' }, ReactLocal.createElement(Text, null, children)),
  };
});

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

const mockBlocked = jest.fn();
const mockSetBlock = jest.fn();
jest.mock('@/features/network/api/postsApi', () => ({
  useBlockedPlayers: () => mockBlocked(),
  useSetBlock: () => ({ mutate: mockSetBlock }),
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { dialog } from '@/components/ui/Dialog';

import BlockedPlayersScreen from '../../../../app/profile/blocked';

async function renderScreen() {
  await act(async () => {
    render(<BlockedPlayersScreen />);
  });
}

beforeEach(() => {
  mockSetBlock.mockClear();
});

describe('Jogadores bloqueados', () => {
  it('lists the blocked players and unblocks one after a confirmation', async () => {
    mockBlocked.mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ userId: 'u1', displayName: 'Ana Lima', handle: 'ana', blockedAt: '2026-10-19T12:00:00Z' }],
    });
    const alert = jest.spyOn(dialog, 'alert').mockImplementation(() => {});
    await renderScreen();

    expect(screen.getByText('Ana Lima')).toBeTruthy();
    expect(screen.getByText('@ana')).toBeTruthy();
    fireEvent.press(screen.getByText('Desbloquear'));
    expect(mockSetBlock).not.toHaveBeenCalled();
    alert.mock.calls[0]![2]!.find((b) => b.text === 'Desbloquear')!.onPress!();

    expect(mockSetBlock).toHaveBeenCalledWith({ userId: 'u1', blocked: false }, expect.anything());
  });

  it('says when nobody is blocked', async () => {
    mockBlocked.mockReturnValue({ isPending: false, isError: false, data: [] });
    await renderScreen();

    expect(screen.getByText('Você não bloqueou ninguém.')).toBeTruthy();
  });
});
