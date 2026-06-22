/**
 * RankingRow — focused component test for the S9 ranking-row primitive.
 *
 * Verifies the row's user-visible contract in isolation (the screen test in
 * tests/features/ranking/screens/RankingScreen.test.tsx exercises it in context):
 *  - renders position, avatar, name, "@handle · Posição" subtitle and score;
 *  - appends "· você" and highlights only when `isMe`;
 *  - maps trend up -> ↑ success delta, down -> ↓ danger delta, flat/absent -> "—";
 *  - exposes a single accessibilityLabel (position/name/score/trend, + "você");
 *  - is NOT navigable (no accessibilityRole="button", no onPress).
 *
 * Native modules (expo-image, lucide) are stubbed inline — tests/__mocks__ are
 * not auto-applied.
 */
import React from 'react';

// expo-image -> inert node (avatar with a uri; the fixtures use the fallback).
jest.mock('expo-image', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return { Image: (props: any) => ReactLocal.createElement(View, props) };
});

// lucide trend icons -> inert testID'd nodes.
jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) =>
    ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  return {
    ArrowUp: stub('arrow-up'),
    ArrowDown: stub('arrow-down'),
    Minus: stub('minus'),
  };
});

import { render, screen } from '@testing-library/react-native';

import { RankingRow } from '@/components/domain/RankingRow';
import type { RankingRow as RankingRowData } from '@/features/ranking/types/ranking';

const BASE: RankingRowData = {
  position: 5,
  playerId: 'p-duda',
  name: 'Duda Reis',
  subtitle: '@dudareis · Ponteiro',
  score: 1870,
  trend: { direction: 'up', delta: 3 },
};

describe('RankingRow', () => {
  it('renders position, name, subtitle, score and avatar', async () => {
    await render(<RankingRow row={BASE} isMe={false} />);

    const position = screen.getByText('5');
    expect(position.props.className).toContain('font-num');
    expect(screen.getByText('Duda Reis')).toBeTruthy();
    expect(screen.getByText('@dudareis · Ponteiro')).toBeTruthy();
    const score = screen.getByText('1870');
    expect(score.props.className).toContain('font-num');
    expect(screen.getByLabelText('Avatar de Duda Reis')).toBeTruthy();
  });

  it('appends "· você" and highlights when isMe is true', async () => {
    await render(<RankingRow row={{ ...BASE, name: 'Renan Dias' }} isMe testID="me-row" />);

    expect(screen.getByText('· você')).toBeTruthy();
    // highlighted container styling
    expect(screen.getByTestId('me-row').props.className).toContain('bg-primary/10');
    // a11y announces "você"
    expect(screen.getByLabelText(/Renan Dias, você, 1870 pontos/)).toBeTruthy();
  });

  it('does not append "· você" when isMe is false', async () => {
    await render(<RankingRow row={BASE} isMe={false} testID="row" />);

    expect(screen.queryByText('· você')).toBeNull();
    expect(screen.getByTestId('row').props.className).not.toContain('bg-primary/10');
  });

  it('renders an up trend as a green delta with the up arrow', async () => {
    await render(<RankingRow row={{ ...BASE, trend: { direction: 'up', delta: 3 } }} isMe={false} />);

    expect(screen.getByTestId('icon-arrow-up')).toBeTruthy();
    const delta = screen.getByText('3');
    expect(delta.props.className).toContain('text-success');
  });

  it('renders a down trend as a red delta with the down arrow', async () => {
    await render(<RankingRow row={{ ...BASE, trend: { direction: 'down', delta: 2 } }} isMe={false} />);

    expect(screen.getByTestId('icon-arrow-down')).toBeTruthy();
    const delta = screen.getByText('2');
    expect(delta.props.className).toContain('text-danger');
  });

  it('renders a flat trend as a muted "—" (Minus) with no delta number', async () => {
    await render(<RankingRow row={{ ...BASE, trend: { direction: 'flat', delta: 0 } }} isMe={false} />);

    expect(screen.getByTestId('icon-minus')).toBeTruthy();
    expect(screen.queryByTestId('icon-arrow-up')).toBeNull();
    expect(screen.queryByTestId('icon-arrow-down')).toBeNull();
  });

  it('renders "—" (Minus) when trend is absent', async () => {
    const { trend, ...noTrend } = BASE;
    await render(<RankingRow row={noTrend} isMe={false} />);

    expect(screen.getByTestId('icon-minus')).toBeTruthy();
  });

  it('is not navigable (no button role, no onPress)', async () => {
    await render(<RankingRow row={BASE} isMe={false} testID="row" />);

    const row = screen.getByTestId('row');
    expect(row.props.accessibilityRole).toBeUndefined();
    expect(row.props.onPress).toBeUndefined();
  });
});
