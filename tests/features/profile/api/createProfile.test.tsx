/**
 * S4 — useCreateProfile (mock hook) tests.
 *
 * Verifies the real mocked mutation (the screen mocks this hook at the boundary;
 * here we exercise the actual implementation): it resolves a stub profile echoing
 * the validated input after a short latency, with no network. The screen's
 * "Entrar na quadra" success branch depends on this resolving.
 */
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import { useCreateProfile } from '@/features/profile/api/createProfile';
import type { OnboardingProfileInput } from '@/features/profile/schema/onboarding';

const input: OnboardingProfileInput = {
  firstName: 'Renan',
  lastName: 'Dias',
  birthDate: '01/01/1990',
  handle: 'renan',
  position: 'COR',
  level: 'INICIANTE',
  modality: 'INDOOR',
};

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useCreateProfile (mock)', () => {
  it('resolves a stub profile echoing the validated input', async () => {
    const { result } = await renderHook(() => useCreateProfile(), { wrapper });

    await act(async () => {
      result.current.mutate(input);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.profile).toEqual({
      id: 'mock-profile',
      ...input,
    });
  });
});
