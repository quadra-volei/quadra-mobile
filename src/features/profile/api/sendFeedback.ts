import { useMutation } from '@tanstack/react-query';

import type { FeedbackInput } from '@/features/profile/schema/feedback';

export type SendFeedbackResult = {
  /** Server-assigned id of the stored feedback entry (stubbed in the mock). */
  id: string;
};

// MOCK: deterministic fake latency so RNTL can assert the CTA loading state and
// the success branch without flakiness. No randomness, no network, no
// EXPO_PUBLIC_API_URL. Mirrors src/features/profile/api/updateProfile.ts.
const MOCK_LATENCY_MS = 600;

/**
 * Submits the user's feedback (type + message) from the validated input.
 *
 * MOCK: this iteration ships fully mocked. The mutationFn simulates ~600ms
 * latency and resolves a stub `{ id }`. No network call, no backend path is
 * asserted.
 *
 * TODO(real-api): replace the mock body below with the real `POST /api/v1/feedback`
 * call behind this unchanged hook signature, once the backend feedback module
 * lands. Keep the shape; swap only the body.
 */
async function sendFeedback(input: FeedbackInput): Promise<SendFeedbackResult> {
  // MOCK: fixed-latency resolve, no network. `input` is echoed nowhere — the
  // real endpoint will consume it.
  void input;
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  return { id: 'mock-feedback' };
}

export function useSendFeedback() {
  return useMutation<SendFeedbackResult, Error, FeedbackInput>({
    mutationFn: sendFeedback,
  });
}
