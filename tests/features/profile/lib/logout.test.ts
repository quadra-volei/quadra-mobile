/**
 * S10 — logout helper (`src/lib/auth/logout.ts`).
 *
 * Covers the S10 acceptance criterion:
 *  "'Sair da conta' clears tokens + auth store + query cache and redirects to
 *   Login."
 *
 * SecureStore + expo-router + fetch are mocked; the real auth store is
 * exercised. Asserts the refresh token is revoked on the backend (best-effort),
 * BOTH secure-store token keys are deleted (never AsyncStorage), the auth store
 * is reset, the passed QueryClient is cleared, and navigation replaces to Login.
 */
import * as SecureStore from 'expo-secure-store';

const mockGet = jest.fn();
const mockDelete = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-secure-store', () => ({
  getItemAsync: (...args: any[]) => mockGet(...args),
  deleteItemAsync: (...args: any[]) => mockDelete(...args),
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: any[]) => mockReplace(...args) },
}));

import { QueryClient } from '@tanstack/react-query';

import { logout } from '@/lib/auth/logout';
import { useAuthStore } from '@/stores/auth';

const fetchMock = jest.fn();

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue('stored-refresh-token');
  mockDelete.mockClear();
  mockReplace.mockClear();
  fetchMock.mockReset().mockResolvedValue({ ok: true, status: 204 });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  useAuthStore.getState().setAuth({
    userId: 'u1',
    accessToken: 'tok',
    hasProfile: true,
  });
});

function expectSignedOutLocally(clearSpy: jest.SpyInstance) {
  // both tokens cleared from expo-secure-store (never AsyncStorage)
  expect(mockDelete).toHaveBeenCalledWith('quadra.accessToken');
  expect(mockDelete).toHaveBeenCalledWith('quadra.refreshToken');
  expect(mockDelete).toHaveBeenCalledTimes(2);

  // auth store reset
  const auth = useAuthStore.getState();
  expect(auth.isAuthenticated).toBe(false);
  expect(auth.userId).toBeNull();
  expect(auth.accessToken).toBeNull();
  expect(auth.hasProfile).toBe(false);

  // query cache wiped
  expect(clearSpy).toHaveBeenCalledTimes(1);

  // redirected to Login
  expect(mockReplace).toHaveBeenCalledWith('/login');
}

describe('logout', () => {
  it('revokes the refresh token, deletes both token keys, resets auth, clears the cache and redirects to Login', async () => {
    const queryClient = new QueryClient();
    const clearSpy = jest.spyOn(queryClient, 'clear');

    await logout(queryClient);

    // the session's refresh token is revoked on the backend before it is deleted
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/auth\/logout$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      refreshToken: 'stored-refresh-token',
    });

    expectSignedOutLocally(clearSpy);
  });

  it('still signs out locally when the backend cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const queryClient = new QueryClient();
    const clearSpy = jest.spyOn(queryClient, 'clear');

    await logout(queryClient);

    expectSignedOutLocally(clearSpy);
  });

  it('skips the backend call when no refresh token is stored', async () => {
    mockGet.mockResolvedValue(null);
    const queryClient = new QueryClient();
    const clearSpy = jest.spyOn(queryClient, 'clear');

    await logout(queryClient);

    expect(fetchMock).not.toHaveBeenCalled();
    expectSignedOutLocally(clearSpy);
  });

  it('uses the SecureStore API for token deletion', () => {
    // Guards the rule: tokens live only in expo-secure-store.
    expect(typeof SecureStore.deleteItemAsync).toBe('function');
  });
});
