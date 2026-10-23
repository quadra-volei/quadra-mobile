/**
 * Arena curation (`app/profile/curation.tsx`, DECISIONS #181): the team reviews the pending
 * Google places of the area and approves, rejects or links each one; a decision can be undone
 * right after. Hooks are mocked at the boundary; the API's own tests cover who may call it.
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

jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) => ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  return { ChevronLeft: stub('chevron-left'), ExternalLink: stub('external-link'), X: stub('x') };
});

jest.mock('@/components/ui/Button', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID, disabled }: any) =>
      ReactLocal.createElement(
        Pressable,
        { onPress, testID, disabled, accessibilityRole: 'button', accessibilityState: { disabled: Boolean(disabled) } },
        ReactLocal.createElement(Text, null, children),
      ),
  };
});

jest.mock('react-native-maps', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = ({ children, ...props }: any) => ReactLocal.createElement(View, props, children);
  return { __esModule: true, default: stub, Marker: stub };
});

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

jest.mock('@/features/matches/lib/useDeviceCoords', () => ({
  useDeviceLocation: () => ({ coords: { latitude: -23.66, longitude: -46.66 }, resolved: true }),
}));

jest.mock('@/features/explore/api/venues', () => ({
  ...jest.requireActual('@/features/explore/api/venues'),
  useVenueDetails: (placeId: string | null) => ({
    isPending: false,
    data: placeId ? { title: 'CERET', address: 'Rua Canuto Saraiva, 1' } : undefined,
  }),
}));

import type { Candidates } from '@/features/curation/api/curation';

const mockData: { value: Candidates } = { value: { candidates: [], arenas: [], pendingCount: 0, truncated: false } };
const mockDecide = jest.fn();
const mockUndo = jest.fn();
const mockDiscover = jest.fn();
jest.mock('@/features/curation/api/curation', () => ({
  ...jest.requireActual('@/features/curation/api/curation'),
  useCandidates: () => ({ data: mockData.value, isPending: false }),
  useDecide: () => ({ mutate: mockDecide, isPending: false }),
  useUndoDecision: () => ({ mutate: mockUndo, isPending: false }),
  useDiscover: () => ({ mutate: mockDiscover, isPending: false }),
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { dialog } from '@/components/ui/Dialog';

import CurationScreen from '../../../app/profile/curation';

const candidate = (placeId: string, over: Partial<Candidates['candidates'][number]> = {}) => ({
  placeId,
  lat: -23.66,
  lon: -46.66,
  kind: 'Sand' as const,
  distanceKm: 0.4,
  gamesNearby: 0,
  neighbors: [],
  expiresAt: '2026-11-20T00:00:00Z',
  ...over,
});

async function renderScreen() {
  await act(async () => {
    render(<CurationScreen />);
  });
}

async function press(testID: string) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

let alert: jest.SpyInstance;

beforeEach(() => {
  mockDecide.mockReset();
  mockUndo.mockReset();
  mockDiscover.mockReset();
  alert = jest.spyOn(dialog, 'alert').mockImplementation(() => undefined);
  mockData.value = {
    candidates: [candidate('ChIJmain', { gamesNearby: 2, neighbors: ['ChIJgate'] }), candidate('ChIJgate')],
    arenas: [],
    pendingCount: 2,
    truncated: false,
  };
});

afterEach(() => alert.mockRestore());

describe('Arena curation', () => {
  it('lists what is pending in the area, games nearby and likely duplicates first', async () => {
    await renderScreen();

    expect(screen.getByTestId('curation-count').props.children).toBe('2 lugares para revisar nesta área');
    expect(screen.getByText('2 jogos marcados perto')).toBeTruthy();
    expect(screen.getByText('Outro lugar a menos de 100 m: provável duplicata')).toBeTruthy();
  });

  it('approves a place as an arena of the kind picked, at its point, and offers to undo', async () => {
    await renderScreen();
    await press('curation-row-ChIJmain');
    expect(screen.getByTestId('curation-title').props.children).toBe('CERET');

    await press('curation-kind-Court');
    await press('curation-approve');

    expect(mockDecide).toHaveBeenCalledWith(
      { action: 'Approve', placeId: 'ChIJmain', kind: 'Court', latitude: -23.66, longitude: -46.66, pinMoved: false },
      expect.anything(),
    );
    await act(async () => mockDecide.mock.calls[0]![1].onSuccess());
    const [, , buttons] = alert.mock.calls.at(-1)!;
    buttons.find((b: { text: string }) => b.text === 'Desfazer').onPress();
    expect(mockUndo).toHaveBeenCalledWith('ChIJmain');
  });

  it('rejects a place', async () => {
    await renderScreen();
    await press('curation-row-ChIJgate');
    await press('curation-reject');

    expect(mockDecide.mock.calls[0]![0]).toEqual({ action: 'Reject', placeId: 'ChIJgate' });
  });

  it('links a place to an approved arena close to it', async () => {
    await renderScreen();
    await press('curation-row-ChIJgate');
    expect(screen.getByTestId('curation-link').props.accessibilityState.disabled).toBe(true);

    mockData.value = {
      ...mockData.value,
      arenas: [{ id: 'arena-1', placeId: 'ChIJold', lat: -23.6604, lon: -46.66, kind: 'Sand' }],
    };
    await renderScreen();
    await press('curation-row-ChIJgate');
    await press('curation-link');
    const [title, , buttons] = alert.mock.calls.at(-1)!;
    expect(title).toBe('É a mesma arena que…');
    buttons[0].onPress();

    expect(mockDecide.mock.calls[0]![0]).toEqual({ action: 'Link', placeId: 'ChIJgate', arenaId: 'arena-1' });
  });

  it('searches Google for the area only when asked', async () => {
    await renderScreen();
    expect(mockDiscover).not.toHaveBeenCalled();

    await press('curation-discover');

    expect(mockDiscover.mock.calls[0]![0]).toEqual({ lat: -23.66, lon: -46.66, radiusKm: 6 });
  });
});
