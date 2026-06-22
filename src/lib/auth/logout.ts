import * as SecureStore from 'expo-secure-store';
import type { QueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/auth';

const ACCESS_TOKEN_KEY = 'quadra.accessToken';
const REFRESH_TOKEN_KEY = 'quadra.refreshToken';

/**
 * Clears stored tokens, resets auth state, and wipes the TanStack Query cache.
 * Caller is responsible for navigation (e.g. router.replace to login).
 */
export async function logout(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
  useAuthStore.getState().clearAuth();
  queryClient.clear();
}
