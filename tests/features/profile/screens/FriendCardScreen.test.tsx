/**
 * Another player's card (`app/players/[id]/card.tsx`): shows their card with their style and
 * public numbers, and flips it. PlayerCard itself is covered by its own tests; it is stubbed here.
 */
import React from 'react';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return new Proxy({}, { get: () => (props: any) => ReactLocal.createElement(View, props) });
});
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 'u2' }),
}));

const mockCard = jest.fn();
jest.mock('@/components/domain/PlayerCard', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return {
    PlayerCard: (props: any) => {
      mockCard(props);
      return ReactLocal.createElement(Text, null, props.flipped ? 'verso' : 'frente');
    },
  };
});
// The screen reuses StatsList from the own-card screen; keep that screen's native imports out.
jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-sharing', () => ({}));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));

const mockProfile = jest.fn();
jest.mock('@/features/network/api/postsApi', () => ({
  usePlayerProfile: () => mockProfile(),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';

import PlayerCardScreen from '../../../../app/players/[id]/card';

const apiProfile = {
  userId: 'u2',
  displayName: 'Bia Souza',
  firstName: 'Bia',
  lastName: 'Souza',
  handle: 'bia',
  birthDate: null,
  position: 'LEV',
  photoUrl: 'https://example.com/bia.png',
  skills: { overall: 70, ace: 60, block: 50, attack: 65, defense: 72 },
  stats: { matchesPlayed: 12, wins: 8, losses: 4, draws: 0, mvpsReceived: 3, totalPoints: 315, levelNumber: 4 },
  cardStyle: { finish: 'Eclipse', title: 'MAESTRO', photoUrl: 'https://example.com/card.png', photoObjectKey: null },
};

describe("a friend's card", () => {
  it('shows their styled card and numbers, and flips it', async () => {
    mockProfile.mockReturnValue({ data: apiProfile, isPending: false, isError: false, refetch: jest.fn() });

    await render(<PlayerCardScreen />);

    expect(screen.getByText('Carta de Bia')).toBeTruthy();
    expect(mockCard).toHaveBeenLastCalledWith(
      expect.objectContaining({ finish: 'Eclipse', photoUrl: 'https://example.com/card.png', flipped: false }),
    );
    expect(screen.getByText('315')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('friend-card-flip'));
    expect(screen.getByText('verso')).toBeTruthy();
  });
});
