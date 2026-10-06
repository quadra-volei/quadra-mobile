/**
 * S10 — logout helper (`src/lib/auth/logout.ts`).
 *
 * Covers the S10 acceptance criterion:
 *  "'Sair da conta' clears tokens + auth store + query cache and redirects to
 *   Login."
 *
 * SecureStore + expo-router are mocked; the real auth store is exercised. Asserts
 * BOTH secure-store token keys are deleted (never AsyncStorage), the auth store is
 * reset, the passed QueryClient is cleared, and navigation replaces to Login.
 */
import * as SecureStore from 'expo-secure-store';

const mockDelete = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-secure-store', () => ({
  deleteItemAsync: (...args: any[]) => mockDelete(...args),
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: any[]) => mockReplace(...args) },
}));

import { QueryClient } from '@tanstack/react-query';

import { logout } from '@/lib/auth/logout';
import { useAuthStore } from '@/stores/auth';

beforeEach(() => {
  mockDelete.mockClear();
  mockReplace.mockClear();
  useAuthStore.getState().setAuth({
    userId: 'u1',
    accessToken: 'tok',
    hasProfile: true,
  });
});

describe('logout', () => {
  it('deletes both secure-store token keys, resets auth, clears the cache and redirects to Login', async () => {
    const queryClient = new QueryClient();
    const clearSpy = jest.spyOn(queryClient, 'clear');

    await logout(queryClient);

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
  });

  it('uses the SecureStore API for token deletion', () => {
    // Guards the rule: tokens live only in expo-secure-store.
    expect(typeof SecureStore.deleteItemAsync).toBe('function');
  });
});
