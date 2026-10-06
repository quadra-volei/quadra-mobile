/**
 * S2/S3 — auth API hooks against the real backend contract (FA.3).
 *
 * Exercises the real `useRequestOtp` / `useResendOtp` / `useVerifyOtp` /
 * `useGoogleSignIn` implementations with `fetch` stubbed at the transport, the
 * native Google SDK mocked, and an in-memory expo-secure-store:
 *  - request/resend POST the "initiate" step for the phone number;
 *  - verify POSTs the 6-digit code, persists BOTH tokens to expo-secure-store,
 *    and derives `hasProfile` (new account -> false; returning account -> the
 *    backend profile's `onboardingCompleted`);
 *  - Google sign-in sends the native SDK's ID token to the backend;
 *  - backend / network failures become user-facing pt-BR messages.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-secure-store', () =>
  require('../../../support/inMemorySecureStore'),
);

const mockGoogle = {
  configure: jest.fn(),
  hasPlayServices: jest.fn(),
  signIn: jest.fn(),
};
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: (...args: unknown[]) => mockGoogle.configure(...args),
    hasPlayServices: (...args: unknown[]) => mockGoogle.hasPlayServices(...args),
    signIn: (...args: unknown[]) => mockGoogle.signIn(...args),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
  isSuccessResponse: (response: { type: string }) => response.type === 'success',
  isErrorWithCode: (error: unknown) =>
    typeof error === 'object' && error !== null && 'code' in error,
}));

import * as SecureStore from 'expo-secure-store';

import {
  GoogleSignInCancelledError,
  useGoogleSignIn,
} from '@/features/auth/api/googleSignIn';
import { useRequestOtp } from '@/features/auth/api/requestOtp';
import { useResendOtp } from '@/features/auth/api/resendOtp';
import { useVerifyOtp } from '@/features/auth/api/verifyOtp';

const PHONE = '+5511999990000';

const TOKENS = {
  accessToken: 'access-jwt',
  refreshToken: 'refresh-opaque',
  tokenType: 'Bearer',
  expiresIn: 900,
  userId: '7b1f3c1e-0000-4000-8000-000000000001',
  isNewUser: true,
};

const fetchMock = jest.fn();

function respond(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => {
      if (body === undefined) {
        throw new SyntaxError('no body');
      }
      return body;
    },
  };
}

function lastRequest(): { url: string; method?: string; body: unknown } {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [
    string,
    RequestInit,
  ];
  return { url, method: init.method, body: JSON.parse(init.body as string) };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Runs a mutation to completion and returns its settled promise. */
async function run<TData, TInput>(
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

function rejectionMessage(settled: PromiseSettledResult<unknown>): string {
  expect(settled.status).toBe('rejected');
  return ((settled as PromiseRejectedResult).reason as Error).message;
}

beforeEach(() => {
  (SecureStore as unknown as { __reset: () => void }).__reset();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  mockGoogle.configure.mockReset();
  mockGoogle.hasPlayServices.mockReset().mockResolvedValue(true);
  mockGoogle.signIn.mockReset();
});

describe('useRequestOtp / useResendOtp', () => {
  /**
   * Covers: S2 — Login
   * Criterion: "Submitting a valid phone requests the SMS code from the backend."
   */
  it('POSTs the initiate step with the E.164 phone', async () => {
    fetchMock.mockResolvedValue(respond(200, { delivery: {} }));

    const settled = await run(useRequestOtp, { phone: PHONE });

    expect(settled).toEqual({ status: 'fulfilled', value: { ok: true } });
    const request = lastRequest();
    expect(request.url).toMatch(/\/api\/v1\/auth\/login\/sms-otp$/);
    expect(request.method).toBe('POST');
    expect(request.body).toEqual({ step: 'initiate', phoneNumber: PHONE });
  });

  /**
   * Covers: S3 — SMS Verification
   * Criterion: "Tapping 'Reenviar código' asks the backend for a new code."
   */
  it('resend re-issues the initiate step for the same phone', async () => {
    fetchMock.mockResolvedValue(respond(200, { delivery: {} }));

    await run(useResendOtp, { phone: PHONE });

    expect(lastRequest().body).toEqual({ step: 'initiate', phoneNumber: PHONE });
  });

  /**
   * Covers: S2 — Login
   * Criterion: "A failed code request surfaces a readable message inline."
   */
  it.each([
    [429, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'],
    [422, 'Este número não pode receber SMS.'],
    [502, 'Não foi possível enviar o código.'],
  ])('maps a %i response to a user-facing message', async (status, message) => {
    fetchMock.mockResolvedValue(respond(status, { title: 'backend detail' }));

    const settled = await run(useRequestOtp, { phone: PHONE });

    expect(rejectionMessage(settled)).toBe(message);
  });

  it('maps a network failure to a connectivity message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    const settled = await run(useRequestOtp, { phone: PHONE });

    expect(rejectionMessage(settled)).toBe(
      'Sem conexão. Verifique sua internet e tente de novo.',
    );
  });
});

describe('useVerifyOtp', () => {
  /**
   * Covers: S3 — SMS Verification
   * Criterion: "Submitting the 6-digit code verifies it with the backend; on
   *  success the tokens are stored in expo-secure-store and a new account lands
   *  on Onboarding (hasProfile false)."
   */
  it('verifies the code, stores both tokens securely and reports a new account', async () => {
    fetchMock.mockResolvedValue(respond(200, TOKENS));

    const settled = await run(useVerifyOtp, { phone: PHONE, code: '123456' });

    expect(lastRequest().body).toEqual({
      step: 'verify',
      phoneNumber: PHONE,
      code: '123456',
    });
    expect(settled).toEqual({
      status: 'fulfilled',
      value: {
        session: { token: 'access-jwt' },
        user: { id: TOKENS.userId, name: '', hasProfile: false },
      },
    });
    expect(await SecureStore.getItemAsync('quadra.accessToken')).toBe('access-jwt');
    expect(await SecureStore.getItemAsync('quadra.refreshToken')).toBe('refresh-opaque');
  });

  /**
   * Covers: S3 — SMS Verification
   * Criterion: "A returning account that already finished onboarding lands on
   *  Home (hasProfile true)."
   */
  it.each([
    ['finished onboarding', true],
    ['has not finished onboarding', false],
  ])('asks the backend whether a returning account %s', async (_label, onboardingCompleted) => {
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/api/v1/profiles/me')) {
        // Read with the access token that was just issued.
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-jwt');
        return respond(200, { userId: TOKENS.userId, onboardingCompleted });
      }
      return respond(200, { ...TOKENS, isNewUser: false });
    });

    const settled = await run(useVerifyOtp, { phone: PHONE, code: '123456' });

    expect(settled.status).toBe('fulfilled');
    expect(
      (settled as PromiseFulfilledResult<{ user: { hasProfile: boolean } }>).value.user
        .hasProfile,
    ).toBe(onboardingCompleted);
  });

  it('does not ask for the profile of a brand-new account', async () => {
    fetchMock.mockResolvedValue(respond(200, TOKENS));

    await run(useVerifyOtp, { phone: PHONE, code: '123456' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  /**
   * Covers: S3 — SMS Verification
   * Criterion: "An incorrect or expired code surfaces the error state" — and no
   *  token is stored.
   */
  it('rejects a wrong code with "Código inválido" and stores nothing', async () => {
    fetchMock.mockResolvedValue(respond(401, { title: 'The OTP code is incorrect.' }));

    const settled = await run(useVerifyOtp, { phone: PHONE, code: '000000' });

    expect(rejectionMessage(settled)).toBe('Código inválido');
    expect(await SecureStore.getItemAsync('quadra.accessToken')).toBeNull();
    expect(await SecureStore.getItemAsync('quadra.refreshToken')).toBeNull();
  });
});

describe('useGoogleSignIn', () => {
  /**
   * Covers: S2 — Login
   * Criterion: "'Entrar com Google' runs the native Google Sign-In, exchanges the
   *  Google ID token with the backend and stores the session."
   */
  it('sends the Google ID token to the backend and stores the session', async () => {
    mockGoogle.signIn.mockResolvedValue({
      type: 'success',
      data: { idToken: 'google-id-token' },
    });
    fetchMock.mockResolvedValue(respond(200, TOKENS));

    const settled = await run(useGoogleSignIn, undefined);

    const request = lastRequest();
    expect(request.url).toMatch(/\/api\/v1\/auth\/login\/google$/);
    expect(request.body).toEqual({ idToken: 'google-id-token' });
    expect(settled.status).toBe('fulfilled');
    expect(await SecureStore.getItemAsync('quadra.refreshToken')).toBe('refresh-opaque');
  });

  /**
   * Covers: S2 — Login
   * Criterion: "Dismissing the Google account picker is not an error" — the
   *  backend is never called.
   */
  it.each([
    ['a cancelled response', () => mockGoogle.signIn.mockResolvedValue({ type: 'cancelled', data: null })],
    ['a SIGN_IN_CANCELLED error', () => mockGoogle.signIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' })],
  ])('rejects with GoogleSignInCancelledError on %s', async (_label, arrange) => {
    arrange();

    const settled = await run(useGoogleSignIn, undefined);

    expect(settled.status).toBe('rejected');
    expect((settled as PromiseRejectedResult).reason).toBeInstanceOf(
      GoogleSignInCancelledError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces a readable message when the backend rejects the Google token', async () => {
    mockGoogle.signIn.mockResolvedValue({
      type: 'success',
      data: { idToken: 'google-id-token' },
    });
    fetchMock.mockResolvedValue(respond(401, { title: 'ID token validation failed.' }));

    const settled = await run(useGoogleSignIn, undefined);

    expect(rejectionMessage(settled)).toBe('Não foi possível entrar com o Google.');
    expect(await SecureStore.getItemAsync('quadra.accessToken')).toBeNull();
  });
});
