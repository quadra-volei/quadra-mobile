/**
 * S8 / S9 — ranking and "partidas recentes" against the real backend contract
 * (F2.3 `GET /rankings/mine`, F2.1 `GET /profiles/me/match-history`), with
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
  it('maps my ranking to rows, flagging me, with the short list for the preview', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(200, {
        items: [
          { rank: 1, userId: 'user-ana', totalPoints: 30, displayName: 'Ana Souza', handle: 'ana', position: 'LEV' },
          { rank: 2, userId: ME, totalPoints: 10, displayName: 'Renan Dias', handle: null, position: null },
        ],
      }),
    );

    const { result } = await renderHook(() => useGroupRanking({ preview: true }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(requestedUrl()).toContain('/api/v1/rankings/mine?page=1&pageSize=4');
    expect(result.current.data).toEqual([
      { position: 1, playerId: 'user-ana', name: 'Ana Souza', subtitle: '@ana · Levantador', score: 30, isMe: false },
      { position: 2, playerId: ME, name: 'Renan Dias', subtitle: '', score: 10, isMe: true },
    ]);
  });

  it('is empty when I am in no ranking yet (204)', async () => {
    fetchMock.mockResolvedValueOnce(respond(204));

    const { result } = await renderHook(() => useGroupRanking({ preview: false }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(requestedUrl()).toContain('pageSize=50');
    expect(result.current.data).toEqual([]);
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
      { id: 'm1', name: 'Racha de Quinta', playedAt: entry.matchDateTime, format: '4X4', result: 'VITORIA', setScore: '2-1' },
      { id: 'm2', name: 'Racha de Quinta', playedAt: entry.matchDateTime, format: '6X6', result: 'EMPATE', setScore: '' },
    ]);
  });
});
