import { create } from 'zustand';
import type { UpcomingMatch } from '@/features/matches/types/match';

interface CreatedMatchesState {
  createdMatches: UpcomingMatch[];
}

interface CreatedMatchesActions {
  addCreatedMatch: (match: UpcomingMatch) => void;
  removeCreatedMatch: (matchId: string) => void;
  updateCreatedMatch: (matchId: string, updates: Partial<UpcomingMatch>) => void;
  getCreatedMatches: () => UpcomingMatch[];
  reset: () => void;
}

const initialState: CreatedMatchesState = {
  createdMatches: [],
};

export const useCreatedMatchesStore = create<
  CreatedMatchesState & CreatedMatchesActions
>((set, get) => ({
  ...initialState,

  addCreatedMatch: (match) =>
    set((state) => ({
      createdMatches: [match, ...state.createdMatches],
    })),

  removeCreatedMatch: (matchId) =>
    set((state) => ({
      createdMatches: state.createdMatches.filter((m) => m.id !== matchId),
    })),

  updateCreatedMatch: (matchId, updates) =>
    set((state) => ({
      createdMatches: state.createdMatches.map((m) =>
        m.id === matchId ? { ...m, ...updates } : m
      ),
    })),

  getCreatedMatches: () => get().createdMatches,

  reset: () => set(initialState),
}));
