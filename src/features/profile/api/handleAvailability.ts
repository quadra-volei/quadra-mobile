import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { authorizedApiClient } from '@/lib/api/authorizedClient';

const DEBOUNCE_MS = 400;
const MIN_LENGTH = 3;

/** Shown under the @ field as soon as the backend says someone else has it. */
export const HANDLE_TAKEN_MESSAGE = 'Esse @ já está em uso. Escolha outro.';

/**
 * Whether the typed @ already belongs to someone else
 * (`GET /api/v1/profiles/handle-availability`), checked a moment after the
 * user stops typing. The user's own current @ counts as free. It is only a
 * hint: anything the check cannot answer (too short, invalid, offline) is
 * treated as "not known to be taken", and saving still validates for real.
 */
export function useHandleTaken(handle: string | undefined): boolean {
  const typed = (handle ?? '').trim().replace(/^@/, '').toLowerCase();
  const [settled, setSettled] = useState(typed);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(typed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  const { data } = useQuery({
    queryKey: ['profile', 'handle-availability', settled] as const,
    queryFn: () =>
      authorizedApiClient<{ available: boolean }>(
        `/api/v1/profiles/handle-availability?handle=${encodeURIComponent(settled)}`,
      ),
    enabled: settled.length >= MIN_LENGTH,
    staleTime: 30_000,
    retry: false,
  });

  // Only speak for the text currently in the field.
  return settled === typed && data?.available === false;
}
