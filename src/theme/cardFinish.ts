// Player-card finishes ("Sua carta", DECISIONS #119) — the token layer for the
// collectible card. The player picks one; it is saved on the account. Components
// read `CARD_FINISHES[finish]`; screens never inline these hex values.

// Pioneira is the whole card of the first season pass (API DECISIONS #98): only
// who completes the pass equips it. Placeholder art until the designer's.
export type CardFinish = 'Prisma' | 'Ion' | 'Eclipse' | 'Pioneira';

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
  /** Prisma and Eclipse have cut corners; Íon is rounded. */
  shape: 'chamfer' | 'rounded';
  /** Picker swatch background. */
  swatch: Gradient;
  /** A season finish shines the same at any level instead of following the level tier. */
  tier?: CardTierTokens;
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
    shape: 'chamfer',
    swatch: ['#765143', '#251D28'],
  },
  // The brand's blue, lime and purple in chrome: the first season's colors.
  Pioneira: {
    name: 'Pioneira',
    surface: '#0B1238',
    ink: '#FFFFFF',
    muted: '#BFC8F0',
    edge: 'rgba(198,241,53,0.24)',
    accent: '#C6F135',
    frame: ['#F2FFC2', '#1A1AFF', '#C6F135', '#6B1AFF', '#E4ECFF', '#C6F135'],
    foil: ['rgba(198,241,53,0)', 'rgba(198,241,53,0.85)', 'rgba(120,150,255,0.8)', 'rgba(170,110,255,0.8)', 'rgba(198,241,53,0)'],
    shape: 'chamfer',
    swatch: ['#1A1AFF', '#0B1238'],
    tier: { name: 'Pioneira', from: 1, frameFoil: 0.65, faceFoil: 0.1, glare: 0.26, rainbow: false },
  },
};

/** The finishes anyone can pick; season finishes come from the pass. */
export const CARD_FINISH_ORDER: CardFinish[] = ['Prisma', 'Ion', 'Eclipse'];

/** A finish this version knows (an older app gets Prisma for a newer one). */
export function cardFinishTokens(finish: string): CardFinishTokens {
  return CARD_FINISHES[finish as CardFinish] ?? CARD_FINISHES.Prisma;
}

/** The screen behind the card ("Sua carta"): deep navy with a blue glow. */
export const CARD_SCREEN = { bg: '#080924', glow: 'rgba(37,40,134,0.5)' } as const;

/** Light on the card: the glare and the darkening at the top of the photo. */
export const CARD_LIGHT = { glare: '#FFFFFF', photoTop: '#03091D' } as const;

/** A missing piece of the season card: dark glass with a hairline; the next one to win is outlined in lime. */
export const PIECE_COVER = {
  fill: '#0D0F33',
  fillOpacity: 0.94,
  edge: 'rgba(255,255,255,0.14)',
  next: '#C6F135',
  number: 'rgba(255,255,255,0.4)',
  // The small outline of the card (CardPiecesMini), on navy and on light.
  miniLine: { dark: 'rgba(255,255,255,0.28)', light: 'rgba(10,10,60,0.22)' },
  miniGlass: { dark: 'rgba(255,255,255,0.06)', light: 'rgba(10,10,60,0.05)' },
} as const;

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
// Prisma has a foil on the frame, Holográfica a rainbow. The light enhances the
// card without covering it (DECISIONS #160): the frame shows through its foil,
// the face foil is only a tint over photo and text, the glare is small.
export const CARD_TIERS: Record<CardTier, CardTierTokens> = {
  Classico: { name: 'Clássica', from: 1, frameFoil: 0, faceFoil: 0, glare: 0.14, rainbow: false },
  Prisma: { name: 'Prisma', from: 10, frameFoil: 0.5, faceFoil: 0.06, glare: 0.22, rainbow: false },
  Holografico: { name: 'Holográfica', from: 20, frameFoil: 0.6, faceFoil: 0.12, glare: 0.28, rainbow: true },
};

export const CARD_TIER_ORDER: CardTier[] = ['Classico', 'Prisma', 'Holografico'];

// Pastel rainbow, spread evenly with soft ends: no single color dominates.
export const HOLO_FOIL: Gradient = [
  'rgba(255,150,200,0)',
  'rgba(255,150,200,0.55)',
  'rgba(255,224,150,0.55)',
  'rgba(160,250,200,0.55)',
  'rgba(150,205,255,0.55)',
  'rgba(205,170,255,0.55)',
  'rgba(205,170,255,0)',
];

/** The tier a level falls in: 1–9 Clássica, 10–19 Prisma, 20+ Holográfica. */
export function cardTier(level: number): CardTier {
  return CARD_TIER_ORDER.reduce<CardTier>((tier, t) => (level >= CARD_TIERS[t].from ? t : tier), 'Classico');
}
