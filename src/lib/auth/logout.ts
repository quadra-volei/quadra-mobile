import type { QueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { apiClient } from '@/lib/api/client';
import { clearTokens, getRefreshToken } from '@/lib/auth/tokenStorage';
import { useAuthStore } from '@/stores/auth';

/**
 * Asks the backend to revoke this session's refresh token. Best-effort: being
 * offline (or the token already being dead) must never block signing out
 * locally, so every failure is swallowed.
 */
async function revokeRemoteSession(): Promise<void> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return;
    }
    await apiClient<void>('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Local sign-out proceeds regardless; the refresh token expires on its own.
  }
}

/**
 * Single source of truth for signing out (ARCHITECTURE "Logout").
 *
 * Revokes the refresh token on the backend (best-effort), clears both
 * secure-store tokens, resets the Zustand auth store, wipes the TanStack Query
 * cache, and redirects to Login. The `QueryClient` is passed in (callers use
 * `useQueryClient()`) so this helper stays decoupled from the root layout's
 * module-local client.
 */
export async function logout(queryClient: QueryClient): Promise<void> {
  await revokeRemoteSession();
  await clearTokens();
  useAuthStore.getState().clearAuth();
  queryClient.clear();
  router.replace('/login');
}
