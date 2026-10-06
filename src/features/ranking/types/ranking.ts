// Ranking domain types consumed by the S8 "Ranking semanal" preview card and
// (later) the S9 full group ranking. Mirrors the shape the S8 mockup shows so
// the real F2.3 (group ranking) payload can slot in unchanged behind the mocked
// hook signature. Shared with S9. No `any`.

/**
 * One row of the weekly group ranking.
 * `isMe` is a mock convenience flag; the screen derives the real highlight from
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
  /** Mock-only convenience flag; screen prefers the userId match. */
  isMe?: boolean;
  /**
   * Movement since the previous ranking period. Absent → render "—" (flat).
   * Additive/optional so the S8 preview (which doesn't render trend) is
   * unaffected. The mock populates it for the S9 full list.
   * TODO(real-api): F2.3 supplies the real trend semantics.
   */
  trend?: { direction: 'up' | 'down' | 'flat'; delta: number };
};
