/**
 * S12 — presence mutation hook tests (`src/features/matches/api/presence.ts`).
 *
 * The screen mocks these hooks at the boundary; here we run the REAL mocked
 * implementations to cover the data-layer half of the presence criteria:
 *  - useConfirmPresence / useDeclinePresence / useJoinMatch each resolve a stub
 *    `{ match: { id } }` echoing the match id, with no network;
 *  - on success each invalidates BOTH the match-detail query
 *    (['matches', id, 'detail']) and the broader ['matches'] key (so S5 Home and
 *    this screen refresh).
 *
 * Covers: S12 — Match Detail
 * Criterion: "tapping it calls useConfirmPresence / useDeclinePresence /
 *  useJoinMatch (mocked) ... and invalidates the match detail query."
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import {
  useConfirmPresence,
  useDeclinePresence,
  useJoinMatch,
} from '@/features/matches/api/presence';

const MATCH_ID = 'near-1';

let client: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

const CASES = [
  ['useConfirmPresence', useConfirmPresence],
  ['useDeclinePresence', useDeclinePresence],
  ['useJoinMatch', useJoinMatch],
] as const;

describe('S12 — presence mutations (mock)', () => {
  it.each(CASES)('%s resolves a stub echoing the match id', async (_name, hook) => {
    const { result } = await renderHook(() => hook(MATCH_ID), { wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.match.id).toBe(MATCH_ID);
  });

  it.each(CASES)(
    '%s invalidates the match-detail query and the ["matches"] key on success',
    async (_name, hook) => {
      const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

      const { result } = await renderHook(() => hook(MATCH_ID), { wrapper });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['matches', MATCH_ID, 'detail'],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['matches'] });
    },
  );
});
