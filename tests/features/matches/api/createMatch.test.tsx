/**
 * S11 — useCreateMatch (mock hook) tests.
 *
 * Exercises the actual mocked mutation (the screen mocks this hook at the
 * boundary; here we run the real implementation):
 *  - it resolves a stub `{ match: { id } }` echoing a generated id, no network;
 *  - on success it invalidates the ['matches'] queries so S5 Home refetches.
 *
 * Covers: S11 — Create Match
 * Criterion: "On success, ['matches'] queries are invalidated."
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import {
  useCreateMatch,
  type CreateMatchPayload,
} from '@/features/matches/api/createMatch';

const payload: CreateMatchPayload = {
  name: 'Racha de Quinta',
  location: 'Arena Central',
  day: 'today',
  format: '6X6',
  level: 'INTERMEDIARIO',
  type: 'OneOff',
  players: 12,
  price: 0,
  confirmationOpensHoursBefore: 24,
  isOpen: false,
};

// A fresh client per test, captured so the invalidation spy can target it.
let client: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe('useCreateMatch (mock)', () => {
  it('resolves a stub match echoing a generated id', async () => {
    const { result } = await renderHook(() => useCreateMatch(), { wrapper });

    await act(async () => {
      result.current.mutate(payload);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.match.id).toEqual(expect.any(String));
    // Created matches are prefixed `mine-` so the organizer view resolves.
    expect(result.current.data?.match.id).toMatch(/^mine-/);
  });

  it('invalidates the ["matches"] queries on success', async () => {
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = await renderHook(() => useCreateMatch(), { wrapper });

    await act(async () => {
      result.current.mutate(payload);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['matches'] });
  });
});
