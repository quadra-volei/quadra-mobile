/**
 * Auth bootstrap (app/_layout.tsx) unit tests.
 *
 * The splash screen drives its redirect off the resolved auth store after the
 * shared one-shot bootstrap settles. These tests cover the bootstrap control
 * flow that backs the S1 acceptance criteria:
 *  - valid token + existing profile  -> store authenticated, hasProfile true
 *  - valid token + no profile        -> store authenticated, hasProfile false
 *  - no token                        -> store cleared (login path), no auth/me call
 *  - failed GET /api/v1/auth/me       -> store cleared (login path)
 *  - stall past the 60s cap          -> resolves via the timeout, store cleared
 *  - slow answer (server waking up)  -> still authenticates
 */

// Keep app/_layout's module init free of native side-effects. Only getAuthBootstrap
// is under test here; the provider tree / fonts are never rendered.
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));
jest.mock('react-native-gesture-handler', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return { GestureHandlerRootView: ({ children }: any) => ReactLocal.createElement(View, null, children) };
});
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { createAnimatedComponent: (c: unknown) => c },
  createAnimatedComponent: (c: unknown) => c,
}));
jest.mock('expo-font', () => ({ useFonts: () => [true] }));

const mockGetAccessToken = jest.fn();
const mockVerifySession = jest.fn();
jest.mock('@/lib/auth/getAccessToken', () => ({
  getAccessToken: (...args: unknown[]) => mockGetAccessToken(...args),
}));
jest.mock('@/lib/auth/verifySession', () => ({
  verifySession: (...args: unknown[]) => mockVerifySession(...args),
}));

// Share ONE auth store instance across every module registry. The isolated
// re-require of app/_layout below would otherwise get its own store, so the
// bootstrap's setAuth/clearAuth would not be observable from the test. We build
// the store once here (real zustand) and hand the same module object to every
// registry via the mock factory.
const mockAuthModule = jest.requireActual('@/stores/auth');
jest.mock('@/stores/auth', () => mockAuthModule);

const { useAuthStore } = mockAuthModule as typeof import('@/stores/auth');

/**
 * Re-require app/_layout in a fresh module registry so the module-private
 * singleton `bootstrapPromise` is reset for each scenario.
 */
function loadGetAuthBootstrap(): () => Promise<void> {
  let fn!: () => Promise<void>;
  jest.isolateModules(() => {
    fn = require('../../../app/_layout').getAuthBootstrap;
  });
  return fn;
}

beforeEach(() => {
  mockGetAccessToken.mockReset();
  mockVerifySession.mockReset();
  useAuthStore.getState().clearAuth();
});

describe('getAuthBootstrap', () => {
  /**
   * Covers: S1 — Splash
   * Criterion: "With a valid token and existing profile ... redirects to Home."
   * Bootstrap sets the store authenticated with hasProfile true.
   */
  it('authenticates with hasProfile=true for a valid token + existing profile', async () => {
    mockGetAccessToken.mockResolvedValue('valid-token');
    mockVerifySession.mockResolvedValue({ userId: 'u1', hasProfile: true });

    await loadGetAuthBootstrap()();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.hasProfile).toBe(true);
    expect(s.userId).toBe('u1');
    expect(mockVerifySession).toHaveBeenCalledWith('valid-token');
  });

  /**
   * Covers: S1 — Splash
   * Criterion: "With a valid token and no profile ... redirects to onboarding."
   */
  it('authenticates with hasProfile=false for a valid token + no profile', async () => {
    mockGetAccessToken.mockResolvedValue('valid-token');
    mockVerifySession.mockResolvedValue({ userId: 'u1', hasProfile: false });

    await loadGetAuthBootstrap()();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.hasProfile).toBe(false);
  });

  /**
   * Covers: S1 — Splash
   * Criterion: "With no token ... redirects to login." auth/me is never called.
   */
  it('clears auth and skips auth/me when there is no stored token', async () => {
    mockGetAccessToken.mockResolvedValue(null);

    await loadGetAuthBootstrap()();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(mockVerifySession).not.toHaveBeenCalled();
  });

  /**
   * Covers: S1 — Splash
   * Criterion: "With ... a failed GET /api/v1/auth/me, redirects to login."
   */
  it('clears auth when verifySession fails', async () => {
    mockGetAccessToken.mockResolvedValue('valid-token');
    mockVerifySession.mockRejectedValue(new Error('API error 401: Unauthorized'));

    await loadGetAuthBootstrap()();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  /**
   * Covers: S1 — Splash
   * A session check that never answers must lose the 60s Promise.race and
   *  the bootstrap must still settle into the unauthenticated (login) state.
   */
  it('resolves via the 60s timeout (cleared auth) when the session check stalls', async () => {
    jest.useFakeTimers();
    mockGetAccessToken.mockResolvedValue('valid-token');
    mockVerifySession.mockReturnValue(new Promise(() => {})); // never settles

    const promise = loadGetAuthBootstrap()();

    // Let getAccessToken's microtask resolve, then trip the 2s timeout.
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(60_000);
    await promise;

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    jest.useRealTimers();
  });

  /**
   * DECISIONS #44: a server that takes long to wake up (well past the old 2s
   * cap) must not send a valid session to Login.
   */
  it('still authenticates when the session check answers after 30s', async () => {
    jest.useFakeTimers();
    mockGetAccessToken.mockResolvedValue('valid-token');
    mockVerifySession.mockReturnValue(
      new Promise((resolve) => {
        setTimeout(() => resolve({ userId: 'u1', hasProfile: true }), 30_000);
      }),
    );

    const promise = loadGetAuthBootstrap()();
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(30_000);
    await promise;

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    jest.useRealTimers();
  });

  /**
   * Covers: S1 — Splash (idempotency / "the check never runs twice").
   * getAuthBootstrap returns the same shared promise on repeated calls.
   */
  it('runs the check once and shares a single promise', async () => {
    mockGetAccessToken.mockResolvedValue(null);

    const getAuthBootstrap = loadGetAuthBootstrap();
    const p1 = getAuthBootstrap();
    const p2 = getAuthBootstrap();
    expect(p1).toBe(p2);

    await p1;
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
  });
});
