/**
 * S1 — Splash screen tests.
 *
 * Covers every acceptance criterion in docs/specs/S1-splash.md:
 *  - Brand lockup renders (gradient bg, QuadraLogo, "quadra" wordmark, tagline).
 *  - Indeterminate progress bar + "CARREGANDO" label show while auth check runs.
 *  - Valid token + existing profile  -> redirect /(tabs).
 *  - Valid token + hasProfile=false  -> redirect /(auth)/onboarding.
 *  - No token / failed auth/me        -> redirect /(auth)/login.
 *  - Splash never visible longer than 2s before redirecting.
 *  - No tappable / interactive elements.
 *  - No blue-blob / lime-wave decorative shapes.
 */
import React from 'react';

// --- Native / module mocks (the repo's tests/__mocks__ are not auto-applied) ---

// react-native-svg -> Views so the QuadraLogo renders queryable nodes.
jest.mock('react-native-svg', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const Svg = ({ children, testID, ...props }: any) =>
    ReactLocal.createElement(View, { ...props, testID: testID ?? 'svg-mock' }, children);
  const Path = () => null;
  return { __esModule: true, default: Svg, Svg, Path };
});

// reanimated -> stub the hooks/helpers the splash uses, Animated.View -> View.
jest.mock('react-native-reanimated', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const AnimatedView = ({ children, style, ...props }: any) =>
    ReactLocal.createElement(View, { ...props, style }, children);
  const easing = (fn?: unknown) => fn ?? 0;
  const createAnimatedComponent = (Component: any) => Component;
  return {
    __esModule: true,
    default: { View: AnimatedView, createAnimatedComponent },
    createAnimatedComponent,
    useSharedValue: (initial: number) => ({ value: initial }),
    withTiming: (to: number) => to,
    withRepeat: (anim: unknown) => anim,
    useAnimatedStyle: (cb: () => object) => cb(),
    Easing: { inOut: easing, ease: 0, in: easing, out: easing },
  };
});

// LinearGradient -> View that forwards props (so testID is queryable).
jest.mock('expo-linear-gradient', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: any) =>
      ReactLocal.createElement(
        View,
        { ...props, testID: props.testID ?? 'linear-gradient' },
        children,
      ),
  };
});

// expo-router: spyable router.replace; Stack/Redirect inert (used only by _layout).
const mockReplace = jest.fn();
jest.mock('expo-router', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const Stack: any = ({ children }: any) => ReactLocal.createElement(View, null, children);
  Stack.Screen = ({ children }: any) => ReactLocal.createElement(View, null, children);
  return {
    router: { replace: (...args: any[]) => mockReplace(...args) },
    Stack,
    Redirect: () => null,
  };
});

/**
 * Mock the root layout so the screen test controls the bootstrap timing without
 * dragging the whole provider tree (gesture-handler, fonts, etc.) into render.
 * The real bootstrap/timeout logic in app/_layout.tsx is covered separately
 * in tests/features/splash/authBootstrap.test.ts.
 */
let mockResolveBootstrap: () => void;
let mockBootstrapPromise: Promise<void>;
function resetBootstrap() {
  mockBootstrapPromise = new Promise<void>((resolve) => {
    mockResolveBootstrap = resolve;
  });
}
resetBootstrap();
jest.mock('../../../../app/_layout', () => ({
  getAuthBootstrap: () => mockBootstrapPromise,
}));

import { render, screen, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/stores/auth';

import Index from '../../../../app/index';

beforeEach(() => {
  mockReplace.mockClear();
  resetBootstrap();
  useAuthStore.getState().clearAuth();
});

/** Resolves the shared bootstrap promise the way the root layout would. */
async function settleBootstrap() {
  mockResolveBootstrap();
  await mockBootstrapPromise;
}

describe('S1 — Splash screen', () => {
  /**
   * Covers: S1 — Splash
   * Criterion: "the navy->blue gradient background, centered QuadraLogo,
   *  'quadra' wordmark, and 'O JOGO COMEÇA AQUI' tagline render."
   */
  it('renders the gradient background, logo, wordmark and tagline', async () => {
    await render(<Index />);

    expect(screen.getAllByTestId('linear-gradient').length).toBeGreaterThan(0);
    expect(screen.getByTestId('svg-mock')).toBeTruthy();
    expect(screen.getByText('quadra')).toBeTruthy();
    expect(screen.getByText('O JOGO COMEÇA AQUI')).toBeTruthy();
  });

  /**
   * Covers: S1 — Splash
   * Criterion: "An indeterminate progress bar and 'CARREGANDO' label are shown
   *  while the auth check runs."
   */
  it('shows the progress bar and CARREGANDO label while the auth check runs', async () => {
    // Bootstrap left pending -> still loading.
    await render(<Index />);

    expect(screen.getByText('CARREGANDO')).toBeTruthy();
    // Page gradient + the bar's own gradient fill -> at least two gradients.
    expect(screen.getAllByTestId('linear-gradient').length).toBeGreaterThanOrEqual(2);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  /**
   * Covers: S1 — Splash
   * Criterion: "With a valid token and existing profile, the app redirects to
   *  Home /(tabs) without user interaction."
   */
  it('redirects to /(tabs) when authenticated with an existing profile', async () => {
    await render(<Index />);
    useAuthStore.getState().setAuth({ userId: 'u1', accessToken: 't', hasProfile: true });
    await settleBootstrap();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  /**
   * Covers: S1 — Splash
   * Criterion: "With a valid token and no profile (hasProfile === false),
   *  redirects to /(auth)/onboarding."
   */
  it('redirects to /(auth)/onboarding when authenticated without a profile', async () => {
    await render(<Index />);
    useAuthStore.getState().setAuth({ userId: 'u1', accessToken: 't', hasProfile: false });
    await settleBootstrap();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(auth)/onboarding'));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  /**
   * Covers: S1 — Splash
   * Criterion: "With no token or a failed GET /api/v1/auth/me, redirects to
   *  /(auth)/login." (bootstrap leaves the store unauthenticated.)
   */
  it('redirects to /(auth)/login when the bootstrap resolves unauthenticated', async () => {
    await render(<Index />);
    // clearAuth already applied in beforeEach -> unauthenticated.
    await settleBootstrap();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(auth)/login'));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  /**
   * Covers: S1 — Splash
   * Criterion: "The splash never stays visible longer than 2 seconds before
   *  redirecting." From the screen's side: once the (2s-capped) bootstrap
   *  settles, a redirect always fires. (The 2s cap itself is verified in the
   *  authBootstrap unit test.)
   */
  it('always redirects once the (2s-capped) bootstrap settles', async () => {
    await render(<Index />);
    expect(mockReplace).not.toHaveBeenCalled(); // nothing before settle
    await settleBootstrap();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
  });

  /**
   * Covers: S1 — Splash
   * Criterion: "No tappable/interactive elements exist on the screen."
   */
  it('renders no tappable or interactive elements', async () => {
    await render(<Index />);

    // Pressables/Touchables compile down to host nodes carrying press/responder
    // handlers (onPress, onStartShouldSetResponder, onResponderGrant, onClick)
    // or a "button" role. Assert no rendered host node is interactive.
    const root = screen.root;
    expect(root).not.toBeNull();
    const interactive = root!.queryAll((node) => {
      const props = node.props as Record<string, unknown>;
      const hasPressHandler = [
        'onPress',
        'onPressIn',
        'onStartShouldSetResponder',
        'onResponderGrant',
        'onClick',
      ].some((key) => typeof props[key] === 'function');
      const isButtonRole = props.accessibilityRole === 'button' || props.role === 'button';
      return hasPressHandler || isButtonRole;
    });

    expect(interactive).toHaveLength(0);
  });

  /**
   * Covers: S1 — Splash
   * Criterion: "No blue-blob / lime-wave decorative shapes are rendered."
   * The only SVG on the screen is the QuadraLogo; decorative blobs/waves would
   * add extra SVG nodes. Assert exactly one logo SVG.
   */
  it('renders no decorative blob/wave shapes (only the brand logo SVG)', async () => {
    await render(<Index />);

    expect(screen.getAllByTestId('svg-mock')).toHaveLength(1);
  });
});
