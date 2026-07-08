// Level-tier badge palette — the token layer for the small level "bolinha" shown
// on avatars. Mirrors the prototype's LEVEL_TIERS (data.js): neighboring brackets
// use complementary hues. Components read `levelTier(level)` for the badge fill +
// a readable number color; screens never inline these hex values.

type Tier = { max: number; color: string };

// 1–5 cyan · 5–15 orange · 15–30 electric blue · 30–50 lime · 50–75 violet · 75+ elite blue.
const TIERS: Tier[] = [
  { max: 5, color: '#00B4D8' },
  { max: 15, color: '#FF6B00' },
  { max: 30, color: '#1A1AFF' },
  { max: 50, color: '#AADD00' },
  { max: 75, color: '#6B1AFF' },
  { max: Number.POSITIVE_INFINITY, color: '#3FA9FF' },
];

const ELITE: Tier = { max: Number.POSITIVE_INFINITY, color: '#3FA9FF' };

const NAVY = '#0A0A3C'; // surface-dark token
const WHITE = '#FFFFFF';

export type LevelTier = {
  /** Solid badge background color. */
  color: string;
  /** Readable number color over the badge (light tiers → navy, dark → white). */
  textColor: string;
};

/** Luma-based readable text color over a tier color (mirrors prototype `readableOn`). */
function readableOn(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? NAVY : WHITE;
}

/** Resolves the badge color + readable number color for a player level. */
export function levelTier(level: number): LevelTier {
  const tier = TIERS.find((t) => level <= t.max) ?? ELITE;
  return { color: tier.color, textColor: readableOn(tier.color) };
}
