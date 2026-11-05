/**
 * Team "Anúncios" (`app/profile/ads-review.tsx`, DECISIONS #201): an ad waiting for the team is
 * approved or refused in one step; approving one not yet paid asks the team to confirm the payment
 * in the same dialog. The hooks are mocked at the boundary.
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

jest.mock('@/components/ui/Button', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID }: any) =>
      ReactLocal.createElement(Pressable, { onPress, testID, accessibilityRole: 'button' }, ReactLocal.createElement(Text, null, children)),
  };
});

jest.mock('@/components/domain/AdBanner', () => ({ AdBanner: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

const mockTeamAds = jest.fn();
const mockReview = jest.fn();
jest.mock('@/features/ads/api/ads', () => ({
  ...jest.requireActual('@/features/ads/api/ads'),
  useTeamAds: () => mockTeamAds(),
  useReviewAd: () => ({ mutate: mockReview, isPending: false }),
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { dialog } from '@/components/ui/Dialog';

import AdsReviewScreen from '../../../app/profile/ads-review';

function teamAd(id: string, phase: string) {
  return {
    advertiserId: 'u1',
    paymentReference: null,
    ad: {
      id,
      placement: 'Home',
      title: `Arena ${id}`,
      body: null,
      photoUrl: null,
      linkKind: 'None',
      linkValue: null,
      latitude: -23.55,
      longitude: -46.63,
      radiusKm: 10,
      startsOn: '2026-11-05',
      endsOn: '2026-11-12',
      weeks: 1,
      priceCents: 5900,
      phase,
      rejectionReason: null,
      impressions: 0,
      clicks: 0,
      createdAt: '2026-11-05T10:00:00Z',
    },
  };
}

async function renderScreen() {
  await act(async () => {
    render(<AdsReviewScreen />);
  });
}

beforeEach(() => {
  mockReview.mockClear();
  mockTeamAds.mockReturnValue({
    isPending: false,
    isError: false,
    data: [teamAd('a1', 'AwaitingPayment'), teamAd('a2', 'Live')],
  });
});

describe('Anúncios da equipe', () => {
  it('approves an unpaid ad in one step, after confirming the payment', async () => {
    const alert = jest.spyOn(dialog, 'alert').mockImplementation(() => {});
    await renderScreen();

    expect(screen.queryByText('Marcar como pago')).toBeNull();
    expect(screen.queryByTestId('team-ad-a2')).toBeNull();
    await fireEvent.press(screen.getByTestId('team-ad-approve-a1'));

    expect(alert).toHaveBeenCalledWith('Aprovar anúncio?', expect.stringContaining('R$ 59'), expect.any(Array));
    const buttons = alert.mock.calls[0]![2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === 'Aprovar')!.onPress!();
    expect(mockReview).toHaveBeenCalledWith({ id: 'a1', approve: true }, expect.anything());
  });

  it('refuses with a reason', async () => {
    const alert = jest.spyOn(dialog, 'alert').mockImplementation(() => {});
    await renderScreen();

    await fireEvent.press(screen.getByTestId('team-ad-refuse-a1'));
    const buttons = alert.mock.calls[0]![2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === 'Imagem fora das regras')!.onPress!();
    expect(mockReview).toHaveBeenCalledWith(
      { id: 'a1', approve: false, reason: 'Imagem fora das regras' },
      expect.anything(),
    );
  });

  it('shows the approved ones under their filter', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByText('Aprovados'));
    expect(screen.getByTestId('team-ad-a2')).toBeTruthy();
    expect(screen.queryByTestId('team-ad-approve-a2')).toBeNull();
  });
});
