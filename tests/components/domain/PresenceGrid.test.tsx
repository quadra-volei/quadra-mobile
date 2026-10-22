/**
 * S12 — PresenceGrid component tests (`src/components/domain/PresenceGrid.tsx`).
 *
 * Owner's review of 2026-10-21 (items 6–8): one row per player with the @ (a
 * guest keeps the name), the position tag, a tap that opens the profile, a
 * capacity bar for the open slots and a separate add-guest action. No per-player
 * OVR number anywhere (Layer-3 cut).
 *
 * Avatar's expo-image dependency is stubbed inline (the repo's tests/__mocks__ are
 * NOT auto-applied). The grid itself is presentational, so it renders for real.
 */
import React from 'react';

jest.mock('expo-image', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: any) => ReactLocal.createElement(View, props),
  };
});

jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return new Proxy({}, { get: () => (props: any) => ReactLocal.createElement(View, props) });
});
jest.mock('react-native-svg', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const Stub = (props: any) => ReactLocal.createElement(View, props);
  return { __esModule: true, default: Stub, Svg: Stub, Path: Stub, Circle: Stub };
});

import { fireEvent, render, screen } from '@testing-library/react-native';

import { PresenceGrid } from '@/components/domain/PresenceGrid';
import type { PresencePlayer } from '@/features/matches/types/matchDetail';

const PLAYERS: PresencePlayer[] = [
  { id: 'p1', name: 'Renan Dias', handle: 'renan', status: 'CONFIRMADO', position: 'LEV' },
  { id: 'p2', name: 'Bia Lima', handle: 'bia.vb', status: 'CONFIRMADO', position: 'COR' },
  { id: 'g1', name: 'Zé', status: 'CONFIRMADO', isGuest: true },
];

describe('S12 — PresenceGrid', () => {
  it('lists players by @ and guests by name, with their position tag', async () => {
    await render(<PresenceGrid players={PLAYERS} capacity={6} testID="grid" />);

    expect(screen.getByText('@renan')).toBeTruthy();
    expect(screen.getByText('@bia.vb')).toBeTruthy();
    expect(screen.queryByText('Renan Dias')).toBeNull();
    expect(screen.getByText('Zé')).toBeTruthy();
    expect(screen.getByText('Convidado')).toBeTruthy();
    expect(screen.getByText('Levantador')).toBeTruthy();
    expect(screen.getByText('Coringa')).toBeTruthy();
  });

  it('opens a player on tap, never a guest', async () => {
    const onPressPlayer = jest.fn();
    await render(
      <PresenceGrid players={PLAYERS} capacity={6} onPressPlayer={onPressPlayer} testID="grid" />,
    );

    await fireEvent.press(screen.getByTestId('grid-player-p2'));
    expect(onPressPlayer).toHaveBeenCalledWith(PLAYERS[1]);

    onPressPlayer.mockClear();
    await fireEvent.press(screen.getByTestId('grid-player-g1'));
    expect(onPressPlayer).not.toHaveBeenCalled();
  });

  it('draws one bar segment per slot and offers the guest action only with open slots', async () => {
    const onAddGuest = jest.fn();
    const { rerender } = await render(
      <PresenceGrid players={PLAYERS} capacity={6} onAddGuest={onAddGuest} testID="grid" />,
    );

    expect(screen.getByTestId('grid-bar').children).toHaveLength(6);
    await fireEvent.press(screen.getByTestId('grid-add-guest'));
    expect(onAddGuest).toHaveBeenCalledTimes(1);

    await rerender(
      <PresenceGrid players={PLAYERS} capacity={3} onAddGuest={onAddGuest} testID="grid" />,
    );
    expect(screen.queryByTestId('grid-add-guest')).toBeNull();
  });

  it('renders no OVR label anywhere', async () => {
    await render(<PresenceGrid players={PLAYERS} capacity={6} />);
    expect(screen.queryByText(/OVR/i)).toBeNull();
  });
});
