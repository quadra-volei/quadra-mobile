/**
 * S1 — Splash screen tests.
 *
 *  - The mark, the court lines and the progress bar render, with no text (DECISIONS #84, #102).
 *  - Valid token + existing profile  -> redirect /(tabs).
 *  - Valid token + hasProfile=false  -> redirect /(auth)/onboarding.
 *  - No token / failed auth/me        -> redirect /(auth)/login.
 *  - No redirect before the auth bootstrap settles, nor before the minimum hold (DECISIONS #90).
 *  - No tappable / interactive elements.
 */
import React from 'react';

// --- Native / module mocks (the repo's tests/__mocks__ are not auto-applied) ---

// react-native-svg -> Views so the QuadraLogo renders queryable nodes.
jest.mock('react-native-svg', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const Svg = ({ children, testID, ...props }: any) =>
    ReactLocal.createElement(View, { ...props, testID: testID ?? 'svg-mock' }, children);
  const Shape = () => null;
  return { __esModule: true, default: Svg, Svg, Path: Shape, Line: Shape, Circle: Shape };
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

import { act, render, screen, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/stores/auth';

import Index, { MIN_HOLD_MS } from '../../../../app/index';

beforeEach(() => {
  jest.useFakeTimers();
  mockReplace.mockClear();
  resetBootstrap();
  useAuthStore.getState().clearAuth();
});

afterEach(() => {
  jest.useRealTimers();
});

/** Resolves the shared bootstrap promise the way the root layout would, after the minimum hold. */
async function settleBootstrap(elapsedMs = MIN_HOLD_MS) {
  await act(async () => {
    mockResolveBootstrap();
    await mockBootstrapPromise;
    await jest.advanceTimersByTimeAsync(elapsedMs);
  });
}

describe('S1 — Splash screen', () => {
  it('renders the mark over the court and the progress bar, with no text', async () => {
    await render(<Index />);

    expect(screen.getByTestId('splash-mark')).toBeTruthy();
    expect(screen.getByTestId('svg-mock')).toBeTruthy(); // the court lines
    expect(screen.getByTestId('splash-progress')).toBeTruthy();
    expect(screen.queryAllByText(/./)).toHaveLength(0);
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
  });

  it('does not redirect before the auth bootstrap settles', async () => {
    await render(<Index />);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('holds the splash for the minimum time even when the bootstrap settles at once', async () => {
    await render(<Index />);
    await settleBootstrap(MIN_HOLD_MS - 1);
    expect(mockReplace).not.toHaveBeenCalled();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('redirects to /(tabs) when authenticated with an existing profile', async () => {
    await render(<Index />);
    useAuthStore.getState().setAuth({ userId: 'u1', accessToken: 't', hasProfile: true });
    await settleBootstrap();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('redirects to /(auth)/onboarding when authenticated without a profile', async () => {
    await render(<Index />);
    useAuthStore.getState().setAuth({ userId: 'u1', accessToken: 't', hasProfile: false });
    await settleBootstrap();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(auth)/onboarding'));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('redirects to /(auth)/login when the bootstrap resolves unauthenticated', async () => {
    await render(<Index />);
    // clearAuth already applied in beforeEach -> unauthenticated.
    await settleBootstrap();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(auth)/login'));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('renders no tappable or interactive elements', async () => {
    await render(<Index />);

    // Pressables/Touchables compile down to host nodes carrying press/responder
    // handlers (onPress, onStartShouldSetResponder, onResponderGrant, onClick)
    // or a "button" role. Assert no rendered host node is interactive.
    const interactive = screen.root!.queryAll((node) => {
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
});
