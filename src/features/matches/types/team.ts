// Team assignment types for S13 In-Game Teams. These are final payload shapes
// consumed by the draw/assign hooks. Only the transport is mocked.

import type { PresencePlayer } from '@/features/matches/types/matchDetail';

/**
 * A single team roster for the in-game team assignment flow (S13).
 * Carries the team id, optional name, a sequential number, and the roster.
 */
export type Team = {
  id: string;
  name?: string;
  number: number;
  players: PresencePlayer[];
};

/**
 * Request shape for the draw-teams operation (F1.3).
 */
export type DrawTeamsRequest = {
  teamCount: 2 | 3 | 4;
  perTeam: number;
  drawMode: 'MANUAL' | 'AUTO';
};

/**
 * Response shape for the draw-teams operation (F1.3).
 */
export type DrawTeamsResponse = {
  teams: Team[];
};

/**
 * Request shape for the assign-team operation (F1.3, drag-based swaps).
 */
export type AssignTeamRequest = {
  assignments: Array<{
    playerId: string;
    teamId: string;
  }>;
};

/**
 * Response shape for the assign-team operation (F1.3).
 */
export type AssignTeamResponse = {
  teams: Team[];
};
