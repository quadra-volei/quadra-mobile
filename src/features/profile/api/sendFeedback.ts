import { useMutation } from '@tanstack/react-query';

import type { FeedbackInput } from '@/features/profile/schema/feedback';

export type SendFeedbackResult = {
  /** Id of the stored feedback entry (a fixed stub while there is no backend). */
  id: string;
};

/**
 * ⚠️ THE ONLY MOCKED CALL LEFT IN THE APP.
 *
 * The backend has no feedback endpoint, so this does NOT send anything: it
 * waits a moment and reports success. Whatever the user types is discarded.
 *
 * TODO(real-api): when the backend gains `POST /api/v1/feedback`, replace the
 * body below with that call (via `authorizedApiClient`). The hook signature
 * stays the same.
 */
async function sendFeedback(_input: FeedbackInput): Promise<SendFeedbackResult> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return { id: 'mock-feedback' };
}

export function useSendFeedback() {
  return useMutation<SendFeedbackResult, Error, FeedbackInput>({
    mutationFn: sendFeedback,
  });
}
