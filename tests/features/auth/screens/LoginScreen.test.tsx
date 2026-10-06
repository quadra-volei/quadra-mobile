/**
 * S2 — Login screen tests.
 *
 * Covers every acceptance criterion in docs/specs/S2-login.md:
 *  - Intro state: quadra lockup, "O JOGO COMEÇA AQUI." headline (lime "AQUI."),
 *    subtitle, single "Entrar e jogar" CTA over the navy->blue gradient.
 *  - "Entrar e jogar" opens the "ACESSE SUA CONTA" sheet over a dimmed intro.
 *  - Phone field defaults to BR (+55), digits-only; "Entrar na Quadra" disabled
 *    until a valid (10-11 digit) phone is entered.
 *  - Valid phone submit -> mocked useRequestOtp resolves -> push /sms-otp w/ phone.
 *  - "Entrar com Google" -> mocked useGoogleSignIn resolves -> replace
 *    /onboarding (hasProfile false) or /(tabs) (hasProfile true).
 *  - A failed Google sign-in surfaces an inline message (no toast); backing out
 *    of the Google account picker surfaces nothing.
 *  - Invalid phone surfaces via PhoneInput error prop only -- NO toast.
 *  - No "Esqueceu a senha?", no Apple button, no email/password fields.
 *  - "ou" divider, Google button, Terms/Privacy disclaimer present.
 *
 * All auth is mocked at the hook boundary (no network, no MSW). Navigation is
 * mocked via expo-router. Native modules (gradient, reanimated, gesture-handler,
 * svg) are stubbed inline -- the repo's tests/__mocks__ are not auto-applied.
 */
import React from 'react';

// --- Native / module mocks ------------------------------------------------

// react-native-svg -> Views so the QuadraLogo / GoogleMark render as nodes.
jest.mock('react-native-svg', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const Svg = ({ children, testID, ...props }: any) =>
    ReactLocal.createElement(View, { ...props, testID: testID ?? 'svg-mock' }, children);
  const Path = () => null;
  return { __esModule: true, default: Svg, Svg, Path };
});

// reanimated -> stub the hooks/helpers the login sheet and intro entrance use.
// Every `with*` helper resolves to its end value, so assertions see the settled
// frame (the intro rise is finished, the sheet is at its target offset).
jest.mock('react-native-reanimated', () => {
  const ReactLocal = require('react');
  const { Text, View } = require('react-native');
  const AnimatedView = ({ children, style, ...props }: any) =>
    ReactLocal.createElement(View, { ...props, style }, children);
  const AnimatedText = ({ children, style, ...props }: any) =>
    ReactLocal.createElement(Text, { ...props, style }, children);
  const easing = (fn?: unknown) => fn ?? 0;
  const createAnimatedComponent = (Component: any) => Component;
  return {
    __esModule: true,
    default: { View: AnimatedView, Text: AnimatedText, createAnimatedComponent },
    createAnimatedComponent,
    useSharedValue: (initial: number) => ({ value: initial }),
    withTiming: (to: number, _config?: object, cb?: (finished: boolean) => void) => {
      // Synchronously run the completion callback so close() flips state in tests.
      if (cb) {
        cb(true);
      }
      return to;
    },
    withDelay: (_delay: number, anim: unknown) => anim,
    runOnJS: (fn: (...args: any[]) => any) => fn,
    useAnimatedStyle: (cb: () => object) => cb(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    Easing: { inOut: easing, ease: 0, in: easing, out: easing, bezier: () => 0 },
  };
});

// gesture-handler -> inert GestureDetector + chainable Gesture.Pan().
jest.mock('react-native-gesture-handler', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const chainable: any = {};
  ['onUpdate', 'onEnd', 'onStart', 'onChange'].forEach((m) => {
    chainable[m] = () => chainable;
  });
  return {
    __esModule: true,
    GestureDetector: ({ children }: any) => ReactLocal.createElement(View, null, children),
    Gesture: { Pan: () => chainable },
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

// lucide icon -> inert node (avoids pulling svg internals).
jest.mock('lucide-react-native', () => ({
  ChevronLeft: () => null,
}));

// expo-router: spyable router.push / router.replace.
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...args: any[]) => mockPush(...args),
    replace: (...args: any[]) => mockReplace(...args),
  },
}));

// --- Auth hook mocks (the mocked mutations) -------------------------------
// We control resolution + the Google hasProfile branch deterministically.

type MutateOpts<TData> = {
  onSuccess?: (data: TData) => void;
  onError?: (err: Error) => void;
};
type GoogleResult = {
  session: { token: string };
  user: { id: string; name: string; hasProfile: boolean };
};

// Stand-in for the real cancellation error class (the screen checks `instanceof`).
class MockGoogleSignInCancelledError extends Error {}

// `mock`-prefixed holder so jest.mock factories may reference it (hoisting rule).
const mockAuth = {
  requestOtpBehavior: 'resolve' as 'resolve' | 'reject',
  requestOtpError: new Error('boom'),
  requestOtpIsPending: false,
  googleHasProfile: false,
  googleIsPending: false,
  googleBehavior: 'resolve' as 'resolve' | 'reject' | 'cancel',
  requestOtpMutate: jest.fn(
    (_input: { phone: string }, opts?: MutateOpts<{ ok: true }>) => {
      if (mockAuth.requestOtpBehavior === 'reject') {
        opts?.onError?.(mockAuth.requestOtpError);
      } else {
        opts?.onSuccess?.({ ok: true });
      }
    },
  ),
  googleSignInMutate: jest.fn((_input: void, opts?: MutateOpts<GoogleResult>) => {
    if (mockAuth.googleBehavior === 'cancel') {
      opts?.onError?.(new MockGoogleSignInCancelledError());
      return;
    }
    if (mockAuth.googleBehavior === 'reject') {
      opts?.onError?.(new Error('Não foi possível entrar com o Google.'));
      return;
    }
    opts?.onSuccess?.({
      session: { token: 'mock-google-session' },
      user: { id: 'mock', name: 'Jogador', hasProfile: mockAuth.googleHasProfile },
    });
  }),
};

jest.mock('@/features/auth/api/requestOtp', () => ({
  useRequestOtp: () => ({
    mutate: mockAuth.requestOtpMutate,
    isPending: mockAuth.requestOtpIsPending,
  }),
}));
jest.mock('@/features/auth/api/googleSignIn', () => ({
  // Getter: resolved lazily, after the class below the hoisted mocks exists.
  get GoogleSignInCancelledError() {
    return MockGoogleSignInCancelledError;
  },
  useGoogleSignIn: () => ({
    mutate: mockAuth.googleSignInMutate,
    isPending: mockAuth.googleIsPending,
  }),
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/stores/auth';

import LoginScreen from '../../../../app/(auth)/login';

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockAuth.requestOtpMutate.mockClear();
  mockAuth.googleSignInMutate.mockClear();
  mockAuth.requestOtpBehavior = 'resolve';
  mockAuth.requestOtpError = new Error('boom');
  mockAuth.requestOtpIsPending = false;
  mockAuth.googleIsPending = false;
  mockAuth.googleHasProfile = false;
  mockAuth.googleBehavior = 'resolve';
  useAuthStore.getState().clearAuth();
});

/** Opens the bottom sheet by tapping the intro CTA. */
async function openSheet() {
  fireEvent.press(screen.getByTestId('open-sheet'));
  await waitFor(() => expect(screen.getByText('ACESSE SUA CONTA')).toBeTruthy());
}

/** Types national digits into the phone field. */
function typePhone(digits: string) {
  fireEvent.changeText(screen.getByTestId('phone-input'), digits);
}

describe('S2 — Login screen', () => {
  // ---------------------------------------------------------------- intro
  /**
   * Covers: S2 — Login
   * Criterion: "Intro state renders the quadra lockup, the 'O JOGO COMEÇA AQUI.'
   *  display headline (with the lime 'AQUI.'), the subtitle, and a single
   *  'Entrar e jogar' gradient CTA over the navy->blue gradient."
   */
  it('renders the intro: wordmark, headline, lime AQUI., subtitle and single CTA', async () => {
    await render(<LoginScreen />);

    // navy->blue gradient hero present
    expect(screen.getAllByTestId('linear-gradient').length).toBeGreaterThan(0);
    // quadra wordmark + logo
    expect(screen.getByText('quadra')).toBeTruthy();
    expect(screen.getByTestId('svg-mock')).toBeTruthy();
    // headline split across text nodes -> match by substrings
    expect(screen.getByText(/O JOGO/)).toBeTruthy();
    expect(screen.getByText(/COMEÇA/)).toBeTruthy();
    // the lime "AQUI." is its own nested Text node
    expect(screen.getByText('AQUI.')).toBeTruthy();
    // subtitle
    expect(
      screen.getByText(/Encontre partidas de vôlei perto de você/i),
    ).toBeTruthy();
    // single CTA (only one before the sheet is opened)
    expect(screen.getByText('Entrar e jogar')).toBeTruthy();
    expect(screen.queryByText('Entrar na Quadra')).toBeNull();
  });

  // ---------------------------------------------------------------- sheet open
  /**
   * Covers: S2 — Login
   * Criterion: "Tapping 'Entrar e jogar' opens the 'ACESSE SUA CONTA' bottom
   *  sheet over the dimmed intro."
   */
  it('opens the ACESSE SUA CONTA sheet on "Entrar e jogar"', async () => {
    await render(<LoginScreen />);

    expect(screen.queryByText('ACESSE SUA CONTA')).toBeNull();
    await openSheet();

    expect(screen.getByText('ACESSE SUA CONTA')).toBeTruthy();
    expect(screen.getByText(/Use seu telefone para entrar ou criar conta/i)).toBeTruthy();
    // dimmed backdrop present
    expect(screen.getByTestId('sheet-backdrop')).toBeTruthy();
  });

  // ---------------------------------------------------------------- phone field
  /**
   * Covers: S2 — Login
   * Criterion: "The phone field defaults to BR (+55) and accepts only digits;
   *  'Entrar na Quadra' is disabled until a valid phone is entered."
   */
  it('defaults to BR +55, strips non-digits, and gates the submit button', async () => {
    await render(<LoginScreen />);
    await openSheet();

    // BR / +55 pill is display-only
    expect(screen.getByText('BR')).toBeTruthy();
    expect(screen.getByText('+55')).toBeTruthy();

    // disabled until valid
    const submit = screen.getByTestId('submit-phone');
    expect(submit.props.accessibilityState?.disabled).toBe(true);

    // non-digits are stripped before validation -> onChangeText receives digits only
    typePhone('11a99b99-99c99'); // -> "119999999" after strip (9 digits, still invalid)
    await waitFor(() => {
      expect(screen.getByTestId('submit-phone').props.accessibilityState?.disabled).toBe(true);
    });

    // valid 11-digit phone enables the button
    typePhone('11999999999');
    await waitFor(() => {
      expect(screen.getByTestId('submit-phone').props.accessibilityState?.disabled).toBe(false);
    });
  });

  // ------------------------------------------------------------- OTP submit
  /**
   * Covers: S2 — Login
   * Criterion: "Submitting a valid phone calls the mocked useRequestOtp mutation
   *  (no network) and, on its resolution, navigates to S3 (sms-otp) carrying the
   *  phone number."
   */
  it('submits a valid phone -> calls mocked OTP -> pushes /sms-otp with E.164 phone', async () => {
    await render(<LoginScreen />);
    await openSheet();

    typePhone('11999999999');
    await waitFor(() =>
      expect(screen.getByTestId('submit-phone').props.accessibilityState?.disabled).toBe(false),
    );

    fireEvent.press(screen.getByTestId('submit-phone'));

    await waitFor(() => expect(mockAuth.requestOtpMutate).toHaveBeenCalledTimes(1));
    // mutated with assembled E.164 phone
    expect(mockAuth.requestOtpMutate.mock.calls[0]?.[0]).toEqual({ phone: '+5511999999999' });

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/sms-otp',
        params: { phone: '+5511999999999' },
      }),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------ Google: onboarding
  /**
   * Covers: S2 — Login
   * Criterion: "Tapping 'Entrar com Google' calls the mocked useGoogleSignIn
   *  mutation; on its resolution the user lands on Onboarding (stub hasProfile
   *  === false)."
   */
  it('Google sign-in (hasProfile false) -> sets auth and replaces /onboarding', async () => {
    mockAuth.googleHasProfile = false;
    await render(<LoginScreen />);
    await openSheet();

    fireEvent.press(screen.getByTestId('google-signin'));

    await waitFor(() => expect(mockAuth.googleSignInMutate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/onboarding'));
    expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)');
    expect(mockPush).not.toHaveBeenCalled();

    // stub session/user written to the auth store (in-memory only)
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('mock-google-session');
    expect(state.hasProfile).toBe(false);
  });

  // ------------------------------------------------------ Google: home
  /**
   * Covers: S2 — Login
   * Criterion: "Tapping 'Entrar com Google' ... on its resolution the user lands
   *  on Home (stub hasProfile === true)."
   */
  it('Google sign-in (hasProfile true) -> sets auth and replaces /(tabs)', async () => {
    mockAuth.googleHasProfile = true;
    await render(<LoginScreen />);
    await openSheet();

    fireEvent.press(screen.getByTestId('google-signin'));

    await waitFor(() => expect(mockAuth.googleSignInMutate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
    expect(mockReplace).not.toHaveBeenCalledWith('/onboarding');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.hasProfile).toBe(true);
  });

  // ------------------------------------------------------ Google: failure
  /**
   * Covers: S2 — Login
   * Criterion: "A failed Google sign-in shows an inline message under the Google
   *  button — no toast — and keeps the user on the sheet."
   */
  it('Google sign-in failure -> inline message, no navigation, not authenticated', async () => {
    mockAuth.googleBehavior = 'reject';
    await render(<LoginScreen />);
    await openSheet();

    fireEvent.press(screen.getByTestId('google-signin'));

    const errorNode = await screen.findByTestId('google-error');
    expect(errorNode.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByText('Não foi possível entrar com o Google.')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  /**
   * Covers: S2 — Login
   * Criterion: "Dismissing the Google account picker is not an error: nothing is
   *  shown and the user stays on the sheet."
   */
  it('Google sign-in cancelled -> no message and no navigation', async () => {
    mockAuth.googleBehavior = 'cancel';
    await render(<LoginScreen />);
    await openSheet();

    fireEvent.press(screen.getByTestId('google-signin'));

    await waitFor(() => expect(mockAuth.googleSignInMutate).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('google-error')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------ invalid phone / no toast
  /**
   * Covers: S2 — Login
   * Criterion: "Invalid phone input surfaces its message via the PhoneInput
   *  error prop only -- no toast is rendered anywhere."
   *
   * Drives the error path through the mutation rejection (the spec's documented
   * way to exercise the failure branch), which routes the message into the
   * PhoneInput error prop. Asserts the inline danger message appears and that no
   * toast / global notification node exists.
   */
  it('surfaces an error via PhoneInput only and renders no toast', async () => {
    mockAuth.requestOtpBehavior = 'reject';
    mockAuth.requestOtpError = new Error('Telefone inválido');

    await render(<LoginScreen />);
    await openSheet();

    // No error message before any interaction.
    expect(screen.queryByText('Telefone inválido')).toBeNull();

    typePhone('11999999999');
    await waitFor(() =>
      expect(screen.getByTestId('submit-phone').props.accessibilityState?.disabled).toBe(false),
    );
    fireEvent.press(screen.getByTestId('submit-phone'));

    // error surfaces inline (PhoneInput renders it via accessibilityLiveRegion).
    const errorNode = await screen.findByText('Telefone inválido');
    expect(errorNode).toBeTruthy();
    expect(errorNode.props.accessibilityLiveRegion).toBe('polite');

    // No toast primitive anywhere: no node with the alert role, and nothing was
    // navigated away (the error keeps the user on the sheet).
    expect(screen.queryByRole('alert')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------ negative assertions
  /**
   * Covers: S2 — Login
   * Criterion: "No 'Esqueceu a senha?' link, no Apple button, and no
   *  email/password fields are rendered."
   */
  it('renders no forgot-password link, no Apple button, no email/password fields', async () => {
    await render(<LoginScreen />);
    await openSheet();

    expect(screen.queryByText(/esqueceu a senha/i)).toBeNull();
    expect(screen.queryByText(/apple/i)).toBeNull();
    expect(screen.queryByText(/entrar com apple/i)).toBeNull();
    // no email / password labels or fields
    expect(screen.queryByText(/e-?mail/i)).toBeNull();
    expect(screen.queryByText(/senha/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/e-?mail/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/senha/i)).toBeNull();
  });

  /**
   * Covers: S2 — Login
   * Criterion: "The 'ou' divider, Google button, and Terms/Privacy disclaimer
   *  are present in the sheet."
   */
  it('renders the "ou" divider, Google button, and Terms/Privacy disclaimer', async () => {
    await render(<LoginScreen />);
    await openSheet();

    expect(screen.getByText('ou')).toBeTruthy();
    expect(screen.getByText('Entrar com Google')).toBeTruthy();
    expect(screen.getByTestId('google-signin')).toBeTruthy();
    expect(screen.getByText(/Ao continuar, você aceita os/i)).toBeTruthy();
    expect(screen.getByText('Termos')).toBeTruthy();
    expect(screen.getByText('Política de Privacidade')).toBeTruthy();
  });
});
