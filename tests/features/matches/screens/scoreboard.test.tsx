/**
 * S13.5 + S14 — Set Team Picker → Live Scoreboard (`app/matches/[id]/scoreboard.tsx`).
 *
 * The screen follows where the game is on the backend. `useLiveGame` and the
 * game mutations are mocked at the boundary (their own behaviour is covered in
 * tests/features/matches/api/liveGame.test.tsx):
 *  - organizer, game not started / between sets → picks exactly two teams, the
 *    winner of the last set is flagged, and starting sends the pair;
 *  - players wait while the organizer picks;
 *  - during a set the organizer scores, undoes and ends the set; players only
 *    watch (no controls);
 *  - when the game ends the screen leads to the MVP vote.
 */
import React from 'react';

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      ReactLocal.createElement(View, props, children),
  };
});

jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return { ChevronLeft: (props: any) => ReactLocal.createElement(View, props) };
});

jest.mock('@/components/ui/Button', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID, loading, disabled }: any) =>
      ReactLocal.createElement(
        Pressable,
        {
          onPress,
          testID,
          disabled: Boolean(loading || disabled),
          accessibilityState: { disabled: Boolean(loading || disabled) },
        },
        ReactLocal.createElement(Text, null, children),
      ),
  };
});

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: (...args: unknown[]) => mockReplace(...args) },
  useLocalSearchParams: () => ({ id: 'match-1' }),
}));

jest.mock('@/features/matches/realtime/useScoreSubscription', () => ({
  useScoreSubscription: jest.fn(),
}));

import type { LiveGame } from '@/features/matches/api/liveGame';

const mockGame: { data: LiveGame | undefined; isPending: boolean; isError: boolean } = {
  data: undefined,
  isPending: false,
  isError: false,
};
const mockMutation = () => ({ mutate: jest.fn(), isPending: false });
const mockStartSet = mockMutation();
const mockAddPoint = mockMutation();
const mockUndoPoint = mockMutation();
const mockEndSet = mockMutation();
const mockEndGame = mockMutation();

jest.mock('@/features/matches/api/liveGame', () => ({
  useLiveGame: () => ({ ...mockGame, refetch: jest.fn() }),
  useStartSet: () => mockStartSet,
  useAddPoint: () => mockAddPoint,
  useUndoPoint: () => mockUndoPoint,
  useEndSet: () => mockEndSet,
  useEndGame: () => mockEndGame,
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import ScoreboardScreen from '../../../../app/matches/[id]/scoreboard';

const teams = [1, 2, 3].map((number) => ({
  id: `team-${number}`,
  number,
  name: `Time ${number}`,
  players: [],
}));

function game(overrides: Partial<LiveGame>): LiveGame {
  return {
    matchName: 'Racha de Quinta',
    isOrganizer: true,
    teams,
    phase: 'NOT_STARTED',
    bestOf: 3,
    setNumber: 1,
    pair: null,
    scores: [0, 0],
    setsWon: {},
    canUndo: false,
    setStartedAt: null,
    lastSetWinnerId: null,
    winnerTeamId: null,
    ...overrides,
  };
}

async function show(overrides: Partial<LiveGame>) {
  mockGame.data = game(overrides);
  await act(async () => {
    render(<ScoreboardScreen />);
  });
}

async function press(testID: string) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  [mockStartSet, mockAddPoint, mockUndoPoint, mockEndSet, mockEndGame].forEach((mutation) =>
    mutation.mutate.mockClear(),
  );
  mockReplace.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('S13.5 — set team picker', () => {
  it('lets the organizer pick exactly two teams and start with that pair', async () => {
    await show({ phase: 'NOT_STARTED' });

    expect(screen.getByText('Quem joga este set?')).toBeTruthy();
    expect(screen.getByTestId('start-set-button').props.accessibilityState.disabled).toBe(true);

    await press('team-row-1');
    await press('team-row-3');
    // A third team cannot be added to a full pair.
    expect(screen.getByTestId('team-row-2').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText('Time 1 vs Time 3')).toBeTruthy();

    await press('start-set-button');
    expect(mockStartSet.mutate).toHaveBeenCalledWith(['team-1', 'team-3'], expect.anything());
  });

  it('between sets flags the winner that stays on court and allows ending the game', async () => {
    await show({ phase: 'PICK_NEXT', setNumber: 2, lastSetWinnerId: 'team-2', setsWon: { 'team-2': 1 } });

    expect(screen.getByText('SET 2 - MELHOR DE 3')).toBeTruthy();
    expect(screen.getByText('Venceu o set e continua em quadra')).toBeTruthy();
    expect(screen.getByText('Começar set')).toBeTruthy();
    expect(screen.getByTestId('end-game-button')).toBeTruthy();
  });

  it('makes players wait while the organizer picks', async () => {
    await show({ phase: 'PICK_NEXT', isOrganizer: false });

    expect(screen.queryByTestId('start-set-button')).toBeNull();
    expect(screen.getByTestId('waiting-game')).toBeTruthy();
  });
});

describe('S14 — live scoreboard', () => {
  const playing: Partial<LiveGame> = {
    phase: 'PLAYING',
    setNumber: 2,
    pair: [teams[0]!, teams[2]!],
    scores: [7, 5],
    canUndo: true,
    setStartedAt: new Date().toISOString(),
  };

  it('shows the set on court and lets the organizer score, undo and end the set', async () => {
    await show(playing);

    expect(screen.getByText('Racha de Quinta · Set 2 melhor de 3')).toBeTruthy();
    expect(screen.getByTestId('score-team1').props.children).toBe(7);
    expect(screen.getByTestId('score-team2').props.children).toBe(5);

    await press('add-point-team2');
    expect(mockAddPoint.mutate).toHaveBeenCalledWith(
      { setNumber: 2, teamId: 'team-3' },
      expect.anything(),
    );

    await press('undo-button');
    expect(mockUndoPoint.mutate).toHaveBeenCalledWith({ setNumber: 2 }, expect.anything());

    // Ending the set asks first; confirming sends it.
    await press('end-set-button');
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as { onPress?: () => void }[];
    await act(async () => buttons[1]?.onPress?.());
    expect(mockEndSet.mutate).toHaveBeenCalledWith({ setNumber: 2 }, expect.anything());
  });

  it('disables undo when there is no point to take back', async () => {
    await show({ ...playing, canUndo: false });

    expect(screen.getByTestId('undo-button').props.accessibilityState.disabled).toBe(true);
  });

  it('is read-only for players', async () => {
    await show({ ...playing, isOrganizer: false });

    expect(screen.getByTestId('score-team1').props.children).toBe(7);
    expect(screen.queryByTestId('add-point-team1')).toBeNull();
    expect(screen.queryByTestId('undo-button')).toBeNull();
    expect(screen.queryByTestId('end-set-button')).toBeNull();
  });
});

describe('game over', () => {
  it('names the winner and leads to the MVP vote', async () => {
    await show({ phase: 'ENDED', winnerTeamId: 'team-2' });

    expect(screen.getByText('Time 2 venceu')).toBeTruthy();
    await press('go-mvp-vote');
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/matches/[id]/mvp-vote',
      params: { id: 'match-1' },
    });
  });
});
