import { ApiError, apiClient } from '@/lib/api/client';
import { hasCompletedOnboarding } from '@/lib/auth/onboardingFlag';
import { refreshSession } from '@/lib/auth/refreshSession';

export type SessionResult = {
  userId: string;
  hasProfile: boolean;
  /**
   * Set when the stored access token had expired and was replaced during
   * verification; the caller must use it instead of the token it passed in.
   */
  accessToken?: string;
};

type CurrentUserResponse = {
  userId: string;
};

function fetchCurrentUser(accessToken: string): Promise<CurrentUserResponse> {
  return apiClient<CurrentUserResponse>('/api/v1/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Verifies the stored session by calling GET /api/v1/auth/me. Access tokens are
 * short-lived, so an expired one (401) is renewed once with the refresh token
 * before giving up. Throws if the session cannot be verified or renewed; the
 * caller should treat any thrown error as "unauthenticated".
 */
export async function verifySession(accessToken: string): Promise<SessionResult> {
  let currentToken = accessToken;
  let user: CurrentUserResponse;

  try {
    user = await fetchCurrentUser(currentToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }
    currentToken = await refreshSession();
    user = await fetchCurrentUser(currentToken);
  }

  const hasProfile = await hasCompletedOnboarding(user.userId);

  return currentToken === accessToken
    ? { userId: user.userId, hasProfile }
    : { userId: user.userId, hasProfile, accessToken: currentToken };
}
