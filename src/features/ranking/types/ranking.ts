// Ranking domain types consumed by the profile preview card and the Ranking
// screen. The hook (src/features/ranking/api/getGroupRanking.ts) maps the
// backend payload (quadra-api DECISIONS #63, #95) into this shape. No `any`.

/** Where a player's season points came from (quadra-api DECISIONS #95). */
export type PointsBreakdown = {
  /** +10 per match. */
  attendance: number;
  /** +8 per game won (at most 3 per match). */
  wins: number;
  /** +4 per MVP vote received, +20 for the MVP of the day. */
  mvp: number;
};

/** One row of a season ranking. */
export type RankingRow = {
  /** 1-based standing position; null when the player does not qualify yet (too few games). */
  position: number | null;
  /** Short-lived photo URL. */
  photoUrl?: string;
  /** Matches played this season. */
  matches?: number;
  /** Games won this season. */
  wins?: number;
  /** MVP votes received this season. */
  votes?: number;
  /** Times MVP of the day this season. */
  mvps?: number;
  /** Season points split by reason; absent on old payloads. */
  breakdown?: PointsBreakdown;
  /** Stable player id (matched against the auth userId for the "você" row). */
  playerId: string;
  name: string;
  /** Secondary line under the name (e.g. full name / handle). */
  subtitle: string;
  /** The player's score (Russo One number). */
  score: number;
  /** Player level — drives the tier-colored level badge on the row avatar. */
  level?: number;
  /** The row is the signed-in user. */
  isMe?: boolean;
  /**
   * Movement against the ranking of 7 days ago in the same season. Absent → "—"
   * (flat), also when the player was not ranked a week ago.
   */
  trend?: { direction: 'up' | 'down' | 'flat'; delta: number };
};
