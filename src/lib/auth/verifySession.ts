import { apiClient } from '@/lib/api/client';

export type SessionResult = {
  userId: string;
  hasProfile: boolean;
};

/**
 * Verifies the stored access token by calling GET /api/v1/auth/me.
 * Throws if the token is invalid (401) or the request fails for any reason.
 * The caller should treat any thrown error as "unauthenticated".
 */
export async function verifySession(accessToken: string): Promise<SessionResult> {
  return apiClient<SessionResult>('/api/v1/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
