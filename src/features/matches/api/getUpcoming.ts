import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { UpcomingMatch } from '@/features/matches/types/match';
import { useCreatedMatchesStore } from '@/stores/createdMatchesStore';

// MOCK: deterministic fake latency so RNTL can assert the loading placeholder,
// the populated list, and navigation without flakiness. Tests may zero this via
// the param. No randomness, no network, no EXPO_PUBLIC_API_URL.
// Mirrors src/features/auth/api/requestOtp.ts / profile/api/createProfile.ts.
const MOCK_LATENCY_MS = 400;

/** Query key (ARCHITECTURE convention). */
export const upcomingMatchesQueryKey = ['matches', 'upcoming'] as const;

// MOCK: fixed stub list of the current user's confirmed/upcoming matches.
// TODO(real-api): the real F1.1/F1.6 payload (user's next matches) replaces this.
const MOCK_UPCOMING: UpcomingMatch[] = [
  {
    id: 'up-1',
    name: 'Vôlei de Quinta',
    startsAt: '2026-06-20T19:30:00-03:00',
    category: 'CASUAL',
    openSlots: 2,
    priceLabel: 'R$ 15',
    avatarUrls: [
      'https://i.pravatar.cc/100?img=11',
      'https://i.pravatar.cc/100?img=12',
      'https://i.pravatar.cc/100?img=13',
      'https://i.pravatar.cc/100?img=14',
    ],
  },
  {
    id: 'up-2',
    name: 'Racha da Galera',
    startsAt: '2026-06-21T20:00:00-03:00',
    category: 'COMPETITIVO',
    openSlots: 4,
    priceLabel: 'Grátis',
    avatarUrls: [
      'https://i.pravatar.cc/100?img=21',
      'https://i.pravatar.cc/100?img=22',
    ],
  },
];

/**
 * Fetches the current user's upcoming matches.
 *
 * MOCK: this iteration ships fully mocked. The queryFn simulates ~400ms latency
 * and resolves a fixed stub list with no network call or backend path.
 *
 * TODO(real-api): replace the mock body below with the real F1.1/F1.6 list call
 * (the user's next matches) behind this unchanged hook signature, once the
 * backend match module lands. See S5 spec "Backend dependencies".
 */
async function getUpcomingMatches(latencyMs: number): Promise<UpcomingMatch[]> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  // MOCK: fixed stub array.
  return MOCK_UPCOMING;
}

export type UseUpcomingMatchesOptions = {
  /** Override the mock latency (tests pass 0 to remove the fake delay). */
  latencyMs?: number;
};

export function useUpcomingMatches(options: UseUpcomingMatchesOptions = {}) {
  const latencyMs = options.latencyMs ?? MOCK_LATENCY_MS;
  const createdMatches = useCreatedMatchesStore((state) => state.createdMatches);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: upcomingMatchesQueryKey,
    queryFn: async () => {
      const mockData = await getUpcomingMatches(latencyMs);
      // Combine mock data with user-created matches
      return [...createdMatches, ...mockData];
    },
  });

  // Update cache whenever createdMatches changes
  useEffect(() => {
    if (createdMatches.length > 0) {
      queryClient.setQueryData(upcomingMatchesQueryKey, (oldData: UpcomingMatch[] | undefined) => {
        if (!oldData) return [...createdMatches, ...MOCK_UPCOMING];
        // Remove old created matches and add new ones
        const nonCreatedMatches = oldData.filter(
          (m) => !createdMatches.find((cm) => cm.id === m.id)
        );
        return [...createdMatches, ...nonCreatedMatches];
      });
    }
  }, [createdMatches, queryClient]);

  return query;
}
