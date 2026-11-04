// The player card's look (DECISIONS #199). Everyone has the basic card; the only
// other look is the season card, built piece by piece on the season pass and
// equipped once complete. The free finishes (Prisma, Íon, Eclipse) and the level
// tiers are gone for now: the API still stores those names, and any of them
// draws as the basic card. Components read `cardFinishTokens(finish)`; screens
// never inline these hex values.

/** What the API stores: the old free finishes (all drawn as the basic card) and the season finishes. */
export type CardFinish = 'Prisma' | 'Ion' | 'Eclipse' | 'Pioneira';

/** The name sent to go back to the basic card: the API's default finish. */
export const BASIC_FINISH: CardFinish = 'Prisma';

type Gradient = readonly [string, string, ...string[]];

export type CardFinishTokens = {
  /** Shown on the back and in the collection. */
  name: string;
  /** Card body behind the text. */
  surface: string;
  /** Main text on the card. */
  ink: string;
  /** Secondary text (nickname, labels). */
  muted: string;
  /** Hairlines and the position pill border. */
  edge: string;
  /** Title eyebrow, big numbers. */
  accent: string;
  /** Frame, diagonal. */
  frame: Gradient;
  /** Band that slides over the frame with the light. */
  foil: Gradient;
  shape: 'chamfer' | 'rounded';
  /** How strong the light is. */
  light: CardLight;
  /** The finished season card's extras (sparkles, aura, seal, light that moves by itself). */
  extravagant?: Extravagant;
};

export type CardLight = {
  /** Opacity of the foil band on the frame, of the foil over the face and of the glare. */
  frameFoil: number;
  faceFoil: number;
  glare: number;
  /** Rainbow foil over the face instead of the finish's own foil. */
  rainbow: boolean;
};

export type Extravagant = {
  /** The seal on the front: season and card name. */
  seal: string;
  /** Glow around the card. */
  aura: Gradient;
  /** Twinkling stars over the frame and the photo. */
  sparkle: string;
};

// Pastel rainbow, spread evenly with soft ends: no single color dominates.
export const HOLO_FOIL: Gradient = [
  'rgba(255,150,200,0)',
  'rgba(255,150,200,0.7)',
  'rgba(255,224,150,0.7)',
  'rgba(160,250,200,0.7)',
  'rgba(150,205,255,0.7)',
  'rgba(205,170,255,0.7)',
  'rgba(205,170,255,0)',
];

// Plain and matte on purpose: the season card is the one that shines.
const BASICA: CardFinishTokens = {
  name: 'Básica',
  surface: '#161A33',
  ink: '#FFFFFF',
  muted: '#AEB4CC',
  edge: 'rgba(255,255,255,0.12)',
  accent: '#C6F135',
  frame: ['#5A6080', '#3A3F5C', '#5A6080'],
  foil: ['rgba(255,255,255,0)', 'rgba(255,255,255,0)'],
  shape: 'chamfer',
  light: { frameFoil: 0, faceFoil: 0, glare: 0.08, rainbow: false },
};

// The first season's card, complete: gold and chrome with the brand's lime and
// purple, a strong rainbow foil and the extras. Placeholder until the
// designer's art (Johny, 04/11: "extravagância" for the finished card).
const PIONEIRA: CardFinishTokens = {
  name: 'Pioneira',
  surface: '#0B1238',
  ink: '#FFFFFF',
  muted: '#D4DBFF',
  edge: 'rgba(255,214,102,0.35)',
  accent: '#FFD666',
  frame: ['#FFF6C8', '#E0A526', '#C6F135', '#FFF6C8', '#8E4BFF', '#FFD666', '#FFFFFF', '#C6F135'],
  foil: ['rgba(255,214,102,0)', 'rgba(255,214,102,0.9)', 'rgba(198,241,53,0.85)', 'rgba(170,110,255,0.85)', 'rgba(255,214,102,0)'],
  shape: 'chamfer',
  light: { frameFoil: 0.95, faceFoil: 0.2, glare: 0.34, rainbow: true },
  extravagant: {
    seal: 'T1 · PIONEIRA',
    aura: ['rgba(255,214,102,0.55)', 'rgba(198,241,53,0.35)', 'rgba(142,75,255,0.45)'],
    sparkle: '#FFF6C8',
  },
};

const SEASON_FINISHES: Partial<Record<CardFinish, CardFinishTokens>> = { Pioneira: PIONEIRA };

/** Whether a finish is a season card (only a complete pass gives it). */
export function isSeasonFinish(finish: string): boolean {
  return finish in SEASON_FINISHES;
}

/** The look of a finish: a season card, else the basic card (also for a finish this version does not know). */
export function cardFinishTokens(finish: string): CardFinishTokens {
  return SEASON_FINISHES[finish as CardFinish] ?? BASICA;
}

/** The screen behind the card ("Sua carta"): deep navy with a blue glow. */
export const CARD_SCREEN = { bg: '#080924', glow: 'rgba(37,40,134,0.5)' } as const;

/** Light on the card: the glare and the darkening at the top of the photo. */
export const CARD_LIGHT = { glare: '#FFFFFF', photoTop: '#03091D' } as const;

/** A missing piece of the season card: dark glass with a hairline; the next one to win is outlined in lime. */
export const PIECE_COVER = {
  fill: '#0D0F33',
  // A hint of the art shows through; the name and photo do not.
  fillOpacity: 0.97,
  edge: 'rgba(255,255,255,0.14)',
  next: '#C6F135',
  number: 'rgba(255,255,255,0.4)',
  // The small outline of the card (CardPiecesMini), on navy and on light.
  miniLine: { dark: 'rgba(255,255,255,0.28)', light: 'rgba(10,10,60,0.22)' },
  miniGlass: { dark: 'rgba(255,255,255,0.06)', light: 'rgba(10,10,60,0.05)' },
} as const;
