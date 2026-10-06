/**
 * S5 / S11 / S12 — matches hooks against the real backend contract (F1.1 / F1.2 / F1.7).
 *
 * Exercises the real hooks with `fetch` stubbed at the transport and an
 * in-memory expo-secure-store:
 *  - create POSTs the form translated to the API's vocabulary (ISO week days,
 *    minutes, Beginner/Private…) at the device's coordinates;
 *  - "próximas" and "perto de você" map the API lists to the card models;
 *  - the detail maps roster + guests and the viewer's standing (organizer,
 *    non-participant who may join, private by code, waiting list);
 *  - confirming joins; a full match (409) resolves with the waiting-list
 *    position; a wrong invite code (403) becomes a readable pt-BR message;
 *  - declining a match the user is not in (404) is not an error;
 *  - adding a guest POSTs it and refreshes the detail;
 *  - the address search asks the backend proxy, and a picked venue's coordinates
 *    go in the create body instead of the device's.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-secure-store', () =>
  require('../../../support/inMemorySecureStore'),
);

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getLastKnownPositionAsync: jest.fn(async () => ({
    coords: { latitude: -22.9, longitude: -43.2 },
  })),
  getCurrentPositionAsync: jest.fn(),
}));

import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';

import { useAddGuest } from '@/features/matches/api/addGuest';
import {
  FALLBACK_COORDS,
  useCreateMatch,
  type CreateMatchPayload,
} from '@/features/matches/api/createMatch';
import { useMatchDetail } from '@/features/matches/api/getMatchDetail';
import { useNearbyMatches } from '@/features/matches/api/getNearby';
import { useUpcomingMatches } from '@/features/matches/api/getUpcoming';
import type { ApiMatch, ApiMatchDetail } from '@/features/matches/api/matchesApi';
import {
  useConfirmPresence,
  useDeclinePresence,
  useJoinMatch,
} from '@/features/matches/api/presence';
import { saveTokens } from '@/lib/auth/tokenStorage';
import {
  placeLabel,
  resolvePlace,
  usePlaceSuggestions,
} from '@/features/matches/api/searchPlaces';
import { useAuthStore } from '@/stores/auth';

const ME = '7b1f3c1e-0000-4000-8000-000000000001';
const ORGANIZER = '7b1f3c1e-0000-4000-8000-000000000002';
const MATCH_ID = '9c2d0000-0000-4000-8000-00000000000a';

const payload: CreateMatchPayload = {
  name: 'Racha de Quinta',
  location: 'Arena Central',
  type: 'Recurring',
  whenType: undefined,
  customDate: '',
  recDays: [0, 4],
  recFreq: 'biweekly',
  recStart: '25/06/2099',
  time: '19h30',
  duration: '1h30',
  format: '4X4',
  players: 8,
  level: 'AVANCADO',
  price: 15,
  priceMonthly: 80,
  confirmationOpensHoursBefore: 24,
  privacy: 'private',
  inviteMode: 'code',
};

const apiMatch: ApiMatch = {
  id: MATCH_ID,
  organizerId: ORGANIZER,
  name: 'Racha de Quinta',
  address: 'Arena Central',
  latitude: -23.55,
  longitude: -46.63,
  dateTime: '2026-06-25T22:30:00.000Z',
  maxPlayers: 8,
  price: 15,
  type: 'Recurring',
  windowOpensAt: '2026-06-24T22:30:00.000Z',
  windowClosesAt: '2026-06-25T22:30:00.000Z',
  status: 'Open',
  format: '4X4',
  level: 'Advanced',
  durationMinutes: 90,
  visibility: 'Open',
  inviteMode: null,
  priceMonthly: 80,
};

const organizerPlayer = {
  userId: ORGANIZER,
  displayName: 'Ana Souza',
  handle: 'ana',
  position: 'LEV',
  level: 'Intermediate',
  photoUrl: 'https://cdn.test/ana.jpg',
};

function apiDetail(overrides: Partial<ApiMatchDetail> = {}): ApiMatchDetail {
  return {
    match: apiMatch,
    inviteCode: null,
    organizer: organizerPlayer,
    players: [
      { player: organizerPlayer, playerType: 'Regular', status: 'Confirmed' },
    ],
    guests: [{ id: 'guest-1', name: 'Zé da Praia', position: 'LIB' }],
    confirmedCount: 2,
    openSlots: 6,
    myPresence: null,
    myWaitingListPosition: null,
    canJoin: true,
    ...overrides,
  };
}

const fetchMock = jest.fn();

function respond(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body ?? {},
  };
}

type Call = { url: string; method: string; authorization?: string; body?: any };

function call(index = 0): Call {
  const found = calls()[index];
  if (!found) {
    throw new Error(`Request #${index} was not sent`);
  }
  return found;
}

function calls(): Call[] {
  return (fetchMock.mock.calls as [string, RequestInit][]).map(([url, init]) => ({
    url,
    method: init.method ?? 'GET',
    authorization: (init.headers as Record<string, string> | undefined)?.Authorization,
    body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
  }));
}

let client: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function runMutation<TData, TInput>(
  useHook: () => { mutateAsync: (input: TInput) => Promise<TData> },
  input: TInput,
): Promise<PromiseSettledResult<TData>> {
  const { result } = await renderHook(() => useHook(), { wrapper });
  let settled!: PromiseSettledResult<TData>;
  await act(async () => {
    [settled] = await Promise.allSettled([result.current.mutateAsync(input)]);
    // Let TanStack Query flush the hook's final state update inside act().
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return settled;
}

function rejectionMessage(settled: PromiseSettledResult<unknown>): string | undefined {
  return settled.status === 'rejected' ? (settled.reason as Error).message : undefined;
}

beforeEach(async () => {
  (SecureStore as unknown as { __reset: () => void }).__reset();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await saveTokens({ accessToken: 'access-jwt', refreshToken: 'refresh-opaque' });
  useAuthStore.setState({ userId: ME });
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe('useCreateMatch', () => {
  it('POSTs the form in the API vocabulary, at the device coordinates', async () => {
    fetchMock.mockResolvedValueOnce(respond(201, apiMatch));
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const settled = await runMutation(useCreateMatch, payload);

    expect(settled).toEqual({ status: 'fulfilled', value: { match: { id: MATCH_ID } } });
    const post = call();
    expect(post.url).toContain('/api/v1/matches');
    expect(post.method).toBe('POST');
    expect(post.authorization).toBe('Bearer access-jwt');
    expect(post.body).toMatchObject({
      name: 'Racha de Quinta',
      address: 'Arena Central',
      latitude: -22.9,
      longitude: -43.2,
      maxPlayers: 8,
      regularSlots: 8,
      price: 15,
      type: 'Recurring',
      frequency: 'Biweekly',
      // Sunday (0) and Thursday (4) → ISO 7 and 4.
      recurrenceDays: [4, 7],
      priceMonthly: 80,
      format: '4X4',
      level: 'Advanced',
      durationMinutes: 90,
      visibility: 'Private',
      inviteMode: 'Code',
      confirmationOpensHoursBefore: 24,
    });
    expect(new Date(post.body.dateTime).getFullYear()).toBe(2099);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['matches'] });
  });

  it('sends a free open one-off without recurrence, at the fallback when location is denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });
    fetchMock.mockResolvedValueOnce(respond(201, apiMatch));

    await runMutation(useCreateMatch, {
      ...payload,
      type: 'OneOff',
      whenType: 'tomorrow',
      price: 0,
      privacy: 'open',
      inviteMode: undefined,
    });

    expect(call().body).toMatchObject({
      latitude: FALLBACK_COORDS.latitude,
      longitude: FALLBACK_COORDS.longitude,
      price: null,
      frequency: null,
      recurrenceDays: null,
      priceMonthly: null,
      visibility: 'Open',
      inviteMode: null,
    });
  });

  it('refuses a start time that already passed without calling the API', async () => {
    const settled = await runMutation(useCreateMatch, {
      ...payload,
      type: 'OneOff',
      whenType: 'today',
      time: '00h00',
    });

    expect(rejectionMessage(settled)).toMatch(/já passou/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('match lists', () => {
  it('maps GET /matches/mine to the upcoming cards', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(200, {
        items: [
          {
            match: apiMatch,
            confirmedCount: 2,
            openSlots: 6,
            confirmedPhotoUrls: ['https://cdn.test/ana.jpg'],
            isOrganizer: false,
            myStatus: 'Confirmed',
          },
        ],
      }),
    );

    const { result } = await renderHook(() => useUpcomingMatches(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(call().url).toContain('/api/v1/matches/mine');
    expect(result.current.data).toEqual([
      {
        id: MATCH_ID,
        name: 'Racha de Quinta',
        startsAt: apiMatch.dateTime,
        category: 'COMPETITIVO',
        openSlots: 6,
        priceLabel: 'R$ 15',
        avatarUrls: ['https://cdn.test/ana.jpg'],
        tint: '#6B1AFF',
      },
    ]);
  });

  it('maps GET /matches/nearby to the nearby cards', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(200, {
        items: [
          {
            id: MATCH_ID,
            name: 'Quadra do Parque',
            latitude: -23.57,
            longitude: -46.62,
            distanceKm: 2.613,
            maxPlayers: 12,
            price: null,
            confirmedCount: 9,
            format: null,
            level: 'Beginner',
          },
        ],
        count: 1,
      }),
    );

    const { result } = await renderHook(
      () => useNearbyMatches({ lat: -23.55, lon: -46.63, radiusKm: 5 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(call().url).toContain(
      '/api/v1/matches/nearby?lat=-23.55&lon=-46.63&radiusKm=5',
    );
    expect(result.current.data).toEqual([
      {
        id: MATCH_ID,
        name: 'Quadra do Parque',
        format: '6X6',
        level: 'INICIANTE',
        distanceKm: 2.613,
        confirmed: 9,
        capacity: 12,
        priceLabel: 'Grátis',
        tint: '#00B4D8',
        lat: -23.57,
        lon: -46.62,
      },
    ]);
  });
});

describe('useMatchDetail', () => {
  async function detail(api: ApiMatchDetail) {
    fetchMock.mockResolvedValueOnce(respond(200, api));
    const { result } = await renderHook(() => useMatchDetail(MATCH_ID), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    return result.current.data!;
  }

  it('maps the match, the roster with guests, and a visitor who may join', async () => {
    const match = await detail(apiDetail());

    expect(call().url).toContain(`/api/v1/matches/${MATCH_ID}/detail`);
    expect(match).toMatchObject({
      id: MATCH_ID,
      format: '4X4',
      level: 'AVANCADO',
      venue: 'Arena Central',
      priceLabel: 'R$ 15',
      pricePlan: 'RECORRENTE',
      priceMonthlyLabel: 'R$ 80',
      capacity: 8,
      confirmationWindowClosed: false,
      organizerId: ORGANIZER,
      organizer: { id: ORGANIZER, name: 'Ana Souza', position: 'LEV' },
      openDropInSlots: 6,
      myParticipationType: null,
      myStatus: null,
      canJoin: true,
      requiresInviteCode: false,
    });
    expect(match.players).toEqual([
      {
        id: ORGANIZER,
        name: 'Ana Souza',
        avatarUrl: 'https://cdn.test/ana.jpg',
        status: 'CONFIRMADO',
        position: 'LEV',
      },
      { id: 'guest-1', name: 'Zé da Praia', status: 'CONFIRMADO', position: 'LIB', isGuest: true },
    ]);
  });

  it('shows the organizer as a pending Regular with the invite code to share', async () => {
    useAuthStore.setState({ userId: ORGANIZER });

    const match = await detail(
      apiDetail({
        match: { ...apiMatch, visibility: 'Private', inviteMode: 'Code' },
        inviteCode: 'AB12CD34',
        players: [],
      }),
    );

    expect(match).toMatchObject({
      myParticipationType: 'REGULAR',
      myStatus: 'PENDENTE',
      inviteCode: 'AB12CD34',
      requiresInviteCode: false,
    });
  });

  it('asks a visitor of a private match for the code, and reports the waiting list', async () => {
    const byCode = await detail(
      apiDetail({
        match: { ...apiMatch, visibility: 'Private', inviteMode: 'Code' },
        canJoin: false,
      }),
    );
    expect(byCode).toMatchObject({ canJoin: false, requiresInviteCode: true });

    client.clear();
    const queued = await detail(apiDetail({ myWaitingListPosition: 2 }));
    expect(queued).toMatchObject({ canJoin: false, myWaitingListPosition: 2 });
  });

  it('does not offer joining before the confirmation window opens', async () => {
    const match = await detail(apiDetail({ match: { ...apiMatch, status: 'Draft' } }));

    expect(match).toMatchObject({ canJoin: false, confirmationWindowClosed: false });
  });
});

describe('presence', () => {
  it('confirming PUTs Confirmed and refreshes the match queries', async () => {
    fetchMock.mockResolvedValueOnce(respond(200, {}));
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const settled = await runMutation(() => useConfirmPresence(MATCH_ID), undefined);

    expect(settled).toEqual({ status: 'fulfilled', value: { match: { id: MATCH_ID } } });
    const put = call();
    expect(put.url).toContain(`/api/v1/matches/${MATCH_ID}/presences/me`);
    expect(put.method).toBe('PUT');
    expect(put.body).toEqual({ status: 'Confirmed', inviteCode: null });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['matches', MATCH_ID, 'detail'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['matches'] });
  });

  it('a full match resolves with the waiting-list position', async () => {
    fetchMock
      .mockResolvedValueOnce(respond(409, { detail: 'full', waitingListPosition: 3 }))
      .mockResolvedValueOnce(respond(200, apiDetail({ myWaitingListPosition: 3 })));

    const settled = await runMutation(() => useJoinMatch(MATCH_ID), undefined);

    expect(settled).toEqual({
      status: 'fulfilled',
      value: { match: { id: MATCH_ID }, waitingListPosition: 3 },
    });
  });

  it('a 409 without a waiting-list place means confirmations are not open', async () => {
    fetchMock
      .mockResolvedValueOnce(respond(409, {}))
      .mockResolvedValueOnce(respond(200, apiDetail()));

    const settled = await runMutation(() => useConfirmPresence(MATCH_ID), undefined);

    expect(rejectionMessage(settled)).toMatch(/não estão abertas/);
  });

  it('joining by code sends it normalized; a wrong code is a readable error', async () => {
    fetchMock.mockResolvedValueOnce(respond(403, {}));

    const settled = await runMutation(() => useJoinMatch(MATCH_ID), {
      inviteCode: ' ab12cd34 ',
    });

    expect(call().body).toEqual({ status: 'Confirmed', inviteCode: 'AB12CD34' });
    expect(rejectionMessage(settled)).toBe('Código de convite inválido.');
  });

  it('declining PUTs Declined; not being on the list (404) is not an error', async () => {
    fetchMock.mockResolvedValueOnce(respond(404, {}));

    const settled = await runMutation(() => useDeclinePresence(MATCH_ID), undefined);

    expect(call().body).toEqual({ status: 'Declined', inviteCode: null });
    expect(settled.status).toBe('fulfilled');
  });
});

describe('useAddGuest', () => {
  it('POSTs the guest and refreshes the detail', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(201, { id: 'guest-9', name: 'Maria', position: 'PON' }),
    );
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const settled = await runMutation(() => useAddGuest(MATCH_ID), {
      name: 'Maria',
      position: 'PON' as const,
    });

    const post = call();
    expect(post.url).toContain(`/api/v1/matches/${MATCH_ID}/guests`);
    expect(post.body).toEqual({ name: 'Maria', position: 'PON' });
    expect(settled).toMatchObject({
      status: 'fulfilled',
      value: { guest: { id: 'guest-9', name: 'Maria', isGuest: true } },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['matches', MATCH_ID, 'detail'] });
  });

  it('a full match is a readable error', async () => {
    fetchMock.mockResolvedValueOnce(respond(409, {}));

    const settled = await runMutation(() => useAddGuest(MATCH_ID), { name: 'Maria' });

    expect(rejectionMessage(settled)).toBe('A partida já está cheia.');
  });
});

describe('address search', () => {
  const suggestion = {
    id: 'ChIJ_1',
    title: 'Arena Sky Beach',
    subtitle: 'Pinheiros, São Paulo',
    latitude: null,
    longitude: null,
  };

  it('asks the backend proxy for suggestions near the user', async () => {
    fetchMock.mockResolvedValueOnce(respond(200, { items: [suggestion] }));

    const { result } = await renderHook(
      () =>
        usePlaceSuggestions(' arena sky ', {
          near: { latitude: -23.55, longitude: -46.63 },
          sessionToken: 'sess-1',
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(call().url).toContain(
      '/api/v1/places/autocomplete?q=arena%20sky&lat=-23.55&lon=-46.63&sessionToken=sess-1',
    );
    expect(result.current.data).toEqual([suggestion]);
    expect(placeLabel(suggestion)).toBe('Arena Sky Beach · Pinheiros, São Paulo');
  });

  it('does not search for fewer than 3 characters', async () => {
    const { result } = await renderHook(
      () => usePlaceSuggestions('ar', { near: null, sessionToken: 'sess-1' }),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves coordinates from the suggestion, the details call, or not at all', async () => {
    await expect(
      resolvePlace({ ...suggestion, latitude: -23.56, longitude: -46.69 }, 'sess-1'),
    ).resolves.toEqual({ latitude: -23.56, longitude: -46.69 });
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(
      respond(200, { id: 'ChIJ_1', latitude: -23.57, longitude: -46.62 }),
    );
    await expect(resolvePlace(suggestion, 'sess-1')).resolves.toEqual({
      latitude: -23.57,
      longitude: -46.62,
    });
    expect(call().url).toContain('/api/v1/places/ChIJ_1?sessionToken=sess-1');

    fetchMock.mockResolvedValueOnce(respond(503, {}));
    await expect(resolvePlace(suggestion, 'sess-1')).resolves.toBeNull();
  });

  it('a picked venue sets the match coordinates without reading the device location', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockClear();
    fetchMock.mockResolvedValueOnce(respond(201, apiMatch));

    await runMutation(useCreateMatch, { ...payload, latitude: -23.56, longitude: -46.69 });

    expect(call().body).toMatchObject({ latitude: -23.56, longitude: -46.69 });
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});
