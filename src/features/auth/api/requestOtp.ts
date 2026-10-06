import { useMutation } from '@tanstack/react-query';

export type RequestOtpInput = {
  /** Full phone number in E.164 form, e.g. "+5511999999999". */
  phone: string;
};

export type RequestOtpResult = {
  ok: true;
};

// MOCK: deterministic fake latency so RNTL can assert navigation without flakiness.
// Tests may shorten/zero this. No randomness, no network, no EXPO_PUBLIC_API_URL.
const MOCK_LATENCY_MS = 600;

/**
 * Requests an SMS OTP for the given phone number.
 *
 * MOCK: this iteration ships fully mocked auth. The mutationFn simulates ~600ms
 * latency and resolves `{ ok: true }` without any network call or backend path.
 *
 * TODO(real-api): replace the mock body below with the real FA.3 OTP request
 * (POST to the backend OTP endpoint) behind this unchanged hook signature.
 */
async function requestOtp(_input: RequestOtpInput): Promise<RequestOtpResult> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  return { ok: true };
}

export function useRequestOtp() {
  return useMutation<RequestOtpResult, Error, RequestOtpInput>({
    mutationFn: requestOtp,
  });
}
