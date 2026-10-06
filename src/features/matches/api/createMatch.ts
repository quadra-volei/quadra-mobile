import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateMatchInput } from '@/features/matches/schema/createMatch';

/**
 * Payload sent to the create-match mutation: the validated form input plus the
 * optional local cover image URI (set by the picker, not a validated field).
 */
export type CreateMatchPayload = CreateMatchInput & {
  /** Local URI of the picked cover image (optional). */
  coverUri?: string;
};

export type CreateMatchResult = {
  match: { id: string };
};

// MOCK: deterministic fake latency so RNTL can assert the loading spinner and
// the success branch without flakiness. No randomness, no network, no
// EXPO_PUBLIC_API_URL. Mirrors src/features/profile/api/createProfile.ts.
const MOCK_LATENCY_MS = 600;

/**
 * Creates a match from the validated create-match input.
 *
 * MOCK: this iteration ships fully mocked match creation. The mutationFn
 * simulates ~600ms latency and always resolves a stub `{ match: { id } }`
 * echoing a generated id. No network call, no backend path is asserted.
 *
 * TODO(real-api): replace the mock body below with the real F1.1 create-match
 * call behind this unchanged hook signature. The real call is BLOCKED only by
 * the unresolved structured-venue/geo question (the free-text LOCAL field cannot
 * supply it) — `type` + `confirmationOpensHoursBefore` are resolved and ship in
 * the final payload shape. Do not wire until the backend SCOPE is aligned.
 */
async function createMatch(
  _payload: CreateMatchPayload,
): Promise<CreateMatchResult> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  // MOCK: stub match echoing a generated id. Must start with 'mine-' to be
  // recognized as an organizer match in getMatchDetail.
  return { match: { id: `mine-${Date.now()}` } };
}

export function useCreateMatch() {
  const queryClient = useQueryClient();
  return useMutation<CreateMatchResult, Error, CreateMatchPayload>({
    mutationFn: createMatch,
    onSuccess: () => {
      // Refresh S5 Home's upcoming/nearby lists so the new match appears.
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
