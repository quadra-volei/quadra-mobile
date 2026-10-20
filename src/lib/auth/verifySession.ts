import { authorizedApiClient } from '@/lib/api/authorizedClient';
import { getAccessToken } from '@/lib/auth/getAccessToken';

export type SessionResult = {
  userId: string;
  hasProfile: boolean;
  /**
   * Set when the stored access token had expired and was replaced during
   * verification; the caller must use it instead of the token it passed in.
   */
  accessToken?: string;
};

type MyProfileSummary = {
  userId: string;
  onboardingCompleted: boolean;
};

/**
 * Verifies the stored session and reads whether the user finished onboarding,
 * in one call: `GET /api/v1/profiles/me`. Access tokens are short-lived, so an
 * expired one is renewed once with the refresh token before giving up. Throws if
 * the session cannot be verified or renewed; the caller should treat any thrown
 * error as "unauthenticated".
 */
export async function verifySession(accessToken: string): Promise<SessionResult> {
  const profile = await authorizedApiClient<MyProfileSummary>('/api/v1/profiles/me');

  const result: SessionResult = {
    userId: profile.userId,
    hasProfile: profile.onboardingCompleted,
  };

  const currentToken = await getAccessToken();
  return currentToken && currentToken !== accessToken
    ? { ...result, accessToken: currentToken }
    : result;
}
