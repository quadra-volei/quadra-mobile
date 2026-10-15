import { cardRarity } from '@/theme/cardRarity';

describe('cardRarity', () => {
  it.each([
    [1, 'BRONZE'],
    [59, 'BRONZE'],
    [60, 'PRATA'],
    [69, 'PRATA'],
    [70, 'OURO'],
    [79, 'OURO'],
    [80, 'ELITE'],
    [99, 'ELITE'],
  ])('GERAL %i is %s', (overall, label) => {
    expect(cardRarity(overall).label).toBe(label);
  });
});
