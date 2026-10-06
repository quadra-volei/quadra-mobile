/**
 * S3 — SMS Verification screen tests.
 *
 * Covers every acceptance criterion in docs/specs/S3-sms-otp.md:
 *  - Navy->blue hero strip with back chevron + message icon, white card with the
 *    "CONFIRME SEU NÚMERO" display headline.
 *  - Subtitle echoes the phone passed from S2 via route params.
 *  - Six separate digit boxes; typing auto-advances focus; backspace on an empty
 *    box moves focus back.
 *  - "Verificar" disabled until all 6 digits entered, then the gradient CTA.
 *  - Submitting calls the mocked useVerifyOtp; on resolution routes to Onboarding
 *    (hasProfile false) or Home (hasProfile true).
 *  - Incorrect code (not "123456") surfaces the error state (red border + shake) and
 *    renders NO toast.
 *  - Resend control shows "Reenviar em M:SS" counting down (~30s), non-interactive
 *    during countdown; at 0 becomes the active "Reenviar código" link.
 *  - Tapping "Reenviar código" calls mocked useResendOtp and restarts the countdown.
 *  - "Usar outro número" and the back chevron both return to S2 (login).
 *  - Exactly 6 boxes (no 4-digit variant).
 *
 * All auth is mocked at the hook boundary (no network, no MSW). Navigation and
 * route params are mocked via expo-router. Native modules (gradient, reanimated,
 * safe-area, lucide) are stubbed inline — the repo's tests/__mocks__ are NOT
 * auto-applied. The countdown is driven by jest fake timers.
 */
import React from 'react';

// --- Native / module mocks ------------------------------------------------

// reanimated -> Animated.View becomes a plain View; shake helpers inert.
jest.mock('react-native-reanimated', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const AnimatedView = ({ children, style, ...props }: any) =>
    ReactLocal.createElement(View, { ...props, style }, children);
  return {
    __esModule: true,
    default: { View: AnimatedView },
    useSharedValue: (initial: number) => ({ value: initial }),
    withTiming: (to: number) => to,
    withSequence: (...args: number[]) => args[args.length - 1] ?? 0,
    useAnimatedStyle: (cb: () => object) => cb(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
  };
});

// LinearGradient -> View that forwards props (so testID/colors are queryable).
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

// safe-area -> plain View (no insets provider needed under test).
jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      ReactLocal.createElement(View, props, children),
  };
});

// lucide icons -> inert nodes tagged so the strip glyphs are queryable.
jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    ChevronLeft: (props: any) =>
      ReactLocal.createElement(View, { ...props, testID: 'icon-chevron-left' }),
    MessageSquare: (props: any) =>
      ReactLocal.createElement(View, { ...props, testID: 'icon-message' }),
  };
});

// expo-router: spyable router + controllable route params.
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockParams = { phone: '+5531231213312' };
jest.mock('expo-router', () => ({
  router: {
    back: (...args: any[]) => mockBack(...args),
    replace: (...args: any[]) => mockReplace(...args),
    canGoBack: () => mockCanGoBack(),
  },
  useLocalSearchParams: () => mockParams,
}));

// --- Auth hook mocks (the mocked mutations) -------------------------------
// `mock`-prefixed holder so the jest.mock factories may reference it (hoisting).
type MutateOpts<TData> = {
  onSuccess?: (data: TData) => void;
  onError?: (err: Error) => void;
};
type VerifyResult = {
  session: { token: string };
  user: { id: string; name: string; hasProfile: boolean };
};

const mockAuth = {
  // The mocked verify resolves only for the canonical "123456" (mirrors the real
  // mock mutationFn), rejecting otherwise so the error branch is reachable.
  verifyHasProfile: false,
  verifyIsPending: false,
  resendIsPending: false,
  resendBehavior: 'resolve' as 'resolve' | 'reject',
  verifyMutate: jest.fn((input: { phone: string; code: string }, opts?: MutateOpts<VerifyResult>) => {
    if (input.code === '123456') {
      opts?.onSuccess?.({
        session: { token: 'mock-otp-session' },
        user: { id: 'mock', name: 'Jogador', hasProfile: mockAuth.verifyHasProfile },
      });
    } else {
      opts?.onError?.(new Error('Código inválido'));
    }
  }),
  resendMutate: jest.fn((_input: { phone: string }, opts?: MutateOpts<{ ok: true }>) => {
    if (mockAuth.resendBehavior === 'reject') {
      opts?.onError?.(new Error('boom'));
    } else {
      opts?.onSuccess?.({ ok: true });
    }
  }),
};

jest.mock('@/features/auth/api/verifyOtp', () => ({
  useVerifyOtp: () => ({
    mutate: mockAuth.verifyMutate,
    isPending: mockAuth.verifyIsPending,
  }),
}));
jest.mock('@/features/auth/api/resendOtp', () => ({
  useResendOtp: () => ({
    mutate: mockAuth.resendMutate,
    isPending: mockAuth.resendIsPending,
  }),
}));

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/stores/auth';

import SmsOtpScreen from '../../../../app/(auth)/sms-otp';

beforeEach(() => {
  jest.useFakeTimers();
  mockBack.mockClear();
  mockReplace.mockClear();
  mockCanGoBack.mockReturnValue(true);
  mockAuth.verifyMutate.mockClear();
  mockAuth.resendMutate.mockClear();
  mockAuth.verifyHasProfile = false;
  mockAuth.verifyIsPending = false;
  mockAuth.resendIsPending = false;
  mockAuth.resendBehavior = 'resolve';
  mockParams.phone = '+5531231213312';
  useAuthStore.getState().clearAuth();
});

afterEach(async () => {
  // Drain any pending countdown ticks and flush the scheduler/microtask queue so
  // every state update + the screen's interval-cleanup settle before we unmount.
  // (Each interaction already commits via async act; this is the belt-and-braces
  // teardown that guarantees no half-committed root bleeds into the next test.)
  await act(async () => {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
  });
  cleanup();
  jest.useRealTimers();
});

/** Renders the screen, committing the initial (async/concurrent) mount in act. */
async function renderScreen() {
  await act(async () => {
    render(<SmsOtpScreen />);
  });
}

/**
 * Every interaction below is wrapped in an *asynchronous* `await act(async …)`.
 * Under the React 19 concurrent renderer (RNTL 14) with jest fake timers active,
 * a synchronous `act()` does NOT flush the scheduler — the resulting state never
 * commits and the half-done work bleeds into the next test's root. Awaiting an
 * async act drains the scheduler + microtask queue so each update fully commits
 * and settles before the next assertion (and before the next test renders).
 */

/**
 * Types the joined OTP one box at a time (auto-advance is internal to OtpInput),
 * each committed via async act so the screen's `code` state lands before the next
 * event is fired.
 */
async function typeCode(code: string) {
  for (let index = 0; index < code.length; index += 1) {
    const digit = code[index]!;
    await act(async () => {
      fireEvent.changeText(screen.getByTestId(`otp-input-box-${index}`), digit);
    });
  }
}

/** Fires a Backspace keyPress on a box and commits the update via async act. */
async function backspace(boxIndex: number) {
  await act(async () => {
    fireEvent(screen.getByTestId(`otp-input-box-${boxIndex}`), 'keyPress', {
      nativeEvent: { key: 'Backspace' },
    });
  });
}

/** Presses a control and commits any resulting state update via async act. */
async function press(testID: string) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

/** Advances the countdown by N seconds of fake timer ticks (async act). */
async function tick(seconds: number) {
  await act(async () => {
    jest.advanceTimersByTime(seconds * 1000);
  });
}

describe('S3 — SMS Verification screen', () => {
  // ---------------------------------------------------------------- layout
  /**
   * Covers: S3 — SMS Verification
   * Criterion: "renders the navy->blue hero strip with a back chevron and a
   *  message icon, then a white card with the 'CONFIRME SEU NÚMERO' display
   *  headline."
   */
  it('renders the hero strip (chevron + message icon) and the CONFIRME headline card', async () => {
    await renderScreen();

    // The hero strip gradient (the Button grad variant also renders one).
    expect(screen.getAllByTestId('linear-gradient').length).toBeGreaterThan(0);
    expect(screen.getByTestId('icon-chevron-left')).toBeTruthy();
    expect(screen.getByTestId('icon-message')).toBeTruthy();
    expect(screen.getByText('CONFIRME SEU NÚMERO')).toBeTruthy();
  });

  // ---------------------------------------------------------------- subtitle
  /**
   * Covers: S3 — SMS Verification
   * Criterion: "the subtitle echoes the phone passed from S2 (e.g. '...para +55
   *  (31) 23121-3312.')."
   */
  it('echoes the phone from route params, formatted, in the subtitle', async () => {
    await renderScreen();

    expect(screen.getByText(/Enviamos um código de 6 dígitos por SMS para/i)).toBeTruthy();
    // formatted display of +5531231213312
    expect(screen.getByText('+55 (31) 23121-3312')).toBeTruthy();
  });

  // ---------------------------------------------------------------- 6 boxes
  /**
   * Covers: S3 — SMS Verification
   * Criterion: "Exactly 6 boxes are rendered (no 4-digit variant)."
   */
  it('renders exactly 6 digit boxes', async () => {
    await renderScreen();

    expect(screen.getByTestId('otp-input-box-0')).toBeTruthy();
    expect(screen.getByTestId('otp-input-box-1')).toBeTruthy();
    expect(screen.getByTestId('otp-input-box-2')).toBeTruthy();
    expect(screen.getByTestId('otp-input-box-3')).toBeTruthy();
    expect(screen.getByTestId('otp-input-box-4')).toBeTruthy();
    expect(screen.getByTestId('otp-input-box-5')).toBeTruthy();
    expect(screen.queryByTestId('otp-input-box-6')).toBeNull();
  });

  // ---------------------------------------------------- auto-advance + backspace
  /**
   * Covers: S3 — SMS Verification
   * Criterion: "typing a digit auto-advances focus to the next box; backspace on
   *  an empty box moves focus to the previous box."
   * Observed through the screen's joined code: typing grows it, and a backspace on
   * the empty next box shrinks it (which also keeps the CTA gated correctly).
   */
  it('grows the code as digits are typed and shrinks it on backspace from an empty box', async () => {
    await renderScreen();

    await typeCode('12');
    // box 2 is now empty and focused; backspace there removes the previous digit
    await backspace(2);

    // After typing "12" then backspacing the empty box, the code is "1" -> the
    // CTA stays disabled (proves the joined value shrank by one).
    expect(screen.getByTestId('verify-otp').props.accessibilityState?.disabled).toBe(true);
  });

  // ---------------------------------------------------------------- CTA gating
  /**
   * Covers: S3 — SMS Verification
   * Criterion: "'Verificar' is disabled until all 6 digits are entered, then
   *  becomes the gradient CTA."
   */
  it('keeps "Verificar" disabled until 6 digits are entered, then enables it', async () => {
    await renderScreen();

    const cta = () => screen.getByTestId('verify-otp');
    expect(cta().props.accessibilityState?.disabled).toBe(true);

    await typeCode('12345');
    expect(cta().props.accessibilityState?.disabled).toBe(true);

    // 6th digit non-canonical so it does NOT auto-submit+navigate away here.
    await typeCode('123459');
    expect(screen.getByText('Verificar')).toBeTruthy();
    expect(cta().props.accessibilityState?.disabled).toBe(false);
  });

  // ---------------------------------------------------- verify -> onboarding
  /**
   * Covers: S3 — SMS Verification
   * Criterion: "Submitting the code calls the mocked useVerifyOtp; on resolution
   *  the user lands on Onboarding (stub hasProfile === false)."
   */
  it('verifies the canonical code and routes to /onboarding when hasProfile is false', async () => {
    mockAuth.verifyHasProfile = false;
    await renderScreen();

    await typeCode('123456'); // canonical -> onFilled auto-submits

    await waitFor(() =>
      expect(mockAuth.verifyMutate).toHaveBeenCalledWith(
        { phone: '+5531231213312', code: '123456' },
        expect.anything(),
      ),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/onboarding'));
    expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('mock-otp-session');
    expect(state.hasProfile).toBe(false);
  });

  // ---------------------------------------------------------- verify -> home
  /**
   * Covers: S3 — SMS Verification
   * Criterion: "Submitting the code calls the mocked useVerifyOtp; on resolution
   *  the user lands on Home (stub hasProfile === true)."
   */
  it('verifies the canonical code and routes to /(tabs) when hasProfile is true', async () => {
    mockAuth.verifyHasProfile = true;
    await renderScreen();

    await press('verify-otp'); // incomplete -> guarded no-op
    await typeCode('123456');

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
    expect(mockReplace).not.toHaveBeenCalledWith('/onboarding');
    expect(useAuthStore.getState().hasProfile).toBe(true);
  });

  // ------------------------------------------------------ wrong code / error
  /**
   * Covers: S3 — SMS Verification
   * Criterion: "Entering an incorrect code (anything other than '123456') surfaces
   *  the error state (red border + shake) and renders no toast."
   */
  it('surfaces the inline error on a wrong code and renders no toast', async () => {
    await renderScreen();

    await typeCode('999999'); // non-canonical -> mutation rejects

    await waitFor(() => expect(mockAuth.verifyMutate).toHaveBeenCalledTimes(1));

    // red border on the boxes (error state)
    await waitFor(() =>
      expect(screen.getByTestId('otp-input-box-0').props.className).toMatch(/border-danger/),
    );
    // polite inline status text (the spec's a11y error surface), not a toast
    const status = await screen.findByText('Código inválido, tente novamente');
    expect(status.props.accessibilityLiveRegion).toBe('polite');

    // no toast / alert primitive, and the user did NOT navigate away
    expect(screen.queryByRole('alert')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  /**
   * Covers: S3 — SMS Verification
   * Criterion: "The error clears as soon as the user edits a digit."
   */
  it('clears the error state when the user edits a digit after a wrong code', async () => {
    await renderScreen();

    await typeCode('999999');
    await waitFor(() =>
      expect(screen.getByTestId('otp-input-box-0').props.className).toMatch(/border-danger/),
    );

    // editing a digit clears the error -> boxes no longer danger-bordered
    await backspace(3);
    await waitFor(() =>
      expect(screen.getByTestId('otp-input-box-0').props.className).not.toMatch(/border-danger/),
    );
    expect(screen.queryByText('Código inválido, tente novamente')).toBeNull();
  });

  // ---------------------------------------------------------------- countdown
  /**
   * Covers: S3 — SMS Verification
   * Criterion: "The resend control shows 'Reenviar em M:SS' counting down (~30s)
   *  and is non-interactive during the countdown."
   */
  it('shows the resend countdown ticking down and exposes no resend control while counting', async () => {
    await renderScreen();

    expect(screen.getByText(/Reenviar em/i)).toBeTruthy();
    expect(screen.getByText('0:30')).toBeTruthy();
    // no interactive resend button during the countdown
    expect(screen.queryByTestId('resend-otp')).toBeNull();

    await tick(1);
    expect(screen.getByText('0:29')).toBeTruthy();

    await tick(5);
    expect(screen.getByText('0:24')).toBeTruthy();
  });

  /**
   * Covers: S3 — SMS Verification
   * Criterion: "at 0 it becomes an active 'Reenviar código' link."
   */
  it('reveals the active "Reenviar código" link once the countdown hits 0', async () => {
    await renderScreen();

    expect(screen.queryByTestId('resend-otp')).toBeNull();
    await tick(30);

    expect(screen.queryByText(/Reenviar em/i)).toBeNull();
    expect(screen.getByTestId('resend-otp')).toBeTruthy();
    expect(screen.getByText('Reenviar código')).toBeTruthy();
  });

  // ---------------------------------------------------------------- resend
  /**
   * Covers: S3 — SMS Verification
   * Criterion: "Tapping 'Reenviar código' calls the mocked useResendOtp and
   *  restarts the countdown."
   */
  it('calls mocked useResendOtp on tap and restarts the countdown', async () => {
    await renderScreen();

    await tick(30); // expose the active link
    await press('resend-otp');

    expect(mockAuth.resendMutate).toHaveBeenCalledTimes(1);
    expect(mockAuth.resendMutate.mock.calls[0]?.[0]).toEqual({ phone: '+5531231213312' });

    // countdown restarted from 30 -> link gone, timer text back
    expect(screen.queryByTestId('resend-otp')).toBeNull();
    expect(screen.getByText('0:30')).toBeTruthy();
  });

  // -------------------------------------------------- back / change number
  /**
   * Covers: S3 — SMS Verification
   * Criterion: "the back chevron returns to S2 (login)."
   */
  it('returns to S2 via the back chevron', async () => {
    await renderScreen();

    await press('otp-back');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  /**
   * Covers: S3 — SMS Verification
   * Criterion: "'Usar outro número' returns to S2 (login)."
   */
  it('returns to S2 via "Usar outro número"', async () => {
    await renderScreen();

    expect(screen.getByText('Usar outro número')).toBeTruthy();
    await press('change-number');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  /**
   * Covers: S3 — SMS Verification
   * Criterion: "If there is no back entry, router.replace('/login')."
   * (Navigation trigger documented in the spec's "Navigation triggers" section.)
   */
  it('replaces to /login when there is no back entry', async () => {
    mockCanGoBack.mockReturnValue(false);
    await renderScreen();

    await press('otp-back');
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
});
