import type { SeasonPass, SeasonReward } from '@/features/pass/api/seasonPass';

const TITLES: Record<number, string> = { 3: 'SEMPRE_PRESENTE', 6: 'CRIA_DA_QUADRA', 9: 'LENDA_T1' };

/** The API's T1 pass at `level` (20 points per level), every reward unlocked up to it. */
export function seasonPassFixture(level: number, overrides: Partial<SeasonPass> = {}): SeasonPass {
  const rewards: SeasonReward[] = [];
  for (let l = 1; l <= 12; l++) {
    rewards.push({ level: l, track: 'Premium', kind: 'Piece', code: `PIECE_${l}`, unlocked: l <= level });
    if (TITLES[l]) rewards.push({ level: l, track: 'Free', kind: 'Title', code: TITLES[l]!, unlocked: l <= level });
  }
  rewards.push({ level: 12, track: 'Premium', kind: 'Finish', code: 'Pioneira', unlocked: level >= 12 });
  return {
    season: 'T1',
    name: 'Temporada 1',
    startsAt: '2026-11-01T03:00:00Z',
    endsAt: '2027-02-01T03:00:00Z',
    status: 'Active',
    points: level * 20 + 6,
    level,
    levels: 12,
    pointsPerLevel: 20,
    weeklyCap: 60,
    weekPoints: 26,
    weekEndsAt: '2026-11-16T03:00:00Z',
    premium: true,
    rewards,
    ...overrides,
  };
}
