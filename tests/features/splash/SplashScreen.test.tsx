/**
 * Tests for S1 — Splash Screen (app/index.tsx)
 * Covers every acceptance criterion from docs/specs/S1-splash.md
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Module mocks (must be hoisted before any real module imports) ---

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/auth/getAccessToken', () => ({
  getAccessToken: jest.fn(),
}));

jest.mock('@/lib/auth/verifySession', () => ({
  verifySession: jest.fn(),
}));

jest.mock('@/stores/auth', () => ({
  useAuthStore: jest.fn(),
}));

// Reanimated: inline stub — avoids native worklets initialization
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const useSharedValue = (initial: number) => ({ value: initial });
  const withTiming = (toValue: number) => toValue;
  const withRepeat = (animation: unknown) => animation;
  const useAnimatedStyle = (cb: () => object) => cb();
  const Easing = { inOut: (fn: unknown) => fn, ease: 0, linear: 0 };
  const AnimatedView = ({ children, style, ...props }: any) =>
    React.createElement(View, { ...props, style }, children);
  AnimatedView.displayName = 'Animated.View';
  return {
    __esModule: true,
    default: { View: AnimatedView },
    useSharedValue,
    withTiming,
    withRepeat,
    useAnimatedStyle,
    Easing,
  };
});

// react-native-svg: inline stub — SVG is not testable in jsdom
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Svg = ({ children, testID, width, height, ...rest }: any) =>
    React.createElement(View, { testID, width, height, ...rest }, children);
  const Path = () => null;
  const G = ({ children, ...rest }: any) => React.createElement(View, rest, children);
  const Circle = () => null;
  const Rect = () => null;
  return { __esModule: true, default: Svg, Path, G, Circle, Rect };
});

// expo-status-bar: no-op
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

// --- Real imports (after mocks) ---
import { useRouter } from 'expo-router';
import { getAccessToken } from '@/lib/auth/getAccessToken';
import { verifySession } from '@/lib/auth/verifySession';
import { useAuthStore } from '@/stores/auth';
import SplashScreen from '../../../app/index';

// --- Typed mock helpers ---
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockVerifySession = verifySession as jest.MockedFunction<typeof verifySession>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// --- Wrapper factory: fresh QueryClient per test ---
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

// --- Shared setup ---
let mockRouterReplace: jest.Mock;

beforeEach(() => {
  mockRouterReplace = jest.fn();
  mockUseRouter.mockReturnValue({
    replace: mockRouterReplace,
    push: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    canGoBack: jest.fn(() => false),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
  } as any);

  mockUseAuthStore.mockReturnValue({
    isAuthenticated: false,
    hasProfile: false,
    userId: null,
    accessToken: null,
    setAuth: jest.fn(),
    clearAuth: jest.fn(),
  } as any);
});

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// STATIC / VISUAL CRITERIA
// Render with a token that never resolves so the screen stays in "checking" state
// and never triggers navigation, keeping the full UI visible.
// ---------------------------------------------------------------------------

describe('S1 Splash — static visual criteria', () => {
  beforeEach(() => {
    // Keep auth check in-flight so component never navigates away
    mockGetAccessToken.mockImplementation(() => new Promise(() => {}));
  });

  /**
   * Covers: S1 — Splash
   * Criterion: Screen renders on a `bg-surface-dark` full-screen background
   *            with no interactive elements
   */
  it('renders the root container with bg-surface-dark className', async () => {
    await render(<SplashScreen />, { wrapper: makeWrapper() });

    const root = screen.getByTestId('splash-root');
    expect(root).toBeTruthy();
    expect(root.props.className).toContain('bg-surface-dark');
  });

  /**
   * Covers: S1 — Splash
   * Criterion: `QuadraLogo` icon is visible, centered, size 72
   */
  it('renders the QuadraLogo SVG with size 72', async () => {
    await render(<SplashScreen />, { wrapper: makeWrapper() });

    const svgEl = screen.getByTestId('quadra-logo');
    expect(svgEl).toBeTruthy();
    expect(svgEl.props.width).toBe(72);
  });

  /**
   * Covers: S1 — Splash
   * Criterion: "quadra" wordmark renders in Baloo 2 (`font-word`), white, below the logo mark
   */
  it('renders the "quadra" wordmark with font-word and text-on-dark classes', async () => {
    await render(<SplashScreen />, { wrapper: makeWrapper() });

    const wordmark = screen.getByText('quadra');
    expect(wordmark).toBeTruthy();
    expect(wordmark.props.className).toContain('font-word');
    expect(wordmark.props.className).toContain('text-on-dark');
  });

  /**
   * Covers: S1 — Splash
   * Criterion: "O JOGO COMEÇA AQUI" renders in Climate Crisis (`font-display`),
   *            lime (`text-accent`), uppercase, below the wordmark
   */
  it('renders the tagline with font-display, text-accent, and uppercase classes', async () => {
    await render(<SplashScreen />, { wrapper: makeWrapper() });

    const tagline = screen.getByText('O JOGO COMEÇA AQUI');
    expect(tagline).toBeTruthy();
    expect(tagline.props.className).toContain('font-display');
    expect(tagline.props.className).toContain('text-accent');
    expect(tagline.props.className).toContain('uppercase');
  });

  /**
   * Covers: S1 — Splash
   * Criterion: A `View` with `testID="progress-bar-track"` and className containing
   *            `bg-surface-dark-alt` is present, with a child Animated.View containing `bg-accent`
   */
  it('renders the progress bar track with bg-surface-dark-alt and animated fill with bg-accent', async () => {
    await render(<SplashScreen />, { wrapper: makeWrapper() });

    const track = screen.getByTestId('progress-bar-track');
    expect(track).toBeTruthy();
    expect(track.props.className).toContain('bg-surface-dark-alt');

    const fill = screen.getByTestId('progress-bar-fill');
    expect(fill).toBeTruthy();
    expect(fill.props.className).toContain('bg-accent');
  });

  /**
   * Covers: S1 — Splash
   * Criterion: "CARREGANDO" label is visible in DM Mono (`font-mono`), uppercase
   */
  it('renders the CARREGANDO label with font-mono and uppercase classes', async () => {
    await render(<SplashScreen />, { wrapper: makeWrapper() });

    const label = screen.getByText('CARREGANDO');
    expect(label).toBeTruthy();
    expect(label.props.className).toContain('font-mono');
    expect(label.props.className).toContain('uppercase');
  });

  /**
   * Covers: S1 — Splash
   * Criterion: No button or touchable element is rendered anywhere on the screen
   */
  it('renders no interactive (button/touchable) elements', async () => {
    await render(<SplashScreen />, { wrapper: makeWrapper() });

    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AUTH / ROUTING CRITERIA
// ---------------------------------------------------------------------------

describe('S1 Splash — auth routing criteria', () => {
  /**
   * Covers: S1 — Splash
   * Criterion: When no token is stored, `router.replace('/(auth)/login')` is called
   */
  it('routes to /(auth)/login when no token is stored', async () => {
    mockGetAccessToken.mockResolvedValue(null);

    await render(<SplashScreen />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  /**
   * Covers: S1 — Splash
   * Criterion: When a valid token exists and `hasProfile === true`,
   *            `router.replace('/(tabs)')` is called
   */
  it('routes to /(tabs) when token is valid and hasProfile is true', async () => {
    mockGetAccessToken.mockResolvedValue('valid-token-abc');
    mockVerifySession.mockResolvedValue({ userId: 'user-1', hasProfile: true });

    await render(<SplashScreen />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  /**
   * Covers: S1 — Splash
   * Criterion: When a valid token exists and `hasProfile === false`,
   *            `router.replace('/(auth)/onboarding')` is called
   */
  it('routes to /(auth)/onboarding when token is valid and hasProfile is false', async () => {
    mockGetAccessToken.mockResolvedValue('valid-token-abc');
    mockVerifySession.mockResolvedValue({ userId: 'user-1', hasProfile: false });

    await render(<SplashScreen />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/onboarding');
    });
  });

  /**
   * Covers: S1 — Splash
   * Criterion: If the auth check exceeds 2 seconds, the app routes to `/(auth)/login`
   */
  it('routes to /(auth)/login after 2-second timeout when auth check hangs', async () => {
    jest.useFakeTimers();

    // Token resolves but verifySession never resolves — simulates hanging network
    mockGetAccessToken.mockResolvedValue('valid-token-abc');
    mockVerifySession.mockImplementation(() => new Promise(() => {}));

    await render(<SplashScreen />, { wrapper: makeWrapper() });

    // Advance past the 2-second guard
    await jest.advanceTimersByTimeAsync(2001);

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  /**
   * Covers: S1 — Splash
   * Criterion: The splash is never in the navigation back stack
   *            (all navigations use `replace`, not `push`) — no-token case
   */
  it('uses router.replace not push — no-token case', async () => {
    mockGetAccessToken.mockResolvedValue(null);

    await render(<SplashScreen />, { wrapper: makeWrapper() });

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/login'));

    const routerInstance = mockUseRouter.mock.results[0]?.value as any;
    expect(routerInstance?.push).not.toHaveBeenCalled();
  });

  /**
   * Covers: S1 — Splash
   * Criterion: The splash is never in the navigation back stack
   *            (all navigations use `replace`, not `push`) — authenticated case
   */
  it('uses router.replace not push — authenticated case', async () => {
    mockGetAccessToken.mockResolvedValue('valid-token-xyz');
    mockVerifySession.mockResolvedValue({ userId: 'u2', hasProfile: true });

    await render(<SplashScreen />, { wrapper: makeWrapper() });

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)'));

    const routerInstance = mockUseRouter.mock.results[0]?.value as any;
    expect(routerInstance?.push).not.toHaveBeenCalled();
  });

  /**
   * Extra guard: setAuth is called with correct shape when session is valid
   */
  it('calls setAuth with userId, accessToken, and hasProfile when session is valid', async () => {
    mockGetAccessToken.mockResolvedValue('tok-123');
    mockVerifySession.mockResolvedValue({ userId: 'user-42', hasProfile: true });

    const setAuth = jest.fn();
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      hasProfile: false,
      userId: null,
      accessToken: null,
      setAuth,
      clearAuth: jest.fn(),
    } as any);

    await render(<SplashScreen />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(setAuth).toHaveBeenCalledWith({
        userId: 'user-42',
        accessToken: 'tok-123',
        hasProfile: true,
      });
    });
  });
});
