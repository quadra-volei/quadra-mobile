import { ApiError, apiClient } from '@/lib/api/client';
import { getAccessToken } from '@/lib/auth/getAccessToken';
import { refreshSession } from '@/lib/auth/refreshSession';

function withBearer(options: RequestInit | undefined, accessToken: string): RequestInit {
  return {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  };
}

/**
 * `apiClient` for endpoints that need the signed-in user (ARCHITECTURE "API
 * client"): sends the stored access token and, because access tokens are
 * short-lived, renews the session once and retries when the backend answers 401.
 * Throws `ApiError` (401) when there is no session or it cannot be renewed.
 */
export async function authorizedApiClient<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ApiError(401, 'Unauthorized', null);
  }

  try {
    return await apiClient<T>(path, withBearer(options, accessToken));
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }
    const renewedToken = await refreshSession();
    return apiClient<T>(path, withBearer(options, renewedToken));
  }
}
