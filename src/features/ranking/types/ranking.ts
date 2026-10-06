// Ranking domain types consumed by the S8 "Ranking semanal" preview card and
// the S9 full group ranking. The hook (src/features/ranking/api/getGroupRanking.ts)
// maps the backend F2.3 payload into this shape. No `any`.

/**
 * One row of the weekly group ranking.
 * `isMe` is filled by the hook; the screen also derives the highlight from
 * `useAuthStore().userId` matched against `playerId` (see S8 spec impl notes).
 */
export type RankingRow = {
  /** 1-based standing position. */
  position: number;
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
   * Movement since the previous ranking period. Absent → render "—" (flat).
   * Additive/optional so the S8 preview (which doesn't render trend) is
   * unaffected. Not filled today: the backend keeps no ranking history.
   */
  trend?: { direction: 'up' | 'down' | 'flat'; delta: number };
};
