import type { QueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import { useAuthStore } from '@/stores/auth';

// Secure-store keys (ARCHITECTURE "Token storage rules"). Tokens live ONLY in
// expo-secure-store — never AsyncStorage.
const ACCESS_TOKEN_KEY = 'quadra.accessToken';
const REFRESH_TOKEN_KEY = 'quadra.refreshToken';

/**
 * Single source of truth for signing out (ARCHITECTURE "Logout").
 *
 * Clears both secure-store tokens, resets the Zustand auth store, wipes the
 * TanStack Query cache, and redirects to Login. The `QueryClient` is passed in
 * (callers use `useQueryClient()`) so this helper stays decoupled from the
 * root layout's module-local client.
 *
 * No backend revoke endpoint is asserted; token revocation, if added later, is
 * additive behind this helper.
 */
export async function logout(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
  useAuthStore.getState().clearAuth();
  queryClient.clear();
  router.replace('/login');
}
