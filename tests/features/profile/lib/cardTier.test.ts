import { cardTier } from '@/theme/cardFinish';

// The card's look by level (Johny, 2026-10-21): 1–9 Clássica, 10–19 Prisma, 20+ Holográfica.
describe('cardTier', () => {
  it.each([
    [1, 'Classico'],
    [9, 'Classico'],
    [10, 'Prisma'],
    [19, 'Prisma'],
    [20, 'Holografico'],
    [45, 'Holografico'],
  ])('level %i → %s', (level, tier) => {
    expect(cardTier(level)).toBe(tier);
  });
});
