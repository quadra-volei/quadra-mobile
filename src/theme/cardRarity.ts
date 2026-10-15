// Player-card rarity — the token layer for the collectible card (S8b). The
// rarity comes from the GERAL rating (1–99), like a sports trading card:
// Bronze, Prata, Ouro, and Elite in the brand's own blue → lime "holo" colors.
// Components read `cardRarity(overall)`; screens never inline these hex values.

import { colors } from '@/theme/colors';

export type CardRarity = {
  /** Shown on the card's corner tag ("OURO"). */
  label: string;
  /** Metallic frame gradient (diagonal), also the name ribbon and photo ring. */
  frame: readonly [string, string, ...string[]];
  /** Dark top of the card's inner panel; fades into navy at the bottom. */
  deep: string;
  /** Accent for the GERAL number, stat numbers and court lines. */
  ink: string;
  /** Readable text over the `frame` gradient (name ribbon, corner tag). */
  onFrame: string;
};

// Thresholds over GERAL. Today a declared Iniciante starts around 50, Intermediário
// around 60 and Avançado around 70 (API PlayerSkillCalculator); Elite is for growth.
const RARITIES: { min: number; rarity: CardRarity }[] = [
  {
    min: 80,
    rarity: {
      label: 'ELITE',
      frame: [colors.primary, '#6B1AFF', colors.accentLight, '#3FA9FF', '#6B1AFF'],
      deep: '#0D0D9E',
      ink: colors.accentLight,
      onFrame: colors.textOnDark,
    },
  },
  {
    min: 70,
    rarity: {
      label: 'OURO',
      frame: ['#8A6A12', '#FFE38A', '#C99A1E', '#FFF4C2', '#7A5A0C'],
      deep: '#3D2E06',
      ink: '#FFD95A',
      onFrame: colors.surfaceDark,
    },
  },
  {
    min: 60,
    rarity: {
      label: 'PRATA',
      frame: ['#6B7482', '#F4F7FB', '#9AA4B2', '#FFFFFF', '#6B7482'],
      deep: '#2A3142',
      ink: '#E6ECF5',
      onFrame: colors.surfaceDark,
    },
  },
  {
    min: Number.NEGATIVE_INFINITY,
    rarity: {
      label: 'BRONZE',
      frame: ['#6E401C', '#E0A26A', '#8C5A2E', '#F2C08E', '#6E401C'],
      deep: '#3A2214',
      ink: '#F2C08E',
      onFrame: colors.surfaceDark,
    },
  },
];

/** Resolves the card rarity for a GERAL rating. */
export function cardRarity(overall: number): CardRarity {
  // The last entry has no floor, so find always matches.
  return RARITIES.find((r) => overall >= r.min)!.rarity;
}
