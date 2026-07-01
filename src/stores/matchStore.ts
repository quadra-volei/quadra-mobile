import { create } from 'zustand';
import type { Team } from '@/features/matches/types/team';
import type { PresencePlayer as Player } from '@/features/matches/types/matchDetail';

export interface MatchState {
  // ── Match metadata ──
  matchId: string | null;
  matchTitle: string | null;
  organizerId: string | null;

  // ── Configuration (S11 - Create Match) ──
  teamCount: number; // 2, 3, 4
  perTeam: number;
  drawMode: 'AUTO' | 'MANUAL';
  bestOf: number;

  // ── Presence (S12 - Match Detail) ──
  confirmedPlayers: Player[];
  allPlayers: Player[]; // All players who can vote for MVP

  // ── Team Setup (S13 - Montar os times) ──
  teams: Team[];

  // ── Set Selection (S13.5 - Set Team Picker) ──
  selectedTeamIds: string[]; // 2 teams for current set

  // ── Scoring (S14 - In-Game Scoreboard) ──
  scores: Record<string, number>; // teamId -> current score
  currentSet: number; // 1, 2, 3...
  setResults: Array<{ setNumber: number; winnerId: string }>;
  elapsedSeconds: number;

  // ── MVP Voting (S15 - Post-Match MVP Vote) ──
  votedForPlayerId: string | null;
  currentUserId: string | null;
}

interface MatchStoreActions {
  // ── Initialize/Reset ──
  initializeMatch: (params: {
    matchId: string;
    matchTitle?: string;
    organizerId?: string;
    bestOf?: number;
  }) => void;
  reset: () => void;

  // ── S11: Create Match configuration ──
  setTeamConfig: (params: {
    teamCount: number;
    perTeam: number;
    drawMode: 'AUTO' | 'MANUAL';
  }) => void;

  // ── S12: Presence confirmation ──
  setConfirmedPlayers: (players: Player[]) => void;
  setAllPlayers: (players: Player[]) => void;

  // ── S13: Team setup ──
  setTeams: (teams: Team[]) => void;

  // ── S13.5: Team selection for set ──
  selectTeamsForSet: (teamIds: string[]) => void;
  clearTeamSelection: () => void;

  // ── S14: Scoring ──
  addPoint: (teamId: string) => void;
  undoPoint: (teamId: string) => void;
  setScores: (scores: Record<string, number>) => void;
  resetScores: () => void;
  nextSet: () => void;
  recordSetResult: (setNumber: number, winnerId: string) => void;
  incrementElapsedTime: () => void;
  resetElapsedTime: () => void;

  // ── S15: MVP Voting ──
  voteForMVP: (playerId: string) => void;

  // ── Helpers ──
  setCurrentUserId: (userId: string) => void;
  isMatchInProgress: () => boolean;
  getTeamScore: (teamId: string) => number;
  getSelectedTeams: () => Team[];
  getMatchWinner: () => string | null;
}

const initialState: MatchState = {
  matchId: null,
  matchTitle: null,
  organizerId: null,
  teamCount: 2,
  perTeam: 4,
  drawMode: 'AUTO',
  bestOf: 3,
  confirmedPlayers: [],
  allPlayers: [],
  teams: [],
  selectedTeamIds: [],
  scores: {},
  currentSet: 1,
  setResults: [],
  elapsedSeconds: 0,
  votedForPlayerId: null,
  currentUserId: null,
};

export const useMatchStore = create<MatchState & MatchStoreActions>(
  (set, get) => ({
    ...initialState,

    // ── Initialize/Reset ──
    initializeMatch: (params) =>
      set({
        matchId: params.matchId,
        matchTitle: params.matchTitle || null,
        organizerId: params.organizerId || null,
        bestOf: params.bestOf || 3,
        currentSet: 1,
        scores: {},
        selectedTeamIds: [],
        teams: [],
        votedForPlayerId: null,
      }),

    reset: () => set(initialState),

    // ── S11: Create Match configuration ──
    setTeamConfig: (params) =>
      set({
        teamCount: params.teamCount,
        perTeam: params.perTeam,
        drawMode: params.drawMode,
      }),

    // ── S12: Presence confirmation ──
    setConfirmedPlayers: (players) => set({ confirmedPlayers: players }),
    setAllPlayers: (players) => set({ allPlayers: players }),

    // ── S13: Team setup ──
    setTeams: (teams) =>
      set({
        teams,
        scores: teams.reduce(
          (acc, team) => ({ ...acc, [team.id]: 0 }),
          {} as Record<string, number>
        ),
      }),

    // ── S13.5: Team selection for set ──
    selectTeamsForSet: (teamIds) => set({ selectedTeamIds: teamIds }),
    clearTeamSelection: () => set({ selectedTeamIds: [] }),

    // ── S14: Scoring ──
    addPoint: (teamId) => {
      const state = get();
      set({
        scores: {
          ...state.scores,
          [teamId]: (state.scores[teamId] || 0) + 1,
        },
      });
    },

    undoPoint: (teamId) => {
      const state = get();
      set({
        scores: {
          ...state.scores,
          [teamId]: Math.max(0, (state.scores[teamId] || 1) - 1),
        },
      });
    },

    setScores: (scores) => set({ scores }),
    resetScores: () => {
      const state = get();
      const resetScores = state.teams.reduce(
        (acc, team) => ({ ...acc, [team.id]: 0 }),
        {} as Record<string, number>
      );
      set({ scores: resetScores });
    },

    nextSet: () => {
      const state = get();
      set({
        currentSet: state.currentSet + 1,
        selectedTeamIds: [],
      });
      get().resetScores();
    },

    recordSetResult: (setNumber, winnerId) => {
      const state = get();
      set({
        setResults: [...state.setResults, { setNumber, winnerId }],
      });
    },

    incrementElapsedTime: () => {
      const state = get();
      set({ elapsedSeconds: state.elapsedSeconds + 1 });
    },

    resetElapsedTime: () => set({ elapsedSeconds: 0 }),

    // ── S15: MVP Voting ──
    voteForMVP: (playerId) => set({ votedForPlayerId: playerId }),

    // ── Helpers ──
    setCurrentUserId: (userId) => set({ currentUserId: userId }),

    isMatchInProgress: () => {
      const state = get();
      return state.matchId !== null && state.teams.length > 0;
    },

    getTeamScore: (teamId) => {
      const state = get();
      return state.scores[teamId] || 0;
    },

    getSelectedTeams: () => {
      const state = get();
      return state.teams.filter((team) =>
        state.selectedTeamIds.includes(team.id)
      );
    },

    getMatchWinner: () => {
      const state = get();
      if (state.setResults.length === 0) return null;

      // Count wins per team
      const wins: Record<string, number> = {};
      state.setResults.forEach((result) => {
        wins[result.winnerId] = (wins[result.winnerId] || 0) + 1;
      });

      const winsNeeded = Math.ceil(state.bestOf / 2);
      for (const [teamId, winCount] of Object.entries(wins)) {
        if (winCount >= winsNeeded) return teamId;
      }
      return null;
    },
  })
);
