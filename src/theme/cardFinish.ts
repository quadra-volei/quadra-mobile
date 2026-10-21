// Player-card finishes ("Sua carta", DECISIONS #119) — the token layer for the
// collectible card. The player picks one; it is saved on the account. Components
// read `CARD_FINISHES[finish]`; screens never inline these hex values.

import type { QuadraWordmarkVariant } from '@/components/icons/QuadraWordmark';

export type CardFinish = 'Prisma' | 'Ion' | 'Eclipse';

type Gradient = readonly [string, string, ...string[]];

export type CardFinishTokens = {
  /** Shown on the picker. */
  name: string;
  /** Card body behind the text. */
  surface: string;
  /** Main text on the card. */
  ink: string;
  /** Secondary text (nickname, labels). */
  muted: string;
  /** Hairlines and the position pill border. */
  edge: string;
  /** Title eyebrow, big numbers, picker check. */
  accent: string;
  /** Metallic frame, diagonal. */
  frame: Gradient;
  /** Holographic band that slides over the frame with the finger. */
  foil: Gradient;
  /** Behind the logo on the top tab of the front. */
  tab: string;
  /** Which official lockup sits on the card (light on dark finishes, navy on Íon). */
  logo: QuadraWordmarkVariant;
  /** Prisma and Eclipse have cut corners; Íon is rounded. */
  shape: 'chamfer' | 'rounded';
  /** Picker swatch background. */
  swatch: Gradient;
};

export const CARD_FINISHES: Record<CardFinish, CardFinishTokens> = {
  Prisma: {
    name: 'Prisma',
    surface: '#111A42',
    ink: '#FFFFFF',
    muted: '#C2CBE4',
    edge: 'rgba(255,255,255,0.14)',
    accent: '#C6F135',
    frame: ['#BED5FF', '#687EE4', '#F2FCFF', '#BDD98A', '#DFBDFF', '#7CD6F0'],
    foil: ['rgba(152,227,245,0)', 'rgba(152,227,245,0.9)', 'rgba(213,172,255,0.9)', 'rgba(241,215,149,0.9)', 'rgba(172,248,196,0.9)', 'rgba(172,248,196,0)'],
    tab: 'rgba(11,21,57,0.91)',
    logo: 'light',
    shape: 'chamfer',
    swatch: ['#141749', '#4157D4', '#18163D'],
  },
  Ion: {
    name: 'Íon',
    surface: '#E0F0EB',
    ink: '#123A39',
    muted: '#466661',
    edge: 'rgba(18,58,57,0.15)',
    accent: '#18685F',
    frame: ['#F5FFF9', '#67BBA9', '#DDFFF3', '#608C96'],
    foil: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)', 'rgba(188,233,223,0.9)', 'rgba(255,255,255,0)'],
    tab: '#E0F0EB',
    logo: 'navy',
    shape: 'rounded',
    swatch: ['#D5EDE4', '#96CDBF'],
  },
  Eclipse: {
    name: 'Eclipse',
    surface: '#251D28',
    ink: '#FFF3E6',
    muted: '#D4BFCA',
    edge: 'rgba(237,197,150,0.19)',
    accent: '#EDC596',
    frame: ['#FFF0D1', '#A57B59', '#E6C591', '#80637A', '#FFF0D1'],
    foil: ['rgba(239,199,147,0)', 'rgba(239,199,147,0.9)', 'rgba(188,145,168,0.85)', 'rgba(239,199,147,0)'],
    tab: '#251D28',
    logo: 'light',
    shape: 'chamfer',
    swatch: ['#765143', '#251D28'],
  },
};

export const CARD_FINISH_ORDER: CardFinish[] = ['Prisma', 'Ion', 'Eclipse'];

/** The screen behind the card ("Sua carta"): deep navy with a blue glow. */
export const CARD_SCREEN = { bg: '#080924', glow: 'rgba(37,40,134,0.5)' } as const;

/** Light on the card: the glare and the darkening at the top of the photo. */
export const CARD_LIGHT = { glare: '#FFFFFF', photoTop: '#03091D' } as const;

export type CardTier = 'Classico' | 'Prisma' | 'Holografico';

export type CardTierTokens = {
  name: string;
  /** First level of the range; the next tier's `from` closes it. */
  from: number;
  /** Opacity of the foil band on the frame, of the foil over the face and of the glare. */
  frameFoil: number;
  faceFoil: number;
  glare: number;
  /** Rainbow foil over the face instead of the finish's own foil. */
  rainbow: boolean;
};

// The card's look grows with the player's level (Johny, 2026-10-21). Placeholders
// until the designer's art (normal, foil, reverse foil...): Clássica is matte,
// Prisma has today's foil, Holográfica a strong rainbow over the whole card.
export const CARD_TIERS: Record<CardTier, CardTierTokens> = {
  Classico: { name: 'Clássica', from: 1, frameFoil: 0, faceFoil: 0, glare: 0.2, rainbow: false },
  Prisma: { name: 'Prisma', from: 10, frameFoil: 0.75, faceFoil: 0.14, glare: 0.35, rainbow: false },
  Holografico: { name: 'Holográfica', from: 20, frameFoil: 0.95, faceFoil: 0.38, glare: 0.5, rainbow: true },
};

export const CARD_TIER_ORDER: CardTier[] = ['Classico', 'Prisma', 'Holografico'];

export const HOLO_FOIL: Gradient = [
  'rgba(255,90,160,0)',
  'rgba(255,90,160,0.9)',
  'rgba(255,210,80,0.9)',
  'rgba(110,255,170,0.9)',
  'rgba(90,180,255,0.9)',
  'rgba(190,120,255,0.9)',
  'rgba(190,120,255,0)',
];

/** The tier a level falls in: 1–9 Clássica, 10–19 Prisma, 20+ Holográfica. */
export function cardTier(level: number): CardTier {
  return CARD_TIER_ORDER.reduce<CardTier>((tier, t) => (level >= CARD_TIERS[t].from ? t : tier), 'Classico');
}
