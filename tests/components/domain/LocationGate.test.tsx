/**
 * LocationGate — asks for the location before the tabs mount (DECISIONS #72).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

const mockGet = jest.fn();
const mockRequest = jest.fn();
jest.mock('expo-location', () => ({
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  getForegroundPermissionsAsync: () => mockGet(),
  requestForegroundPermissionsAsync: () => mockRequest(),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

import { LocationGate } from '@/components/domain/LocationGate';

const renderGate = () =>
  render(
    <LocationGate>
      <Text>app</Text>
    </LocationGate>,
  );

describe('LocationGate', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockRequest.mockReset();
  });

  it.each(['granted', 'denied'])(
    'goes straight to the app when the permission is already %s',
    async (status) => {
      mockGet.mockResolvedValue({ status });
      await renderGate();
      expect(await screen.findByText('app')).toBeTruthy();
      expect(mockRequest).not.toHaveBeenCalled();
    },
  );

  it('goes to the app when the system does not answer', async () => {
    mockGet.mockRejectedValue(new Error('no module'));
    await renderGate();
    expect(await screen.findByText('app')).toBeTruthy();
  });

  it('asks first, and opens the app once the user allows', async () => {
    mockGet.mockResolvedValue({ status: 'undetermined' });
    mockRequest.mockResolvedValue({ status: 'granted' });
    await renderGate();

    fireEvent.press(await screen.findByTestId('location-gate-allow'));

    expect(await screen.findByText('app')).toBeTruthy();
  });

  it('explains what is lost when the user denies, then lets them in', async () => {
    mockGet.mockResolvedValue({ status: 'undetermined' });
    mockRequest.mockResolvedValue({ status: 'denied' });
    await renderGate();

    fireEvent.press(await screen.findByTestId('location-gate-allow'));
    const go = await screen.findByTestId('location-gate-continue');
    expect(screen.queryByText('app')).toBeNull();

    fireEvent.press(go);
    await waitFor(() => expect(screen.getByText('app')).toBeTruthy());
  });
});
