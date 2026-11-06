/** Mapping of a season ranking line (API DECISIONS #95): breakdown and the weekly arrow. */
import { toRankingRow } from '@/features/ranking/api/getGroupRanking';

const entry = {
  rank: 3,
  userId: 'u1',
  displayName: 'Érica',
  handle: 'erica',
  position: 'LEV',
  photoUrl: null,
  points: 66,
  matches: 1,
  wins: 2,
  mvps: 1,
  votes: 5,
  attendancePoints: 10,
  winPoints: 16,
  mvpPoints: 40,
};

describe('toRankingRow', () => {
  it('splits the points by reason and keeps the counts', () => {
    expect(toRankingRow(entry, 'u1')).toMatchObject({
      position: 3,
      score: 66,
      wins: 2,
      votes: 5,
      mvps: 1,
      isMe: true,
      breakdown: { attendance: 10, wins: 16, mvp: 40 },
    });
  });

  it('turns the rank of a week ago into an arrow', () => {
    expect(toRankingRow({ ...entry, previousRank: 5 }, null).trend).toEqual({ direction: 'up', delta: 2 });
    expect(toRankingRow({ ...entry, previousRank: 1 }, null).trend).toEqual({ direction: 'down', delta: 2 });
    expect(toRankingRow({ ...entry, previousRank: 3 }, null).trend).toEqual({ direction: 'flat', delta: 0 });
    expect(toRankingRow({ ...entry, previousRank: null }, null).trend).toBeUndefined();
  });
});
