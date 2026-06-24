/**
 * S12 — PresenceGrid component tests (`src/components/domain/PresenceGrid.tsx`).
 *
 * Covers the confirmed-players-grid criteria of docs/specs/S12-match-detail.md:
 *  - one Avatar + name per player;
 *  - dashed "vaga" placeholders for the remaining `capacity - players.length` slots;
 *  - NO per-player OVR number is rendered anywhere (Layer-3 cut).
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

import { render, screen, within } from '@testing-library/react-native';

import { PresenceGrid } from '@/components/domain/PresenceGrid';
import type { PresencePlayer } from '@/features/matches/types/matchDetail';

const PLAYERS: PresencePlayer[] = [
  { id: 'p1', name: 'Renan', status: 'CONFIRMADO', position: 'LEV' },
  { id: 'p2', name: 'Bia', status: 'CONFIRMADO', position: 'PON' },
  { id: 'p3', name: 'Caio', status: 'CONFIRMADO', position: 'OPO' },
];

describe('S12 — PresenceGrid', () => {
  /**
   * Covers: S12 — Match Detail
   * Criterion: "The confirmed-players grid (PresenceGrid) shows one Avatar + name
   *  per confirmed player ..."
   */
  it('renders an avatar + name cell per player', async () => {
    await render(<PresenceGrid players={PLAYERS} capacity={6} testID="grid" />);

    expect(screen.getByText('Renan')).toBeTruthy();
    expect(screen.getByText('Bia')).toBeTruthy();
    expect(screen.getByText('Caio')).toBeTruthy();
    // one avatar per player (initials fallback labelled "Avatar de <name>")
    expect(screen.getByLabelText('Avatar de Renan')).toBeTruthy();
    expect(screen.getByLabelText('Avatar de Bia')).toBeTruthy();
    expect(screen.getByLabelText('Avatar de Caio')).toBeTruthy();
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: "... and dashed 'vaga' placeholders for the remaining
   *  `capacity - confirmedCount` slots."
   */
  it('renders one dashed "vaga" placeholder per remaining open slot', async () => {
    await render(<PresenceGrid players={PLAYERS} capacity={6} testID="grid" />);

    // capacity 6 - 3 players = 3 empty slots
    const empties = screen.getAllByTestId('grid-empty');
    expect(empties).toHaveLength(3);
    expect(screen.getAllByText('vaga')).toHaveLength(3);
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: empties never go negative when the grid is full.
   */
  it('renders no "vaga" placeholders when the grid is full', async () => {
    await render(<PresenceGrid players={PLAYERS} capacity={3} testID="grid" />);

    expect(screen.queryByTestId('grid-empty')).toBeNull();
    expect(screen.queryByText('vaga')).toBeNull();
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: "No per-player OVR number is rendered anywhere (Layer-3 cut)."
   */
  it('renders no OVR label anywhere', async () => {
    await render(<PresenceGrid players={PLAYERS} capacity={6} testID="grid" />);

    expect(screen.queryByText(/OVR/i)).toBeNull();
    // and no stray two-digit overall numbers next to the names
    expect(screen.queryByText(/\b8[0-9]\b/)).toBeNull();
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: each cell pairs exactly one avatar with one name (no extra metadata).
   */
  it('pairs exactly one avatar with each player name', async () => {
    await render(<PresenceGrid players={PLAYERS} capacity={4} testID="grid" />);

    const cell = screen.getByLabelText('Avatar de Renan').parent;
    expect(cell).toBeTruthy();
    expect(within(cell!).getByText('Renan')).toBeTruthy();
  });
});
