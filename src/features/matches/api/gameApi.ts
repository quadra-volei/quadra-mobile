import {
  type ApiMatchDetail,
  type ApiPlayer,
  MATCHES_PATH,
} from '@/features/matches/api/matchesApi';
import type {
  PlayerPosition,
  PresencePlayer,
} from '@/features/matches/types/matchDetail';
import type { Team } from '@/features/matches/types/team';
import { ApiError } from '@/lib/api/client';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

/**
 * Backend InGame module (F1.3 teams, F1.4 scoreboard, F1.5 MVP) and the match
 * summary (F1.6): transport, payload types and the mapping to the app's models.
 */

export type ApiTeam = {
  id: string;
  name: string;
  members: { playerId: string; isGuest: boolean }[];
};

export type ApiScoreboardSet = {
  setNumber: number;
  teamAPoints: number;
  teamBPoints: number;
  status: 'InProgress' | 'Finished';
  isDecidingSet: boolean;
  winnerTeamId: string | null;
  startedAt: string;
  teamAId: string;
  teamBId: string;
  canUndo: boolean;
};

export type ApiScoreboard = {
  matchId: string;
  format: 'BestOf3' | 'BestOf5';
  state: 'NotStarted' | 'InProgress' | 'Ended';
  /** The pair on court (of the current set when teams rotate). */
  teamAId: string;
  teamBId: string;
  teamASetsWon: number;
  teamBSetsWon: number;
  currentSetNumber: number;
  winnerTeamId: string | null;
  sets: ApiScoreboardSet[];
  /** More than two teams: the organizer picks who plays each set. */
  rotatesTeams: boolean;
  /** In progress with no open set: waiting for the next pair. */
  awaitingNextSet: boolean;
};

export type ApiMvpVoting = {
  state: 'Open' | 'Closed';
  totalVotes: number;
  callerHasVoted: boolean;
  mvpPlayerId: string | null;
  mvpVoteCount: number | null;
  /** Empty while the voting is open. */
  results: { playerId: string; votes: number }[];
};

export type ApiMatchSummary = {
  format: 'BestOf3' | 'BestOf5';
  teamAId: string;
  teamBId: string;
  teamASetsWon: number;
  teamBSetsWon: number;
  winnerTeamId: string | null;
  endedAt: string;
  mvpPlayerId: string | null;
  mvpVoteCount: number | null;
  mvpTotalVotes: number;
  sets: { setNumber: number; teamAPoints: number; teamBPoints: number }[];
  teams: { teamId: string; name: string; playerIds: string[] }[];
};

const POSITIONS: readonly string[] = ['LEV', 'PON', 'OPO', 'CEN', 'LIB', 'COR'];

const gamePath = (matchId: string, rest: string) => `${MATCHES_PATH}/${matchId}/${rest}`;

/** A GET that answers 404 when the thing does not exist yet → null. */
async function getOrNull<T>(path: string): Promise<T | null> {
  try {
    return await authorizedApiClient<T>(path);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

function send<T>(method: 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
  return authorizedApiClient<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// ── teams ───────────────────────────────────────────────────────────────────

export async function fetchTeams(matchId: string): Promise<ApiTeam[]> {
  const response = await getOrNull<{ teams: ApiTeam[] }>(gamePath(matchId, 'teams'));
  return response?.teams ?? [];
}

export async function postDraft(
  matchId: string,
  options: { teamCount: number; perTeam: number; mode: 'Balanced' | 'Random' },
): Promise<ApiTeam[]> {
  const { teams } = await send<{ teams: ApiTeam[] }>(
    'POST',
    gamePath(matchId, 'teams/draft'),
    options,
  );
  return teams;
}

/**
 * Backend teams → the app's `Team`, in the backend's order ("Team A" first):
 * numbered from 1, named "Time N", with each member resolved against the match
 * roster (`players`, which includes the guests).
 */
export function toTeams(apiTeams: ApiTeam[], players: PresencePlayer[]): Team[] {
  const byId = new Map(players.map((player) => [player.id, player]));
  return apiTeams.map((team, index) => ({
    id: team.id,
    number: index + 1,
    name: `Time ${index + 1}`,
    players: team.members.map(
      (member) =>
        byId.get(member.playerId) ?? {
          id: member.playerId,
          name: member.isGuest ? 'Convidado' : 'Jogador',
          status: 'CONFIRMADO' as const,
          isGuest: member.isGuest || undefined,
        },
    ),
  }));
}

// ── scoreboard ──────────────────────────────────────────────────────────────

export function fetchScoreboard(matchId: string): Promise<ApiScoreboard | null> {
  return getOrNull<ApiScoreboard>(gamePath(matchId, 'scoreboard'));
}

/** Creates the scoreboard with the pair of the first set and starts the game. */
export async function postStartGame(
  matchId: string,
  teamAId: string,
  teamBId: string,
): Promise<ApiScoreboard> {
  await send('POST', gamePath(matchId, 'scoreboard'), {
    format: 'BestOf3',
    teamAId,
    teamBId,
  });
  return send<ApiScoreboard>('POST', gamePath(matchId, 'scoreboard/start'));
}

export function postNextSet(
  matchId: string,
  teamAId: string,
  teamBId: string,
): Promise<ApiScoreboard> {
  return send<ApiScoreboard>('POST', gamePath(matchId, 'scoreboard/sets'), { teamAId, teamBId });
}

export function postPoint(
  matchId: string,
  setNumber: number,
  teamId: string,
): Promise<ApiScoreboard> {
  return send<ApiScoreboard>(
    'POST',
    gamePath(matchId, `scoreboard/sets/${setNumber}/points`),
    { teamId },
  );
}

export function deleteLastPoint(matchId: string, setNumber: number): Promise<ApiScoreboard> {
  return send<ApiScoreboard>(
    'DELETE',
    gamePath(matchId, `scoreboard/sets/${setNumber}/points/last`),
  );
}

export function postEndSet(matchId: string, setNumber: number): Promise<ApiScoreboard> {
  return send<ApiScoreboard>('POST', gamePath(matchId, `scoreboard/sets/${setNumber}/end`));
}

export function postEndGame(matchId: string): Promise<ApiScoreboard> {
  return send<ApiScoreboard>('POST', gamePath(matchId, 'scoreboard/end'));
}

// ── MVP + summary ───────────────────────────────────────────────────────────

export function fetchMvpVoting(matchId: string): Promise<ApiMvpVoting | null> {
  return getOrNull<ApiMvpVoting>(gamePath(matchId, 'mvp-voting'));
}

export function postMvpVote(matchId: string, votedPlayerId: string): Promise<unknown> {
  return send('POST', gamePath(matchId, 'mvp-voting/votes'), { votedPlayerId });
}

export function fetchMatchSummary(matchId: string): Promise<ApiMatchSummary | null> {
  return getOrNull<ApiMatchSummary>(gamePath(matchId, 'summary'));
}

/**
 * Closes the MVP voting and generates the summary (organizer). Each step is
 * skipped when it was already done (409), so a retry after a half-finished
 * attempt works.
 */
export async function postFinishMatch(matchId: string): Promise<void> {
  for (const step of ['mvp-voting/close', 'summary']) {
    try {
      await send('POST', gamePath(matchId, step));
    } catch (error) {
      // 409: already closed / already generated. 404 on close: no voting to close.
      const alreadyDone =
        error instanceof ApiError &&
        (error.status === 409 || (error.status === 404 && step !== 'summary'));
      if (!alreadyDone) {
        throw error;
      }
    }
  }
}

// ── people ──────────────────────────────────────────────────────────────────

/** A player of the match as the MVP and summary screens list them. */
export type GamePlayer = {
  id: string;
  name: string;
  handle: string;
  position: PlayerPosition;
  avatarUrl?: string;
};

function toGamePlayer(player: ApiPlayer): GamePlayer {
  return {
    id: player.userId,
    name: player.displayName,
    handle: player.handle ?? '',
    position:
      player.position && POSITIONS.includes(player.position)
        ? (player.position as PlayerPosition)
        : 'COR',
    avatarUrl: player.photoUrl ?? undefined,
  };
}

/** Everyone with an account on the match roster, by id. */
export function gamePlayersById(detail: ApiMatchDetail): Map<string, GamePlayer> {
  return new Map(
    [detail.organizer, ...detail.players.map((entry) => entry.player)].map((player) => [
      player.userId,
      toGamePlayer(player),
    ]),
  );
}
