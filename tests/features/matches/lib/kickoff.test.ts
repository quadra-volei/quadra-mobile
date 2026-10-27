/**
 * When the game of a match may start: from 15 minutes before its time (API
 * `Kickoff.Tolerance`); the hook flips by itself when the window opens.
 */
import { act, renderHook } from '@testing-library/react-native';

import {
  kickoffOpensAt,
  kickoffWaitingLabel,
  useKickoffOpen,
} from '@/features/matches/lib/kickoff';

describe('kickoff window', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens 15 minutes before the match time', () => {
    expect(kickoffOpensAt('2026-10-27T22:00:00.000Z').toISOString()).toBe(
      '2026-10-27T21:45:00.000Z',
    );
  });

  it('says when it opens', () => {
    const startsAt = new Date(2099, 0, 2, 20, 0).toISOString();
    expect(kickoffWaitingLabel(startsAt)).toBe('Aguardando horário · libera 02/01 às 19h45');
  });

  it('says "hoje" when it opens today', () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 27, 10, 0) });
    const startsAt = new Date(2026, 9, 27, 20, 0).toISOString();
    expect(kickoffWaitingLabel(startsAt)).toBe('Aguardando horário · libera hoje às 19h45');
  });

  it('is closed until 15 minutes before, then opens by itself', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-27T21:40:00.000Z') });
    const { result } = await renderHook(() => useKickoffOpen('2026-10-27T22:00:00.000Z'));
    expect(result.current).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(4 * 60 * 1000);
    });
    expect(result.current).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(60 * 1000);
    });
    expect(result.current).toBe(true);
  });

  it('is open at and after the window, and closed without a time', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-27T21:50:00.000Z') });
    const open = await renderHook(() => useKickoffOpen('2026-10-27T22:00:00.000Z'));
    expect(open.result.current).toBe(true);

    const none = await renderHook(() => useKickoffOpen(undefined));
    expect(none.result.current).toBe(false);
  });
});
