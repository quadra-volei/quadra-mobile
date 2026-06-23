/**
 * S10 — useUpdateProfile (mock hook) tests.
 *
 * The edit screen mocks this hook at the boundary; here we exercise the actual
 * mocked implementation: it resolves a stub profile echoing the validated input
 * (including the picked avatarUri) after a short latency, with no network. The
 * edit screen's "Salvar alterações" success branch depends on this resolving.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import { useUpdateProfile } from '@/features/profile/api/updateProfile';
import type { EditProfileInput } from '@/features/profile/schema/editProfile';

const input: EditProfileInput = {
  firstName: 'Renan',
  lastName: 'Dias',
  handle: 'renan',
  birthDate: '14/03/1998',
  phone: '11984721130',
  position: 'LEV',
  avatarUri: 'file:///tmp/new-avatar.jpg',
};

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useUpdateProfile (mock)', () => {
  it('resolves a stub profile echoing the validated input (incl. avatarUri)', async () => {
    const { result } = await renderHook(() => useUpdateProfile(), { wrapper });

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
