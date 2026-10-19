/**
 * The bell's list (`app/notifications.tsx`): opening a notification marks it read and goes to
 * its match screen. Hooks are mocked at the boundary.
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
jest.mock('@/components/ui/Button', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID }: any) =>
      ReactLocal.createElement(Pressable, { onPress, testID }, ReactLocal.createElement(Text, null, children)),
  };
});
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: any[]) => mockPush(...a), back: jest.fn() } }));

const mockMarkRead = jest.fn();
const mockList = jest.fn();
jest.mock('@/features/notifications/api/notificationsApi', () => ({
  useNotifications: () => mockList(),
  useMarkRead: () => ({ mutate: mockMarkRead }),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';

import NotificationsListScreen from '../../../app/notifications';

const item = (over: object) => ({
  id: 'n1',
  type: 'SummaryReady',
  title: 'Resumo do jogo pronto',
  body: 'Veja placar, MVP e seus pontos em Racha.',
  matchId: 'm1',
  createdAt: new Date().toISOString(),
  read: false,
  ...over,
});

describe('Notificações', () => {
  it('opens a notification on its match screen and marks it read', async () => {
    mockList.mockReturnValue({ isPending: false, isError: false, data: [item({})] });
    await render(<NotificationsListScreen />);

    await fireEvent.press(screen.getByTestId('notification'));

    expect(mockMarkRead).toHaveBeenCalledWith('n1');
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/matches/[id]/summary', params: { id: 'm1' } });
    await fireEvent.press(screen.getByTestId('mark-all-read'));
    expect(mockMarkRead).toHaveBeenLastCalledWith(undefined);
  });

  it('says when there is nothing yet', async () => {
    mockList.mockReturnValue({ isPending: false, isError: false, data: [] });
    await render(<NotificationsListScreen />);
    expect(screen.getByText(/Nada por aqui ainda/)).toBeTruthy();
  });
});
