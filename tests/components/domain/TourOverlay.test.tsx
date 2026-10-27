/**
 * TourOverlay — the first-access tour (DECISIONS #190): welcome card, one
 * highlight per tab bar item, and how the player left it recorded on the
 * account (`PUT /api/v1/profiles/me/tour`, API DECISIONS #97) and on the phone.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockApi = jest.fn();
jest.mock('@/lib/api/authorizedClient', () => ({
  authorizedApiClient: (...args: unknown[]) => mockApi(...args),
}));

// Every tab bar item is mounted, except the ones a test takes away.
const mockUnmounted = new Set<string>();
jest.mock('@/features/tour/tourTargets', () => ({
  measureTourTarget: (id: string) =>
    Promise.resolve(mockUnmounted.has(id) ? null : { x: 100, y: 700, width: 28, height: 28 }),
}));

import { TourOverlay } from '@/components/domain/TourOverlay';
import { useTourStore } from '@/features/tour/tourStore';
import { TOUR_STEPS, TOUR_VERSION } from '@/features/tour/tourSteps';
import { useAuthStore } from '@/stores/auth';

const USER_ID = 'user-1';

function renderTour() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TourOverlay />
    </QueryClientProvider>,
  );
}

const sentBody = () => JSON.parse((mockApi.mock.calls[0][1] as { body: string }).body);

describe('TourOverlay', () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockApi.mockResolvedValue({ version: 1, outcome: 'Completed', lastStep: 4, endedAt: '2026-10-27T00:00:00Z' });
    mockUnmounted.clear();
    useTourStore.setState({ phase: 'closed', seen: {} });
    useAuthStore.setState({ userId: USER_ID });
  });

  it('shows nothing while closed', async () => {
    await renderTour();
    expect(screen.queryByTestId('tour-welcome')).toBeNull();
  });

  it('"Agora não" on the welcome card closes it and records a skip at step 0', async () => {
    useTourStore.getState().open();
    await renderTour();

    fireEvent.press(screen.getByTestId('tour-later'));

    await waitFor(() => expect(mockApi).toHaveBeenCalledTimes(1));
    expect(mockApi.mock.calls[0][0]).toBe('/api/v1/profiles/me/tour');
    expect(sentBody()).toEqual({ version: TOUR_VERSION, outcome: 'Skipped', lastStep: 0 });
    expect(useTourStore.getState().phase).toBe('closed');
    expect(useTourStore.getState().seen[USER_ID]).toBe(TOUR_VERSION);
  });

  it('walks every step and records the tour as completed', async () => {
    useTourStore.getState().open();
    await renderTour();

    fireEvent.press(screen.getByTestId('tour-start'));
    for (const [i, step] of TOUR_STEPS.entries()) {
      expect(await screen.findByTestId(`tour-step-${i + 1}`)).toBeTruthy();
      expect(screen.getByText(step.title)).toBeTruthy();
      fireEvent.press(screen.getByTestId('tour-next'));
    }

    await waitFor(() => expect(mockApi).toHaveBeenCalledTimes(1));
    expect(sentBody()).toEqual({ version: TOUR_VERSION, outcome: 'Completed', lastStep: TOUR_STEPS.length });
    expect(useTourStore.getState().phase).toBe('closed');
  });

  it('"Pular" in the middle records the step where the player left', async () => {
    useTourStore.getState().open();
    await renderTour();

    fireEvent.press(screen.getByTestId('tour-start'));
    await screen.findByTestId('tour-step-1');
    fireEvent.press(screen.getByTestId('tour-next'));
    await screen.findByTestId('tour-step-2');
    fireEvent.press(screen.getByTestId('tour-skip'));

    await waitFor(() => expect(mockApi).toHaveBeenCalledTimes(1));
    expect(sentBody()).toEqual({ version: TOUR_VERSION, outcome: 'Skipped', lastStep: 2 });
  });

  it('skips a step whose tab bar item is not on screen', async () => {
    mockUnmounted.add(TOUR_STEPS[0]!.target);
    useTourStore.getState().open();
    await renderTour();

    fireEvent.press(screen.getByTestId('tour-start'));

    expect(await screen.findByTestId('tour-step-2')).toBeTruthy();
    expect(screen.queryByTestId('tour-step-1')).toBeNull();
  });

  it('the last step has no "Pular"', async () => {
    useTourStore.setState({ phase: TOUR_STEPS.length });
    await renderTour();

    expect(await screen.findByText('Concluir')).toBeTruthy();
    expect(screen.queryByTestId('tour-skip')).toBeNull();
  });
});
