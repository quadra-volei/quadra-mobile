import { ApiError, apiClient } from '@/lib/api/client';
import {
  clearTokens,
  getRefreshToken,
  saveTokens,
} from '@/lib/auth/tokenStorage';

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

let inFlight: Promise<string> | null = null;

async function runRefresh(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token stored.');
  }

  try {
    const tokens = await apiClient<RefreshResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    // The backend rotates the refresh token on every use: the one just sent is
    // now dead, so the new pair must be stored before anything else runs.
    await saveTokens(tokens);
    return tokens.accessToken;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // Revoked, expired or already used — this session cannot be recovered.
      await clearTokens();
    }
    throw error;
  }
}

/**
 * Exchanges the stored refresh token for a new token pair and returns the new
 * access token. Single-flight (ARCHITECTURE "Token storage rules"): concurrent
 * callers share one request, which matters because a refresh token only works
 * once. Throws if there is no refresh token or the backend rejects it.
 */
export function refreshSession(): Promise<string> {
  if (!inFlight) {
    inFlight = runRefresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
