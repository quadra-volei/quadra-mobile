/**
 * LocationPrompt — the centred card that asks for the location over the tabs
 * (DECISIONS #72, #188).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

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

jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: View };
});

// lucide MapPin -> inert node (avoids svg internals).
jest.mock('lucide-react-native', () => ({
  MapPin: () => null,
}));

import { LocationPrompt } from '@/components/domain/LocationPrompt';

const onGranted = jest.fn();
const renderPrompt = () => render(<LocationPrompt onGranted={onGranted} />);

describe('LocationPrompt', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockRequest.mockReset();
    onGranted.mockReset();
  });

  it.each(['granted', 'denied'])(
    'shows nothing when the permission is already %s',
    async (status) => {
      mockGet.mockResolvedValue({ status });
      await renderPrompt();
      await waitFor(() => expect(mockGet).toHaveBeenCalled());
      expect(screen.queryByTestId('location-prompt')).toBeNull();
      expect(mockRequest).not.toHaveBeenCalled();
    },
  );

  it('shows nothing when the system does not answer', async () => {
    mockGet.mockRejectedValue(new Error('no module'));
    await renderPrompt();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.queryByTestId('location-prompt')).toBeNull();
  });

  it('asks in the card, and closes once the user allows', async () => {
    mockGet.mockResolvedValue({ status: 'undetermined' });
    mockRequest.mockResolvedValue({ status: 'granted' });
    await renderPrompt();

    expect(await screen.findByText('Jogos perto de você')).toBeTruthy();
    fireEvent.press(screen.getByTestId('location-prompt-allow'));

    await waitFor(() => expect(screen.queryByTestId('location-prompt')).toBeNull());
    expect(onGranted).toHaveBeenCalledTimes(1);
  });

  it('explains what is lost when the user denies, then lets them in', async () => {
    mockGet.mockResolvedValue({ status: 'undetermined' });
    mockRequest.mockResolvedValue({ status: 'denied' });
    await renderPrompt();

    fireEvent.press(await screen.findByTestId('location-prompt-allow'));
    const go = await screen.findByTestId('location-prompt-continue');
    expect(screen.getByText('Sem localização')).toBeTruthy();

    fireEvent.press(go);
    await waitFor(() => expect(screen.queryByTestId('location-prompt')).toBeNull());
    expect(onGranted).not.toHaveBeenCalled();
  });

  it('says it is settled only once nothing is left to ask', async () => {
    const onSettled = jest.fn();
    mockGet.mockResolvedValue({ status: 'undetermined' });
    mockRequest.mockResolvedValue({ status: 'granted' });
    await render(<LocationPrompt onGranted={onGranted} onSettled={onSettled} />);

    fireEvent.press(await screen.findByTestId('location-prompt-allow'));
    expect(onSettled).not.toHaveBeenCalled();

    await waitFor(() => expect(onSettled).toHaveBeenCalledTimes(1));
  });

  it('is settled at once when the permission was already answered', async () => {
    const onSettled = jest.fn();
    mockGet.mockResolvedValue({ status: 'granted' });
    await render(<LocationPrompt onGranted={onGranted} onSettled={onSettled} />);

    await waitFor(() => expect(onSettled).toHaveBeenCalledTimes(1));
  });
});
