import { pickNextGame } from '@/features/matches/lib/nextGame';
import type { UpcomingMatch } from '@/features/matches/types/match';

const NOW = new Date('2026-10-14T12:00:00Z');

function match(id: string, startsAt: string, confirmed: boolean): UpcomingMatch {
  return {
    id,
    name: id,
    startsAt,
    level: 'INTERMEDIARIO',
    openSlots: 0,
    priceLabel: 'Grátis',
    avatarUrls: [],
    tint: '#1A1AFF',
    venue: 'Arena',
    confirmed,
  };
}

describe('pickNextGame', () => {
  it('picks the soonest future match where the user is confirmed', () => {
    const next = pickNextGame(
      [
        match('later', '2026-10-16T22:00:00Z', true),
        match('pending', '2026-10-14T20:00:00Z', false),
        match('past', '2026-10-14T10:00:00Z', true),
        match('soon', '2026-10-15T22:00:00Z', true),
      ],
      NOW,
    );
    expect(next?.id).toBe('soon');
  });

  it('returns undefined when nothing is confirmed ahead', () => {
    expect(pickNextGame([match('pending', '2026-10-15T22:00:00Z', false)], NOW)).toBeUndefined();
    expect(pickNextGame([], NOW)).toBeUndefined();
  });
});
