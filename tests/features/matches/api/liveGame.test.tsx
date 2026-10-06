/**
 * S13 / S13.5 / S14 / S15 / S16 — in-game hooks against the real backend
 * contract (F1.3 teams, F1.4 scoreboard, F1.5 MVP, F1.6 summary), with `fetch`
 * stubbed at the transport:
 *  - the draw asks for balanced (Automático) or random (Manual) teams and names
 *    the members from the match roster, guests included;
 *  - the live game derives its phase from the scoreboard (not started, playing,
 *    waiting for the next pair, ended);
 *  - starting creates + starts the scoreboard the first time and opens the next
 *    set afterwards; scoring writes the server's scoreboard into the cache;
 *  - MVP candidates are the team members with an account; finishing the match
 *    tolerates steps that were already done;
 *  - the summary is shown from the signed-in player's side.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-secure-store', () =>
  require('../../../support/inMemorySecureStore'),
);

import * as SecureStore from 'expo-secure-store';

import { useDrawTeams } from '@/features/matches/api/drawTeams';
import type { ApiScoreboard, ApiTeam } from '@/features/matches/api/gameApi';
import { SUMMARY_NOT_READY, useMatchSummary } from '@/features/matches/api/getMatchSummary';
import {
  type LiveGameData,
  toLiveGame,
  useAddPoint,
  useLiveGame,
  useStartSet,
} from '@/features/matches/api/liveGame';
import type { ApiMatchDetail } from '@/features/matches/api/matchesApi';
import {
  useFinishMatch,
  useMatchPlayers,
} from '@/features/matches/api/useMVPVote';
import type { PresencePlayer } from '@/features/matches/types/matchDetail';
import { saveTokens } from '@/lib/auth/tokenStorage';
import { useAuthStore } from '@/stores/auth';

const MATCH = 'match-1';
const ME = 'user-me';
const ANA = 'user-ana';
const GUEST = 'guest-1';

const apiTeams: ApiTeam[] = [
  { id: 'team-a', name: 'Team A', members: [{ playerId: ME, isGuest: false }] },
  {
    id: 'team-b',
    name: 'Team B',
    members: [
      { playerId: ANA, isGuest: false },
      { playerId: GUEST, isGuest: true },
    ],
  },
  { id: 'team-c', name: 'Team C', members: [] },
];

const player = (userId: string, displayName: string) => ({
  userId,
  displayName,
  handle: displayName.toLowerCase(),
  position: 'LEV',
  level: 'Intermediate',
  photoUrl: null,
});

const apiDetail: ApiMatchDetail = {
  match: {
    id: MATCH,
    organizerId: ME,
    name: 'Racha de Quinta',
    address: 'Arena Central',
    latitude: -23.55,
    longitude: -46.63,
    dateTime: '2026-06-25T22:30:00.000Z',
    maxPlayers: 8,
    price: null,
    type: 'OneOff',
    windowOpensAt: '2026-06-24T22:30:00.000Z',
    windowClosesAt: '2026-06-25T22:30:00.000Z',
    status: 'Open',
    format: '4X4',
    level: 'Intermediate',
    durationMinutes: 90,
    visibility: 'Open',
    inviteMode: null,
    priceMonthly: null,
  },
  inviteCode: null,
  organizer: player(ME, 'Renan'),
  players: [
    { player: player(ME, 'Renan'), playerType: 'Regular', status: 'Confirmed' },
    { player: player(ANA, 'Ana'), playerType: 'Regular', status: 'Confirmed' },
  ],
  guests: [{ id: GUEST, name: 'Zé', position: null }],
  confirmedCount: 3,
  openSlots: 5,
  myPresence: { playerType: 'Regular', status: 'Confirmed' },
  myWaitingListPosition: null,
  canJoin: false,
};

function scoreboard(overrides: Partial<ApiScoreboard> = {}): ApiScoreboard {
  return {
    matchId: MATCH,
    format: 'BestOf3',
    state: 'InProgress',
    teamAId: 'team-a',
    teamBId: 'team-b',
    teamASetsWon: 0,
    teamBSetsWon: 0,
    currentSetNumber: 1,
    winnerTeamId: null,
    rotatesTeams: true,
    awaitingNextSet: false,
    sets: [
      {
        setNumber: 1,
        teamAPoints: 3,
        teamBPoints: 2,
        status: 'InProgress',
        isDecidingSet: false,
        winnerTeamId: null,
        startedAt: '2026-06-25T22:31:00.000Z',
        teamAId: 'team-a',
        teamBId: 'team-b',
        canUndo: true,
      },
    ],
    ...overrides,
  };
}

const fetchMock = jest.fn();

/** Answers each request by URL suffix + method; unknown routes are 404. */
function serve(routes: Record<string, { status: number; body?: unknown }>) {
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    const key = `${init.method ?? 'GET'} ${url.slice(url.indexOf('/api/v1/matches/') + 16 + MATCH.length)}`;
    const route = routes[key] ?? { status: 404 };
    return {
      ok: route.status >= 200 && route.status < 300,
      status: route.status,
      statusText: String(route.status),
      json: async () => route.body ?? {},
    };
  });
}

function requests(): string[] {
  return (fetchMock.mock.calls as [string, RequestInit][]).map(
    ([url, init]) =>
      `${init.method ?? 'GET'} ${url.slice(url.indexOf('/api/v1/matches/') + 16 + MATCH.length)}`,
  );
}

function bodyOf(request: string): unknown {
  const index = requests().indexOf(request);
  const init = (fetchMock.mock.calls as [string, RequestInit][])[index]?.[1];
  return typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
}

let client: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function run<TData, TInput>(
  useHook: () => { mutateAsync: (input: TInput) => Promise<TData> },
  input: TInput,
): Promise<PromiseSettledResult<TData>> {
  const { result } = await renderHook(() => useHook(), { wrapper });
  let settled!: PromiseSettledResult<TData>;
  await act(async () => {
    [settled] = await Promise.allSettled([result.current.mutateAsync(input)]);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return settled;
}

beforeEach(async () => {
  (SecureStore as unknown as { __reset: () => void }).__reset();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await saveTokens({ accessToken: 'access-jwt', refreshToken: 'refresh-opaque' });
  useAuthStore.setState({ userId: ME });
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe('toLiveGame', () => {
  const data = (board: ApiScoreboard | null): LiveGameData => ({
    matchName: 'Racha',
    isOrganizer: true,
    scoreboard: board,
    teams: apiTeams.map((team, index) => ({
      id: team.id,
      number: index + 1,
      name: `Time ${index + 1}`,
      players: [],
    })),
  });

  it('is NOT_STARTED without a scoreboard', () => {
    expect(toLiveGame(data(null))).toMatchObject({ phase: 'NOT_STARTED', setNumber: 1, pair: null });
  });

  it('is PLAYING with the pair, the points and the undo of the set on court', () => {
    const game = toLiveGame(data(scoreboard()));

    expect(game).toMatchObject({ phase: 'PLAYING', setNumber: 1, scores: [3, 2], canUndo: true, bestOf: 3 });
    expect(game.pair?.map((team) => team.name)).toEqual(['Time 1', 'Time 2']);
  });

  it('is PICK_NEXT after a set when teams rotate, remembering who stays on court', () => {
    const finished = scoreboard().sets.map((set) => ({
      ...set,
      status: 'Finished' as const,
      winnerTeamId: 'team-a',
      canUndo: false,
    }));

    const game = toLiveGame(data(scoreboard({ awaitingNextSet: true, sets: finished })));

    expect(game).toMatchObject({
      phase: 'PICK_NEXT',
      setNumber: 2,
      lastSetWinnerId: 'team-a',
      setsWon: { 'team-a': 1 },
      pair: null,
    });
  });

  it('is ENDED with the winner', () => {
    expect(toLiveGame(data(scoreboard({ state: 'Ended', winnerTeamId: 'team-b' })))).toMatchObject({
      phase: 'ENDED',
      winnerTeamId: 'team-b',
    });
  });
});

describe('teams and live game', () => {
  it('draws balanced or random teams and names members from the roster', async () => {
    serve({ 'POST /teams/draft': { status: 200, body: { teams: apiTeams } } });
    const roster: PresencePlayer[] = [
      { id: ME, name: 'Renan', status: 'CONFIRMADO' },
      { id: GUEST, name: 'Zé', status: 'CONFIRMADO', isGuest: true },
    ];

    const settled = await run(() => useDrawTeams(MATCH), {
      players: roster,
      request: { teamCount: 3, perTeam: 2, drawMode: 'MANUAL' },
    });

    expect(bodyOf('POST /teams/draft')).toEqual({ teamCount: 3, perTeam: 2, mode: 'Random' });
    expect(settled.status).toBe('fulfilled');
    const teams = settled.status === 'fulfilled' ? settled.value.teams : [];
    expect(teams.map((team) => team.name)).toEqual(['Time 1', 'Time 2', 'Time 3']);
    expect(teams[1]?.players.map((member) => member.name)).toEqual(['Jogador', 'Zé']);
  });

  it('loads the game: organizer, teams with names, phase from the scoreboard', async () => {
    serve({
      'GET /detail': { status: 200, body: apiDetail },
      'GET /teams': { status: 200, body: { teams: apiTeams } },
      'GET /scoreboard': { status: 200, body: scoreboard() },
    });

    const { result } = await renderHook(() => useLiveGame(MATCH), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({
      matchName: 'Racha de Quinta',
      isOrganizer: true,
      phase: 'PLAYING',
      scores: [3, 2],
    });
    expect(result.current.data?.teams[1]?.players.map((member) => member.name)).toEqual(['Ana', 'Zé']);
  });

  it('starting the first set creates the scoreboard with the pair and starts it', async () => {
    serve({
      'POST /scoreboard': { status: 201, body: scoreboard({ state: 'NotStarted', sets: [] }) },
      'POST /scoreboard/start': { status: 200, body: scoreboard() },
    });

    await run(() => useStartSet(MATCH), ['team-a', 'team-c'] as [string, string]);

    expect(requests()).toEqual(['GET /scoreboard', 'POST /scoreboard', 'POST /scoreboard/start']);
    expect(bodyOf('POST /scoreboard')).toEqual({
      format: 'BestOf3',
      teamAId: 'team-a',
      teamBId: 'team-c',
    });
  });

  it('starting a later set opens it between the picked teams', async () => {
    serve({
      'GET /scoreboard': { status: 200, body: scoreboard({ awaitingNextSet: true }) },
      'POST /scoreboard/sets': { status: 200, body: scoreboard({ currentSetNumber: 2 }) },
    });

    await run(() => useStartSet(MATCH), ['team-a', 'team-c'] as [string, string]);

    expect(bodyOf('POST /scoreboard/sets')).toEqual({ teamAId: 'team-a', teamBId: 'team-c' });
  });

  it('a point writes the scoreboard the server answers with into the cache', async () => {
    const after = scoreboard();
    after.sets[0]!.teamAPoints = 4;
    serve({
      'GET /detail': { status: 200, body: apiDetail },
      'GET /teams': { status: 200, body: { teams: apiTeams } },
      'GET /scoreboard': { status: 200, body: scoreboard() },
      'POST /scoreboard/sets/1/points': { status: 200, body: after },
    });
    const { result } = await renderHook(
      () => ({ game: useLiveGame(MATCH), addPoint: useAddPoint(MATCH) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.game.isSuccess).toBe(true));

    await act(async () => {
      await result.current.addPoint.mutateAsync({ setNumber: 1, teamId: 'team-a' });
    });

    expect(bodyOf('POST /scoreboard/sets/1/points')).toEqual({ teamId: 'team-a' });
    await waitFor(() => expect(result.current.game.data?.scores).toEqual([4, 2]));
  });

  it('refuses with a readable message when someone else is not the organizer', async () => {
    serve({ 'POST /scoreboard/sets/1/points': { status: 403 } });

    const settled = await run(() => useAddPoint(MATCH), { setNumber: 1, teamId: 'team-a' });

    expect(settled.status === 'rejected' && (settled.reason as Error).message).toBe(
      'Só quem organiza a partida pode fazer isso.',
    );
  });
});

describe('MVP and summary', () => {
  it('lists the team members with an account as MVP candidates', async () => {
    serve({
      'GET /detail': { status: 200, body: apiDetail },
      'GET /teams': { status: 200, body: { teams: apiTeams } },
    });

    const { result } = await renderHook(() => useMatchPlayers(MATCH), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((candidate) => candidate.name)).toEqual(['Renan', 'Ana']);
  });

  it('finishing closes the voting and generates the summary, skipping what is done', async () => {
    serve({
      'POST /mvp-voting/close': { status: 409 },
      'POST /summary': { status: 201, body: {} },
    });

    const settled = await run(() => useFinishMatch(MATCH), undefined);

    expect(settled.status).toBe('fulfilled');
    expect(requests()).toEqual(['POST /mvp-voting/close', 'POST /summary']);
  });

  it('shows the summary from my side: my team first, win when it won', async () => {
    useAuthStore.setState({ userId: ANA });
    serve({
      'GET /detail': { status: 200, body: apiDetail },
      'GET /mvp-voting': {
        status: 200,
        body: {
          state: 'Closed',
          totalVotes: 2,
          callerHasVoted: true,
          mvpPlayerId: ANA,
          mvpVoteCount: 2,
          results: [{ playerId: ANA, votes: 2 }],
        },
      },
      'GET /summary': {
        status: 200,
        body: {
          format: 'BestOf3',
          teamAId: 'team-a',
          teamBId: 'team-b',
          teamASetsWon: 1,
          teamBSetsWon: 2,
          winnerTeamId: 'team-b',
          endedAt: '2026-06-10T15:00:00.000Z',
          mvpPlayerId: ANA,
          mvpVoteCount: 2,
          mvpTotalVotes: 2,
          sets: [
            { setNumber: 1, teamAPoints: 25, teamBPoints: 20 },
            { setNumber: 2, teamAPoints: 18, teamBPoints: 25 },
            { setNumber: 3, teamAPoints: 10, teamBPoints: 15 },
          ],
          teams: [
            { teamId: 'team-a', name: 'Team A', playerIds: [ME] },
            { teamId: 'team-b', name: 'Team B', playerIds: [ANA] },
          ],
        },
      },
    });

    const { result } = await renderHook(() => useMatchSummary(MATCH), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({
      result: 'VITORIA',
      name: 'Racha de Quinta',
      venue: 'Arena Central',
      format: '4X4',
      finalScore: [2, 1],
      setScores: [
        [20, 25],
        [25, 18],
        [15, 10],
      ],
      mvp: { id: ANA, name: 'Ana', votes: 2 },
      totalVotes: 2,
      maxVotes: 2,
    });
  });

  it('says the summary is not ready while the organizer has not generated it', async () => {
    serve({ 'GET /detail': { status: 200, body: apiDetail } });

    const { result } = await renderHook(() => useMatchSummary(MATCH), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe(SUMMARY_NOT_READY);
  });
});
