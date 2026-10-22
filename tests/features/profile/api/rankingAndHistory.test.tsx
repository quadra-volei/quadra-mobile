/**
 * S8 / S9 — ranking and "partidas recentes" against the real backend contract
 * (`GET /rankings?scope=friends`, F2.1 `GET /profiles/me/match-history`), with
 * `fetch` stubbed at the transport.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-secure-store', () =>
  require('../../../support/inMemorySecureStore'),
);

import * as SecureStore from 'expo-secure-store';

import { groupByMonth, useMatchHistory, useRecentMatches } from '@/features/profile/api/getRecentMatches';
import type { RecentMatch } from '@/features/profile/types/profile';
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
    expect(result.current.data?.items).toEqual([
      { id: 'm1', name: 'Racha de Quinta', playedAt: entry.matchDateTime, format: '4X4', result: 'VITORIA', setScore: '2-1', actionsLine: '', isMvp: false },
      { id: 'm2', name: 'Racha de Quinta', playedAt: entry.matchDateTime, format: '6X6', result: 'EMPATE', setScore: '', actionsLine: '', isMvp: false },
    ]);
  });

  it('keeps the MVP flag and the total, so the profile knows there is more', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(200, {
        items: [{ matchId: 'm1', matchName: 'Racha', matchDateTime: '2026-06-18T22:30:00Z', outcome: 'Win', wasMvp: true, format: '6X6', setsWon: 1, setsLost: 0 }],
        totalCount: 12,
        hasNextPage: true,
      }),
    );

    const { result } = await renderHook(() => useRecentMatches(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items[0]?.isMvp).toBe(true);
    expect(result.current.data?.total).toBe(12);
  });
});

describe('useMatchHistory', () => {
  it('pages through the whole history, 20 at a time, until the API says there is no more', async () => {
    const row = (id: string) => ({ matchId: id, matchName: id, matchDateTime: '2026-06-18T22:30:00Z', outcome: 'Loss', format: null, setsWon: null, setsLost: null });
    fetchMock
      .mockResolvedValueOnce(respond(200, { items: [row('m1')], totalCount: 2, hasNextPage: true }))
      .mockResolvedValueOnce(respond(200, { items: [row('m2')], totalCount: 2, hasNextPage: false }));

    const { result } = await renderHook(() => useMatchHistory(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestedUrl()).toContain('/api/v1/profiles/me/match-history?page=1&pageSize=20');
    expect(result.current.hasNextPage).toBe(true);

    await act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect((fetchMock.mock.calls as [string][])[1]?.[0]).toContain('page=2&pageSize=20');
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe('groupByMonth', () => {
  const match = (id: string, playedAt: string): RecentMatch => ({
    id, name: id, playedAt, format: '6X6', result: 'VITORIA', setScore: '', actionsLine: '', isMvp: false,
  });

  it('splits newest-first matches into months, keeping their order', () => {
    const months = groupByMonth([
      match('a', '2026-10-20T12:00:00'),
      match('b', '2026-10-02T12:00:00'),
      match('c', '2026-09-28T12:00:00'),
      match('d', '2025-12-10T12:00:00'),
    ]);

    expect(months.map((m) => [m.title, m.data.map((x) => x.id)])).toEqual([
      ['OUTUBRO 2026', ['a', 'b']],
      ['SETEMBRO 2026', ['c']],
      ['DEZEMBRO 2025', ['d']],
    ]);
  });
});
