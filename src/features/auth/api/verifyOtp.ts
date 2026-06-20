import { useMutation } from '@tanstack/react-query';

export type VerifyOtpInput = {
  /** Full phone number in E.164 form, e.g. "+5511999999999". */
  phone: string;
  /** The 4-digit code entered by the user. */
  code: string;
};

export type VerifyOtpSession = {
  token: string;
};

export type VerifyOtpUser = {
  id: string;
  name: string;
  /** Whether the user already completed onboarding. Drives Onboarding vs Home. */
  hasProfile: boolean;
};

export type VerifyOtpResult = {
  session: VerifyOtpSession;
  user: VerifyOtpUser;
};

// MOCK: deterministic fake latency so RNTL can assert both the success and the
// error branch without flakiness. Tests may shorten/zero this. No randomness,
// no network, no EXPO_PUBLIC_API_URL.
const MOCK_LATENCY_MS = 600;

// MOCK: the single canonical code that resolves the happy path. Any other
// 4-digit code rejects so the error state (shake + red border) is reachable.
const MOCK_CANONICAL_CODE = '1234';

/**
 * Verifies the SMS OTP for the given phone number.
 *
 * MOCK: this iteration ships fully mocked auth. The mutationFn simulates ~600ms
 * latency and resolves a stub session/user only when `code === '1234'`;
 * otherwise it rejects with `new Error('Código inválido')`. No network call,
 * no Cognito, no backend path. The stub mirrors the shape returned by the
 * mocked `googleSignIn` so the success branch reuses the same `setAuth` +
 * Onboarding/Home routing.
 *
 * TODO(real-api): replace the mock body below with the real FA.3 verify call
 * behind this unchanged hook signature. The real `hasProfile` will come from
 * the backend profile lookup, and the real token will persist to
 * expo-secure-store (never AsyncStorage).
 */
async function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  if (input.code !== MOCK_CANONICAL_CODE) {
    // MOCK: any non-canonical code rejects so the inline error state is reachable.
    throw new Error('Código inválido');
  }
  return {
    session: { token: 'mock-otp-session' },
    user: { id: 'mock', name: 'Jogador', hasProfile: false },
  };
}

export function useVerifyOtp() {
  return useMutation<VerifyOtpResult, Error, VerifyOtpInput>({
    mutationFn: verifyOtp,
  });
}
