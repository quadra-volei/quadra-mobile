/**
 * S8 / S9 — ranking and "partidas recentes" against the real backend contract
 * (`GET /rankings?scope=friends`, F2.1 `GET /profiles/me/match-history`), with
 * `fetch` stubbed at the transport.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-secure-store', () =>
  require('../../../support/inMemorySecureStore'),
);

import * as SecureStore from 'expo-secure-store';

import { useRecentMatches } from '@/features/profile/api/getRecentMatches';
import { useGroupRanking } from '@/features/ranking/api/getGroupRanking';
import { saveTokens } from '@/lib/auth/tokenStorage';
import { useAuthStore } from '@/stores/auth';

const ME = 'user-me';
const fetchMock = jest.fn();

function respond(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body ?? {},
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const requestedUrl = () => (fetchMock.mock.calls as [string][])[0]?.[0] ?? '';

beforeEach(async () => {
  (SecureStore as unknown as { __reset: () => void }).__reset();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await saveTokens({ accessToken: 'access-jwt', refreshToken: 'refresh-opaque' });
  useAuthStore.setState({ userId: ME });
});

describe('useGroupRanking', () => {
  it('maps the friends season ranking to rows, flagging me, with the short list for the preview', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(200, {
        groupName: null,
        minMatches: 1,
        seasonStart: '2026-10-01T03:00:00Z',
        callerEntry: null,
        items: [
          { rank: 1, userId: 'user-ana', points: 30, matches: 1, displayName: 'Ana Souza', handle: 'ana', position: 'LEV', photoUrl: null },
          { rank: 2, userId: ME, points: 10, matches: 2, displayName: 'Renan Dias', handle: null, position: null, photoUrl: 'https://p/me.jpg' },
        ],
      }),
    );

    const { result } = await renderHook(() => useGroupRanking({ preview: true }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(requestedUrl()).toContain('/api/v1/rankings?scope=friends&page=1&pageSize=4');
    expect(result.current.data).toEqual([
      { position: 1, playerId: 'user-ana', name: 'Ana Souza', subtitle: '@ana · Levantador · 1 jogo', score: 30, matches: 1, photoUrl: undefined, isMe: false },
      { position: 2, playerId: ME, name: 'Renan Dias', subtitle: '2 jogos', score: 10, matches: 2, photoUrl: 'https://p/me.jpg', isMe: true },
    ]);
  });
});

describe('useRecentMatches', () => {
  it('maps the match history: result, format and set score from my side', async () => {
    const entry = { matchId: 'm1', matchName: 'Racha de Quinta', matchDateTime: '2026-06-18T22:30:00Z' };
    fetchMock.mockResolvedValueOnce(
      respond(200, {
        items: [
          { ...entry, outcome: 'Win', format: '4X4', setsWon: 2, setsLost: 1 },
          { ...entry, matchId: 'm2', outcome: 'Draw', format: null, setsWon: null, setsLost: null },
        ],
      }),
    );

    const { result } = await renderHook(() => useRecentMatches(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(requestedUrl()).toContain('/api/v1/profiles/me/match-history?page=1&pageSize=5');
    expect(result.current.data).toEqual([
      { id: 'm1', name: 'Racha de Quinta', playedAt: entry.matchDateTime, format: '4X4', result: 'VITORIA', setScore: '2-1', actionsLine: '' },
      { id: 'm2', name: 'Racha de Quinta', playedAt: entry.matchDateTime, format: '6X6', result: 'EMPATE', setScore: '', actionsLine: '' },
    ]);
  });
});
