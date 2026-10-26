/**
 * The bell's list (`app/notifications.tsx`): opening a notification marks it read and goes to
 * its match screen; the list is split in Recentes / Anteriores, filters the unread ones, and
 * clears one (swipe) or all (trash, after a confirmation). Hooks are mocked at the boundary.
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

// The swipe is native: the stand-in draws the row and its "Excluir" action side by side.
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, renderRightActions }: any) =>
      ReactLocal.createElement(View, null, children, renderRightActions?.()),
  };
});

const mockMarkRead = jest.fn();
const mockDelete = jest.fn();
const mockList = jest.fn();
jest.mock('@/features/notifications/api/notificationsApi', () => ({
  useNotifications: () => mockList(),
  useMarkRead: () => ({ mutate: mockMarkRead }),
  useDeleteNotification: () => ({ mutate: mockDelete }),
}));
const mockAlert = jest.fn();
jest.mock('@/components/ui/Dialog', () => ({ dialog: { alert: (...a: any[]) => mockAlert(...a) } }));

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

  it('splits the list in Recentes and Anteriores and filters the unread ones', async () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    mockList.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item({}), item({ id: 'n2', title: 'Vote no MVP', createdAt: twoDaysAgo, read: true })],
    });
    await render(<NotificationsListScreen />);

    expect(screen.getByText('Recentes')).toBeTruthy();
    expect(screen.getByText('Anteriores')).toBeTruthy();
    expect(screen.getAllByTestId('notification')).toHaveLength(2);

    await fireEvent.press(screen.getByTestId('filter-unread'));
    expect(screen.getAllByTestId('notification')).toHaveLength(1);
    expect(screen.queryByText('Anteriores')).toBeNull();
  });

  it('clears one notification from its swipe action and all of them after confirming', async () => {
    mockList.mockReturnValue({ isPending: false, isError: false, data: [item({})] });
    await render(<NotificationsListScreen />);

    await fireEvent.press(screen.getByTestId('notification-delete'));
    expect(mockDelete).toHaveBeenCalledWith('n1', expect.anything());

    await fireEvent.press(screen.getByTestId('clear-all'));
    expect(mockDelete).toHaveBeenCalledTimes(1);
    const [, , buttons] = mockAlert.mock.calls[0];
    buttons.find((b: any) => b.style === 'destructive').onPress();
    expect(mockDelete).toHaveBeenLastCalledWith(undefined, expect.anything());
  });

  it('says when there is nothing yet', async () => {
    mockList.mockReturnValue({ isPending: false, isError: false, data: [] });
    await render(<NotificationsListScreen />);
    expect(screen.getByText(/Nada por aqui ainda/)).toBeTruthy();
    expect(screen.queryByTestId('clear-all')).toBeNull();
  });
});
