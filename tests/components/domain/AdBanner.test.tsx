/**
 * AdBanner (DECISIONS #200): always marked "Patrocinado"; showing it counts a view and a tap
 * counts a tap and opens the link; the form's preview counts nothing.
 */
import React from 'react';

jest.mock('expo-image', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return { Image: (props: any) => ReactLocal.createElement(View, props) };
});

import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

const mockApi = jest.fn();
jest.mock('@/lib/api/authorizedClient', () => ({ authorizedApiClient: (...args: unknown[]) => mockApi(...args) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/features/profile/api/profileApi', () => ({ uploadProfilePhoto: jest.fn() }));

import { AdBanner } from '@/components/domain/AdBanner';
import type { ServedAd } from '@/features/ads/api/ads';

const ad: ServedAd = {
  id: 'ad-1',
  placement: 'Home',
  title: 'Arena Sol',
  body: 'Day use a R$ 30',
  photoUrl: null,
  linkKind: 'WhatsApp',
  linkValue: '5511999998888',
};

beforeEach(() => {
  mockApi.mockReset().mockResolvedValue(undefined);
});

it('counts a view when shown and a tap when pressed', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await render(<AdBanner ad={ad} testID="banner" />);

  expect(screen.getByText('Patrocinado')).toBeTruthy();
  expect(screen.getByText('Arena Sol')).toBeTruthy();
  expect(mockApi).toHaveBeenCalledWith('/api/v1/ads/ad-1/views', expect.objectContaining({ body: JSON.stringify({ kind: 'Impression' }) }));

  await fireEvent.press(screen.getByTestId('banner'));
  expect(mockApi).toHaveBeenCalledWith('/api/v1/ads/ad-1/views', expect.objectContaining({ body: JSON.stringify({ kind: 'Click' }) }));
  expect(open).toHaveBeenCalledWith('https://wa.me/5511999998888');
});

it('counts nothing in the preview', async () => {
  await render(<AdBanner ad={ad} preview testID="banner" />);
  await fireEvent.press(screen.getByTestId('banner'));
  expect(mockApi).not.toHaveBeenCalled();
});
