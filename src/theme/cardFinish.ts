// Player-card finishes ("Sua carta", DECISIONS #119) — the token layer for the
// collectible card. The player picks one; it is saved on the account. Components
// read `CARD_FINISHES[finish]`; screens never inline these hex values.

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
  /** The logo blocks and "quadra" wordmark on the card. */
  wordmark: string;
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
    wordmark: '#FFFFFF',
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
    wordmark: '#123A39',
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
    wordmark: '#FFFFFF',
    shape: 'chamfer',
    swatch: ['#765143', '#251D28'],
  },
};

export const CARD_FINISH_ORDER: CardFinish[] = ['Prisma', 'Ion', 'Eclipse'];

/** The screen behind the card ("Sua carta"): deep navy with a blue glow. */
export const CARD_SCREEN = { bg: '#080924', glow: 'rgba(37,40,134,0.5)' } as const;

/** Light on the card: the glare and the darkening at the top of the photo. */
export const CARD_LIGHT = { glare: '#FFFFFF', photoTop: '#03091D' } as const;
