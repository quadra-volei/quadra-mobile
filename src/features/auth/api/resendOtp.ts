import { useMutation } from '@tanstack/react-query';

export type ResendOtpInput = {
  /** Full phone number in E.164 form, e.g. "+5511999999999". */
  phone: string;
};

export type ResendOtpResult = {
  ok: true;
};

// MOCK: deterministic fake latency so RNTL can assert the resend flow without
// flakiness. Tests may shorten/zero this. No randomness, no network, no
// EXPO_PUBLIC_API_URL.
const MOCK_LATENCY_MS = 600;

/**
 * Resends the SMS OTP for the given phone number.
 *
 * MOCK: this iteration ships fully mocked auth. The mutationFn simulates ~600ms
 * latency and resolves `{ ok: true }` without any network call or backend path.
 * Kept as its own hook (rather than aliasing `requestOtp`) so the real resend
 * endpoint can differ from the initial request later.
 *
 * TODO(real-api): replace the mock body below with the real FA.3 resend call
 * behind this unchanged hook signature.
 */
async function resendOtp(_input: ResendOtpInput): Promise<ResendOtpResult> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  return { ok: true };
}

export function useResendOtp() {
  return useMutation<ResendOtpResult, Error, ResendOtpInput>({
    mutationFn: resendOtp,
  });
}
