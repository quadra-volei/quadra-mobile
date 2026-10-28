import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type ApiScoreboard,
  deleteLastPoint,
  fetchScoreboard,
  fetchTeams,
  postEndGame,
  postEndSet,
  postNextSet,
  postPoint,
  postStartFreeGame,
  postStartGame,
  toTeams,
} from '@/features/matches/api/gameApi';
import { matchDetailQueryKey } from '@/features/matches/api/getMatchDetail';
import { upcomingMatchesQueryKey } from '@/features/matches/api/getUpcoming';
import {
  fetchMatchDetail,
  MATCHES_PATH,
  toMatchDetail,
  toMatchError,
} from '@/features/matches/api/matchesApi';
import type { Team } from '@/features/matches/types/team';
import { authorizedApiClient } from '@/lib/api/authorizedClient';
import { useAuthStore } from '@/stores/auth';

/** Query key of the live game of a match (teams + scoreboard). */
export const liveGameQueryKey = (matchId: string) =>
  ['matches', matchId, 'game'] as const;

/** What the server knows about the game; the screen model is derived from it. */
export type LiveGameData = {
  matchName: string;
  isOrganizer: boolean;
  teams: Team[];
  scoreboard: ApiScoreboard | null;
  /** The match's game points, shown before the scoreboard exists. */
  gamePoints?: number | null;
  /** The match has no fixed teams (API DECISIONS #86). */
  freeTeams?: boolean;
};

/**
 * Where the game is:
 * - NOT_STARTED — teams may exist, but no set was opened yet;
 * - PLAYING — a set is on court;
 * - PICK_NEXT — (3+ teams) the last set ended and the organizer picks who plays next;
 * - ENDED — a team won, or the organizer ended the game.
 */
export type GamePhase = 'NOT_STARTED' | 'PLAYING' | 'PICK_NEXT' | 'ENDED';

export type LiveGame = {
  matchName: string;
  isOrganizer: boolean;
  /**
   * No fixed teams: no pair, no score — PLAYING from start until the organizer
   * ends it (API DECISIONS #86).
   */
  free: boolean;
  /** ISO start of the whole game (the free game's clock). */
  startedAt: string | null;
  teams: Team[];
  phase: GamePhase;
  /** Best of 3 or 5 on games from before the single game; null for a single game. */
  bestOf: 3 | 5 | null;
  /** Points that win a single game (API DECISIONS #72); null on best-of games. */
  pointsToWin: number | null;
  /** The set on court, or the next one to open. */
  setNumber: number;
  /** The two teams on court (PLAYING), else null. */
  pair: [Team, Team] | null;
  /** Points of `pair` in the current set. */
  scores: [number, number];
  /** Sets won so far, by team id. */
  setsWon: Record<string, number>;
  canUndo: boolean;
  /** ISO start of the set on court (drives the clock). */
  setStartedAt: string | null;
  /** Winner of the last finished set — the team that "stays on court". */
  lastSetWinnerId: string | null;
  winnerTeamId: string | null;
};

export function toLiveGame(data: LiveGameData): LiveGame {
  const { scoreboard, teams } = data;
  const base = {
    matchName: data.matchName,
    isOrganizer: data.isOrganizer,
    free: scoreboard ? scoreboard.format === 'Free' : data.freeTeams === true,
    startedAt: scoreboard?.startedAt ?? null,
    teams,
    bestOf: scoreboard?.format === 'BestOf5' ? (5 as const) : scoreboard?.format === 'BestOf3' ? (3 as const) : null,
    pointsToWin: scoreboard?.format === 'BestOf3' || scoreboard?.format === 'BestOf5' ? null : (scoreboard?.pointsToWin ?? data.gamePoints ?? 25),
    scores: [0, 0] as [number, number],
    setsWon: {} as Record<string, number>,
    canUndo: false,
    setStartedAt: null,
    lastSetWinnerId: null,
    winnerTeamId: null,
    pair: null,
  };
  if (!scoreboard || scoreboard.state === 'NotStarted') {
    return { ...base, phase: 'NOT_STARTED', setNumber: 1 };
  }

  const finished = scoreboard.sets.filter((set) => set.status === 'Finished');
  const setsWon: Record<string, number> = {};
  for (const set of finished) {
    if (set.winnerTeamId) {
      setsWon[set.winnerTeamId] = (setsWon[set.winnerTeamId] ?? 0) + 1;
    }
  }
  const lastSetWinnerId = finished[finished.length - 1]?.winnerTeamId ?? null;
  const shared = { ...base, setsWon, lastSetWinnerId, winnerTeamId: scoreboard.winnerTeamId };

  if (scoreboard.state === 'Ended') {
    return { ...shared, phase: 'ENDED', setNumber: scoreboard.currentSetNumber };
  }
  if (scoreboard.format === 'Free') {
    return { ...shared, phase: 'PLAYING', setNumber: 0 };
  }
  if (scoreboard.awaitingNextSet) {
    return { ...shared, phase: 'PICK_NEXT', setNumber: scoreboard.currentSetNumber + 1 };
  }

  const current = scoreboard.sets.find((set) => set.setNumber === scoreboard.currentSetNumber);
  const teamA = teams.find((team) => team.id === (current?.teamAId ?? scoreboard.teamAId));
  const teamB = teams.find((team) => team.id === (current?.teamBId ?? scoreboard.teamBId));
  return {
    ...shared,
    phase: 'PLAYING',
    setNumber: scoreboard.currentSetNumber,
    pair: teamA && teamB ? [teamA, teamB] : null,
    scores: [current?.teamAPoints ?? 0, current?.teamBPoints ?? 0],
    canUndo: current?.canUndo ?? false,
    setStartedAt: current?.startedAt ?? null,
  };
}

async function loadLiveGame(matchId: string): Promise<LiveGameData> {
  const [detail, apiTeams, scoreboard] = await Promise.all([
    fetchMatchDetail(matchId),
    fetchTeams(matchId),
    fetchScoreboard(matchId),
  ]);
  const userId = useAuthStore.getState().userId;
  const match = toMatchDetail(detail, userId);
  return {
    matchName: match.name,
    isOrganizer: match.organizerId === userId,
    teams: toTeams(apiTeams, match.players),
    scoreboard,
    gamePoints: detail.match.gamePoints ?? null,
    freeTeams: detail.match.freeTeams ?? false,
  };
}

/**
 * The live game of a match: its teams and the scoreboard, as one screen model.
 * Kept fresh by `useScoreSubscription` (SignalR) and by the mutations below,
 * which write the scoreboard the server answers with straight into the cache.
 */
export function useLiveGame(matchId: string) {
  return useQuery({
    queryKey: liveGameQueryKey(matchId),
    queryFn: () => loadLiveGame(matchId),
    select: toLiveGame,
    enabled: matchId.length > 0,
  });
}

const GAME_ERRORS = {
  403: 'Só quem organiza a partida pode fazer isso.',
  404: 'Monte os times antes de começar a partida.',
  409: 'O placar mudou. Atualize e tente de novo.',
};

/** An organizer action that answers with the new scoreboard. */
function useGameMutation<TInput>(
  matchId: string,
  action: (input: TInput) => Promise<ApiScoreboard>,
  errors: Partial<Record<number, string>> = {},
) {
  const queryClient = useQueryClient();
  return useMutation<ApiScoreboard, Error, TInput>({
    mutationFn: async (input) => {
      try {
        return await action(input);
      } catch (error) {
        throw toMatchError(error, { ...GAME_ERRORS, ...errors });
      }
    },
    onSuccess: (scoreboard) => {
      queryClient.setQueryData<LiveGameData>(liveGameQueryKey(matchId), (previous) =>
        previous ? { ...previous, scoreboard } : previous,
      );
      // The match detail shows where the game is (placar / votação / resumo).
      void queryClient.invalidateQueries({ queryKey: matchDetailQueryKey(matchId) });
      if (scoreboard.state === 'Ended') {
        // An ended game leaves the Home's upcoming matches (API DECISIONS #83).
        void queryClient.invalidateQueries({ queryKey: upcomingMatchesQueryKey });
      }
    },
    onError: () => {
      // Someone else may have moved the game on: show what the server has.
      void queryClient.invalidateQueries({ queryKey: liveGameQueryKey(matchId) });
    },
  });
}

/**
 * Puts two teams on court: starts the game with them (first set) or opens the
 * next set between them (3+ teams, after a set ended).
 */
export function useStartSet(matchId: string) {
  return useGameMutation<[string, string]>(matchId, async ([teamAId, teamBId]) => {
    const scoreboard = await fetchScoreboard(matchId);
    if (!scoreboard) {
      return postStartGame(matchId, teamAId, teamBId);
    }
    if (scoreboard.state === 'NotStarted') {
      // Created but never started (an interrupted attempt): just start it.
      return authorizedApiClient<ApiScoreboard>(
        `${MATCHES_PATH}/${matchId}/scoreboard/start`,
        { method: 'POST' },
      );
    }
    return postNextSet(matchId, teamAId, teamBId);
  }, START_ERRORS);
}

/** Starts a match without fixed teams (organizer): no teams to build, no pair to pick. */
export function useStartFreeGame(matchId: string) {
  return useGameMutation<void>(matchId, () => postStartFreeGame(matchId), START_ERRORS);
}

/** The API refuses the game until 15 minutes before the match time (`422`). */
export const TOO_EARLY_TO_START =
  'A partida só pode começar a partir de 15 minutos antes do horário marcado.';

const START_ERRORS = { 422: TOO_EARLY_TO_START };

/** Key of the point mutations of a match (see `useAddPoint`). */
export const scoreMutationKey = (matchId: string) =>
  ['matches', matchId, 'score'] as const;

type PointInput = { setNumber: number; teamId: string };

/** The cached game with one point added to (or taken back from) a team's set. */
function withPoint(data: LiveGameData, input: PointInput, delta: 1 | -1): LiveGameData {
  const { scoreboard } = data;
  if (!scoreboard) {
    return data;
  }
  return {
    ...data,
    scoreboard: {
      ...scoreboard,
      sets: scoreboard.sets.map((set) => {
        if (set.setNumber !== input.setNumber) {
          return set;
        }
        const side = input.teamId === set.teamAId ? 'teamAPoints' : 'teamBPoints';
        return {
          ...set,
          [side]: Math.max(0, set[side] + delta),
          canUndo: delta === 1 ? true : set.canUndo,
        };
      }),
    },
  };
}

/**
 * Adds a point, optimistically: the score on screen goes up at the tap and the
 * server is told in the background, so scoring does not wait for the network.
 * - Taps are sent one at a time, in order (`scope`), so fast taps all count.
 * - While taps are still on their way the server's answers are not written to
 *   the cache (they are behind what the screen shows); the answer to the last
 *   one is, and it is the truth (it may have closed the set).
 * - A refused or failed point is taken back from the screen and the game is
 *   re-read from the server.
 */
export function useAddPoint(matchId: string) {
  const queryClient = useQueryClient();
  const gameKey = liveGameQueryKey(matchId);
  const mutationKey = scoreMutationKey(matchId);
  return useMutation<ApiScoreboard, Error, PointInput>({
    mutationKey,
    scope: { id: mutationKey.join('/') },
    mutationFn: async (input) => {
      try {
        return await postPoint(matchId, input.setNumber, input.teamId);
      } catch (error) {
        throw toMatchError(error, GAME_ERRORS);
      }
    },
    onMutate: async (input) => {
      // A read in flight would bring back the score from before this tap.
      await queryClient.cancelQueries({ queryKey: gameKey });
      queryClient.setQueryData<LiveGameData>(gameKey, (previous) =>
        previous ? withPoint(previous, input, 1) : previous,
      );
    },
    onSuccess: (scoreboard) => {
      // This mutation still counts as running here: 1 means no tap is queued.
      if (queryClient.isMutating({ mutationKey }) > 1) {
        return;
      }
      queryClient.setQueryData<LiveGameData>(gameKey, (previous) =>
        previous ? { ...previous, scoreboard } : previous,
      );
      void queryClient.invalidateQueries({ queryKey: matchDetailQueryKey(matchId) });
      if (scoreboard.state === 'Ended') {
        void queryClient.invalidateQueries({ queryKey: upcomingMatchesQueryKey });
      }
    },
    onError: (_error, input) => {
      queryClient.setQueryData<LiveGameData>(gameKey, (previous) =>
        previous ? withPoint(previous, input, -1) : previous,
      );
      void queryClient.invalidateQueries({ queryKey: gameKey });
    },
  });
}

/** Takes one point off the chosen team in the set (as many times as needed). */
export function useUndoPoint(matchId: string) {
  return useGameMutation<{ setNumber: number; teamId: string }>(
    matchId,
    (input) => deleteLastPoint(matchId, input.setNumber, input.teamId),
    { 409: 'Não há ponto para desfazer.' },
  );
}

/** Ends the set now: whoever is ahead takes it. */
export function useEndSet(matchId: string) {
  return useGameMutation<{ setNumber: number }>(
    matchId,
    (input) => postEndSet(matchId, input.setNumber),
    { 409: 'Set empatado: jogue mais um ponto antes de encerrar.' },
  );
}

/** Ends the whole game now; the team with the most sets wins. */
export function useEndGame(matchId: string) {
  return useGameMutation<void>(matchId, () => postEndGame(matchId));
}

/** "Jogo 2 · até 21 pontos" (single game) or "Set 2 · melhor de 3" (older games). */
export function gameLabel(game: Pick<LiveGame, 'bestOf' | 'pointsToWin'>, setNumber: number): string {
  if (game.bestOf) {
    return `Set ${setNumber} · melhor de ${game.bestOf}`;
  }
  // A single-game match is the day's session: game after game until the organizer ends it.
  return `Jogo ${setNumber} · até ${game.pointsToWin} pontos`;
}
