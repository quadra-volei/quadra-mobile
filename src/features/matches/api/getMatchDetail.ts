import { useQuery } from '@tanstack/react-query';

import { buildMatchDetail } from '@/features/matches/lib/buildMatchDetail';
import type { MatchDetail } from '@/features/matches/types/matchDetail';
import { useCreatedMatchesStore } from '@/stores/createdMatchesStore';

// MOCK: deterministic fake latency so RNTL can assert the loading skeleton, the
// populated screen, and navigation without flakiness. Tests may zero this via
// the options param. No randomness, no network, no EXPO_PUBLIC_API_URL.
// Mirrors src/features/matches/api/getNearby.ts / createMatch.ts.
const MOCK_LATENCY_MS = 400;

/** Query key (ARCHITECTURE convention): ['matches', id, 'detail']. */
export const matchDetailQueryKey = (id: string) =>
  ['matches', id, 'detail'] as const;

// MOCK: a fixed "organizer" user id used by the organizer fixture below. Tests
// set `useAuthStore.userId` to this value to render the organizer variant, or to
// anything else to render the participant variant (isOrganizer is computed in
// the screen as `match.organizerId === userId`).
export const MOCK_ORGANIZER_USER_ID = 'user-organizer';

// MOCK: deterministic ISO timestamps anchored to a fixed clock so the countdown
// formatter is reproducible under test. The participant fixture's confirmation
// window is OPEN (closes in the future, before start); the organizer fixture's
// is CLOSED.
const MOCK_NOW = '2026-06-23T18:00:00.000Z';
const MOCK_PARTICIPANT_CLOSES_AT = '2026-06-23T19:30:00.000Z'; // window open
const MOCK_PARTICIPANT_STARTS_AT = '2026-06-23T22:00:00.000Z';
const MOCK_ORGANIZER_CLOSES_AT = '2026-06-23T17:00:00.000Z'; // window closed
const MOCK_ORGANIZER_STARTS_AT = '2026-06-23T22:00:00.000Z';

/** Exposed so the screen/tests can inject the same fixed "now" deterministically. */
export const MOCK_MATCH_DETAIL_NOW = MOCK_NOW;

// MOCK: participant-view fixture (Regular participant, window OPEN, 6/12 filled).
// TODO(real-api): the real F1.2 match-detail payload replaces this stub.
const MOCK_PARTICIPANT_MATCH: MatchDetail = {
  id: 'near-1',
  name: 'Racha de Domingo',
  format: '6X6',
  level: 'INTERMEDIARIO',
  venue: 'Arena Quadra',
  distanceKm: 1.2,
  priceLabel: 'R$ 25',
  capacity: 12,
  startsAt: MOCK_PARTICIPANT_STARTS_AT,
  confirmationClosesAt: MOCK_PARTICIPANT_CLOSES_AT,
  confirmationWindowClosed: false,
  organizerId: 'user-erica',
  organizer: { id: 'user-erica', name: 'Érica Moraes', position: 'CEN' },
  players: [
    { id: 'p1', name: 'Renan', status: 'CONFIRMADO', position: 'LEV' },
    { id: 'p2', name: 'Bia', status: 'CONFIRMADO', position: 'PON' },
    { id: 'p3', name: 'Caio', status: 'CONFIRMADO', position: 'OPO' },
    { id: 'p4', name: 'Duda', status: 'CONFIRMADO', position: 'LIB' },
    { id: 'p5', name: 'Manu', status: 'CONFIRMADO', position: 'CEN' },
    { id: 'p6', name: 'Vini', status: 'CONFIRMADO', position: 'COR' },
  ],
  openDropInSlots: 6,
  myParticipationType: 'REGULAR',
  myStatus: 'PENDENTE',
  teamConfig: { teamCount: 2, perTeam: 6, drawMode: 'MANUAL' },
};

// MOCK: organizer-view fixture (current user organizes; window CLOSED, 8 confirmed).
// TODO(real-api): the real F1.2 match-detail payload replaces this stub.
const MOCK_ORGANIZER_MATCH: MatchDetail = {
  id: 'mine-1',
  name: 'Sua partida',
  format: '6X6',
  level: 'INTERMEDIARIO',
  venue: 'Arena Sky Beach',
  distanceKm: 1.2,
  priceLabel: 'R$ 25',
  capacity: 12,
  startsAt: MOCK_ORGANIZER_STARTS_AT,
  confirmationClosesAt: MOCK_ORGANIZER_CLOSES_AT,
  confirmationWindowClosed: true,
  organizerId: MOCK_ORGANIZER_USER_ID,
  organizer: { id: MOCK_ORGANIZER_USER_ID, name: 'Você', position: 'LEV' },
  players: [
    { id: 'o1', name: 'Renan', status: 'CONFIRMADO', position: 'LEV' },
    { id: 'o2', name: 'Érica', status: 'CONFIRMADO', position: 'CEN' },
    { id: 'o3', name: 'Caio', status: 'CONFIRMADO', position: 'OPO' },
    { id: 'o4', name: 'Duda', status: 'CONFIRMADO', position: 'LIB' },
    { id: 'o5', name: 'Manu', status: 'CONFIRMADO', position: 'PON' },
    { id: 'o6', name: 'Theo', status: 'CONFIRMADO', position: 'OPO' },
    { id: 'o7', name: 'Bia', status: 'CONFIRMADO', position: 'PON' },
    { id: 'o8', name: 'Vini', status: 'CONFIRMADO', position: 'COR' },
  ],
  openDropInSlots: 4,
  myParticipationType: null,
  myStatus: null,
  teamConfig: { teamCount: 2, perTeam: 4, drawMode: 'MANUAL' },
};

/**
 * Reads a single match's full detail (F1.2).
 *
 * MOCK: this iteration ships fully mocked. The queryFn simulates ~400ms latency
 * and resolves a fixed fixture chosen by `id` (the `mine-*` id resolves the
 * organizer fixture, anything else the participant fixture) with no network call
 * or backend path. The payload shape is final.
 *
 * TODO(real-api): replace the mock body below with the real F1.2 match-detail
 * call behind this unchanged hook signature, once the backend match module
 * lands. See S12 spec "Backend dependencies".
 */
async function getMatchDetail(
  id: string,
  latencyMs: number,
): Promise<MatchDetail> {
  // MOCK: fixed-latency resolve, no network.
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  // A match the user created this session resolves from the in-memory store so
  // the detail screen shows the REAL entered data (not a fixture). Read a live
  // snapshot (non-reactive) at fetch time.
  const created = useCreatedMatchesStore.getState().getCreatedMatch(id);
  if (created) {
    return buildMatchDetail(created);
  }
  // MOCK: pick a fixture by id; echo the requested id so navigation params line up.
  const base = id.startsWith('mine')
    ? MOCK_ORGANIZER_MATCH
    : MOCK_PARTICIPANT_MATCH;
  return { ...base, id };
}

export type UseMatchDetailOptions = {
  /** Override the mock latency (tests pass 0 to remove the fake delay). */
  latencyMs?: number;
};

export function useMatchDetail(
  id: string,
  options: UseMatchDetailOptions = {},
) {
  const latencyMs = options.latencyMs ?? MOCK_LATENCY_MS;
  return useQuery({
    queryKey: matchDetailQueryKey(id),
    queryFn: () => getMatchDetail(id, latencyMs),
    staleTime: 60_000,
  });
}
