/**
 * S4 / S8 / S10 — profile hooks against the real backend contract (F2.1).
 *
 * Exercises the real `useCreateProfile`, `useUpdateProfile` and `useMyProfile`
 * with `fetch` stubbed at the transport and an in-memory expo-secure-store:
 *  - onboarding PUTs the wizard input to /api/v1/profiles/me, translated to the
 *    API's vocabulary (ISO date, Beginner/Indoor…), with the access token;
 *  - editing PUTs without modality/level and keeps the current photo;
 *  - a taken @handle (409) becomes a readable pt-BR message;
 *  - the profile query maps the API profile + login phone to `MyProfile`;
 *  - an expired access token is renewed once and the request retried.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-secure-store', () =>
  require('../../../support/inMemorySecureStore'),
);

import * as SecureStore from 'expo-secure-store';

import { useCreateProfile } from '@/features/profile/api/createProfile';
import { useMyProfile } from '@/features/profile/api/getMyProfile';
import type { ApiProfile } from '@/features/profile/api/profileApi';
import { useUpdateProfile } from '@/features/profile/api/updateProfile';
import { useHandleTaken } from '@/features/profile/api/handleAvailability';
import type { EditProfileInput } from '@/features/profile/schema/editProfile';
import type { OnboardingProfileInput } from '@/features/profile/schema/onboarding';
import { saveTokens } from '@/lib/auth/tokenStorage';

const USER_ID = '7b1f3c1e-0000-4000-8000-000000000001';

const onboardingInput: OnboardingProfileInput = {
  firstName: 'Renan',
  lastName: 'Dias',
  birthDate: '14/03/1998',
  handle: 'renan',
  position: 'LEV',
  level: 'INTERMEDIARIO',
  modality: 'BEACH',
};

const editInput: EditProfileInput = {
  firstName: 'Renan',
  lastName: 'Dias',
  handle: 'renan_d',
  birthDate: '14/03/1998',
  phone: '11984721130',
  position: 'LIB',
  avatarUri: 'file:///tmp/new-avatar.jpg',
};

const apiProfile: ApiProfile = {
  userId: USER_ID,
  displayName: 'Renan Dias',
  firstName: 'Renan',
  lastName: 'Dias',
  handle: 'renan',
  birthDate: '1998-03-14',
  position: 'LEV',
  modality: 'Beach',
  declaredLevel: 'Intermediate',
  level: 'Intermediate',
  photoUrl: 'https://cdn.test/photo.jpg',
  photoObjectKey: `profiles/${USER_ID}/photo/current.jpg`,
  onboardingCompleted: true,
  skills: { overall: 62, ace: 64, block: 60, attack: 60, defense: 64 },
  stats: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0, mvpsReceived: 0 },
};

const fetchMock = jest.fn();

function respond(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body ?? {},
  };
}

type Call = { url: string; method: string; authorization?: string; body?: unknown };

function calls(): Call[] {
  return (fetchMock.mock.calls as [string, RequestInit?][]).map(([url, init = {}]) => ({
    url,
    method: init.method ?? 'GET',
    authorization: (init.headers as Record<string, string> | undefined)?.Authorization,
    body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
  }));
}

function putCall(): Call {
  const put = calls().find((c) => c.method === 'PUT');
  if (!put) {
    throw new Error('No PUT request was sent');
  }
  return put;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
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

beforeEach(async () => {
  (SecureStore as unknown as { __reset: () => void }).__reset();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await saveTokens({ accessToken: 'access-jwt', refreshToken: 'refresh-opaque' });
});

describe('useCreateProfile (onboarding)', () => {
  /**
   * Covers: S4 — Onboarding
   * Criterion: "'Entrar na quadra' saves the profile" — the wizard input is sent
   *  to PUT /api/v1/profiles/me in the API's vocabulary.
   */
  it('PUTs the onboarding input translated to the API contract', async () => {
    fetchMock.mockResolvedValue(respond(200, apiProfile));

    const settled = await runMutation(useCreateProfile, onboardingInput);

    const put = putCall();
    expect(put.url).toMatch(/\/api\/v1\/profiles\/me$/);
    expect(put.authorization).toBe('Bearer access-jwt');
    expect(put.body).toEqual({
      firstName: 'Renan',
      lastName: 'Dias',
      handle: 'renan',
      birthDate: '1998-03-14',
      position: 'LEV',
      modality: 'Beach',
      level: 'Intermediate',
      photoObjectKey: null,
    });
    expect(settled).toEqual({
      status: 'fulfilled',
      value: { profile: { ...onboardingInput, id: USER_ID } },
    });
  });

  /**
   * Covers: S4 — Onboarding
   * Criterion: "A taken @handle surfaces a readable error" (backend 409).
   */
  it('turns a taken handle (409) into a readable message', async () => {
    fetchMock.mockResolvedValue(respond(409, { detail: "The handle '@renan' is already taken." }));

    const settled = await runMutation(useCreateProfile, onboardingInput);

    expect(settled.status).toBe('rejected');
    expect(((settled as PromiseRejectedResult).reason as Error).message).toBe(
      'Esse @ já está em uso. Escolha outro.',
    );
  });

  it('renews an expired access token once and retries the save', async () => {
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/api/v1/auth/refresh')) {
        return respond(200, { accessToken: 'new-access', refreshToken: 'new-refresh' });
      }
      const authorization = (init.headers as Record<string, string>).Authorization;
      return authorization === 'Bearer new-access' ? respond(200, apiProfile) : respond(401);
    });

    const settled = await runMutation(useCreateProfile, onboardingInput);

    expect(settled.status).toBe('fulfilled');
    expect(calls().filter((c) => c.url.endsWith('/api/v1/auth/refresh'))).toHaveLength(1);
    expect(await SecureStore.getItemAsync('quadra.accessToken')).toBe('new-access');
  });
});

describe('useUpdateProfile (edit profile)', () => {
  /**
   * Covers: S10 — Edit profile
   * Criterion: "'Salvar alterações' saves the profile" — modality and level are
   *  not editable here (sent as null) and the current photo is kept; the phone
   *  is the login identity and is not part of the profile.
   */
  it('PUTs the edited fields, keeping modality, level and the current photo', async () => {
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      // No photo storage in this environment: the picked photo is not uploaded.
      if (url.endsWith('/photo/upload-url')) return respond(503);
      return init.method === 'PUT'
        ? respond(200, { ...apiProfile, handle: 'renan_d', position: 'LIB' })
        : respond(200, apiProfile);
    });

    const settled = await runMutation(useUpdateProfile, editInput);

    expect(putCall().body).toEqual({
      firstName: 'Renan',
      lastName: 'Dias',
      handle: 'renan_d',
      birthDate: '1998-03-14',
      position: 'LIB',
      modality: null,
      level: null,
      photoObjectKey: apiProfile.photoObjectKey,
    });
    expect(settled).toEqual({
      status: 'fulfilled',
      value: { profile: { ...editInput, id: USER_ID } },
    });
  });
});

describe('useMyProfile', () => {
  /**
   * Covers: S8 — Profile
   * Criterion: "The header and 'Seu progresso' card render the user's profile" —
   *  identity and skill ratings come from GET /api/v1/profiles/me; the phone is
   *  the login phone from GET /api/v1/auth/me.
   */
  it('maps the backend profile and the login phone to MyProfile', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/api/v1/auth/me')
        ? respond(200, { userId: USER_ID, phoneNumber: '+5511984721130' })
        : respond(200, apiProfile),
    );

    const { result } = await renderHook(() => useMyProfile(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      id: USER_ID,
      firstName: 'Renan',
      lastName: 'Dias',
      handle: 'renan',
      birthDate: '14/03/1998',
      phone: '11984721130',
      position: 'LEV',
      avatarUrl: 'https://cdn.test/photo.jpg',
      overall: 62,
      ace: 64,
      blk: 60,
      ata: 60,
      def: 64,
      // Placeholders until the backend has serve/receive ratings and XP.
      srv: 62,
      rec: 62,
      level: 1,
      xp: 0,
      xpToNext: 100,
    });
  });

  it('leaves the phone empty for an account without one (Google login)', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/api/v1/auth/me')
        ? respond(200, { userId: USER_ID, phoneNumber: null })
        : respond(200, { ...apiProfile, photoUrl: null }),
    );

    const { result } = await renderHook(() => useMyProfile(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.phone).toBeUndefined();
    expect(result.current.data?.avatarUrl).toBeUndefined();
  });
});

describe('profile photo upload', () => {
  /**
   * Covers: S10 "Trocar foto" — with photo storage, the picked file is PUT to
   * the signed URL and its object key is saved on the profile.
   */
  it('uploads the picked photo and saves its key', async () => {
    fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
      if (url.endsWith('/photo/upload-url')) {
        return respond(201, { uploadUrl: 'https://storage.test/put-here', objectKey: 'profiles/new.jpg' });
      }
      if (url === editInput.avatarUri) return { ok: true, blob: async () => ({ size: 3 }) };
      if (url === 'https://storage.test/put-here') return respond(200);
      return init.method === 'PUT' ? respond(200, apiProfile) : respond(200, apiProfile);
    });

    const settled = await runMutation(useUpdateProfile, editInput);

    expect(settled.status).toBe('fulfilled');
    const upload = calls().find((c) => c.url === 'https://storage.test/put-here');
    expect(upload?.method).toBe('PUT');
    expect(calls().find((c) => c.url.endsWith('/api/v1/profiles/me') && c.method === 'PUT')?.body)
      .toMatchObject({ photoObjectKey: 'profiles/new.jpg' });
  });
});

describe('useHandleTaken', () => {
  /**
   * Covers: S4 / S10 — the @ field warns while typing when the @ is taken.
   */
  it('asks the backend a moment after typing and reports a taken @', async () => {
    fetchMock.mockResolvedValue(respond(200, { handle: 'renan', available: false }));

    const { result } = await renderHook(() => useHandleTaken('@Renan'), { wrapper });
    expect(result.current).toBe(false);

    await waitFor(() => expect(result.current).toBe(true));
    expect(calls()[0]?.url).toContain('/api/v1/profiles/handle-availability?handle=renan');
  });

  it('does not ask for fewer than 3 characters', async () => {
    const { result } = await renderHook(() => useHandleTaken('re'), { wrapper });
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(result.current).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
