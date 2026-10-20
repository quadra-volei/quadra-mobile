/**
 * Session upkeep — `refreshSession` and `verifySession` (ARCHITECTURE "Auth
 * flow" / "Token storage rules").
 *
 * `fetch` is stubbed at the transport and expo-secure-store is in-memory:
 *  - refresh exchanges the stored refresh token, and stores the ROTATED pair;
 *  - concurrent refreshes share one request (a refresh token works only once);
 *  - a rejected refresh token clears the stored session;
 *  - verifySession reads the profile (GET /api/v1/profiles/me) to learn whether
 *    onboarding was completed, renewing an expired access token once.
 */
jest.mock('expo-secure-store', () =>
  require('../../../support/inMemorySecureStore'),
);

import * as SecureStore from 'expo-secure-store';

import { refreshSession } from '@/lib/auth/refreshSession';
import { saveTokens } from '@/lib/auth/tokenStorage';
import { verifySession } from '@/lib/auth/verifySession';

const USER_ID = '7b1f3c1e-0000-4000-8000-000000000001';

const fetchMock = jest.fn();

function respond(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body ?? {},
  };
}

function requestTo(path: string): [string, RequestInit][] {
  return (fetchMock.mock.calls as [string, RequestInit][]).filter(([url]) =>
    url.endsWith(path),
  );
}

/** The RequestInit of the first request sent to `path`. */
function firstRequestTo(path: string): RequestInit {
  const request = requestTo(path)[0];
  if (!request) {
    throw new Error(`No request was sent to ${path}`);
  }
  return request[1];
}

beforeEach(async () => {
  (SecureStore as unknown as { __reset: () => void }).__reset();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await saveTokens({ accessToken: 'old-access', refreshToken: 'old-refresh' });
});

describe('refreshSession', () => {
  it('exchanges the stored refresh token and stores the rotated pair', async () => {
    fetchMock.mockResolvedValue(
      respond(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }),
    );

    const accessToken = await refreshSession();

    expect(accessToken).toBe('new-access');
    const init = firstRequestTo('/api/v1/auth/refresh');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ refreshToken: 'old-refresh' });
    expect(await SecureStore.getItemAsync('quadra.accessToken')).toBe('new-access');
    expect(await SecureStore.getItemAsync('quadra.refreshToken')).toBe('new-refresh');
  });

  it('shares one request between concurrent callers (single-flight)', async () => {
    fetchMock.mockResolvedValue(
      respond(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }),
    );

    const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

    expect(results).toEqual(['new-access', 'new-access', 'new-access']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('clears the stored session when the backend rejects the refresh token', async () => {
    fetchMock.mockResolvedValue(respond(401, { title: 'revoked' }));

    await expect(refreshSession()).rejects.toThrow('API error 401');

    expect(await SecureStore.getItemAsync('quadra.accessToken')).toBeNull();
    expect(await SecureStore.getItemAsync('quadra.refreshToken')).toBeNull();
  });

  it('keeps the stored session when the refresh fails for another reason', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(refreshSession()).rejects.toThrow('Network request failed');

    expect(await SecureStore.getItemAsync('quadra.refreshToken')).toBe('old-refresh');
  });

  it('fails without calling the backend when no refresh token is stored', async () => {
    await SecureStore.deleteItemAsync('quadra.refreshToken');

    await expect(refreshSession()).rejects.toThrow();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('verifySession', () => {
  /**
   * Covers: S1 — Splash
   * Criterion: "With a valid token and existing profile ... redirects to Home."
   * The session check and `hasProfile` come from GET /api/v1/profiles/me.
   */
  it('returns the user for a valid access token without refreshing', async () => {
    fetchMock.mockResolvedValue(respond(200, { userId: USER_ID, onboardingCompleted: true }));

    const session = await verifySession('old-access');

    expect(session).toEqual({ userId: USER_ID, hasProfile: true });
    const init = firstRequestTo('/api/v1/profiles/me');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer old-access');
    expect(requestTo('/api/v1/auth/refresh')).toHaveLength(0);
  });

  /**
   * Covers: S1 — Splash
   * Criterion: "A returning user whose short-lived access token expired stays
   *  signed in" — the token is renewed once and the new one is reported.
   */
  it('renews an expired access token once and reports the new token', async () => {
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/api/v1/auth/refresh')) {
        return respond(200, { accessToken: 'new-access', refreshToken: 'new-refresh' });
      }
      const authorization = (init.headers as Record<string, string>).Authorization;
      return authorization === 'Bearer new-access'
        ? respond(200, { userId: USER_ID, onboardingCompleted: false })
        : respond(401);
    });

    const session = await verifySession('old-access');

    expect(session).toEqual({
      userId: USER_ID,
      hasProfile: false,
      accessToken: 'new-access',
    });
    expect(requestTo('/api/v1/auth/refresh')).toHaveLength(1);
  });

  /**
   * Covers: S1 — Splash
   * Criterion: "With ... a failed session check, redirects to login."
   */
  it('throws when the session cannot be renewed', async () => {
    fetchMock.mockResolvedValue(respond(401));

    await expect(verifySession('old-access')).rejects.toThrow();
  });

  it('does not try to refresh on a non-401 failure', async () => {
    fetchMock.mockResolvedValue(respond(500));

    await expect(verifySession('old-access')).rejects.toThrow('API error 500');

    expect(requestTo('/api/v1/auth/refresh')).toHaveLength(0);
  });
});
