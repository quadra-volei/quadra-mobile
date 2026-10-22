/**
 * The five actions recorded per player and match (API DECISIONS #84): plain
 * counts, in the order the app always lists them. Each one feeds a rating on
 * the card (API DECISIONS #85): cortadas → ATK, blocks → BLK, aces → ACE,
 * salvadas → DEF; assistências count as half a cortada in ATK.
 */
export const PLAYER_ACTIONS = [
  { key: 'kills', label: 'Cortadas', short: 'CRT' },
  { key: 'blocks', label: 'Blocks', short: 'BLK' },
  { key: 'aces', label: 'Aces', short: 'ACE' },
  { key: 'digs', label: 'Salvadas', short: 'SAL' },
  { key: 'assists', label: 'Assistências', short: 'AST' },
] as const;

export type PlayerActionKey = (typeof PLAYER_ACTIONS)[number]['key'];

/** One player's counts in one match. */
export type PlayerActions = Record<PlayerActionKey, number>;

/** Highest count the API accepts for one action in one match. */
export const MAX_ACTION_COUNT = 99;

export const NO_ACTIONS: PlayerActions = { kills: 0, blocks: 0, aces: 0, digs: 0, assists: 0 };

/** Points a finished match gives (API PlayerProgression): attendance +10, win +15, MVP +25. */
export function matchPoints(won: boolean, mvp: boolean): number {
  return 10 + (won ? 15 : 0) + (mvp ? 25 : 0);
}
