// Profile domain types consumed by the S8 Profile header + "Seu progresso" card
// and the "MINHAS PARTIDAS" history rows. These mirror the field shapes the S8
// mockup shows so the real F2.1/F2.2 (profile + progress) and F1.6 (match
// history) payloads can slot in unchanged behind the mocked hook signatures.
// No `any`.

import type { MatchFormat } from '@/features/matches/types/match';
import type { Position } from '@/features/profile/schema/onboarding';

/**
 * The authenticated user's identity + progress snapshot.
 * Feeds the S8 header (avatar + greeting) and the "Seu progresso" card
 * (GERAL number + Level/XP bar). MOCK now; real F2.1/F2.2 later.
 */
export type MyProfile = {
  id: string;
  /** First name, rendered uppercase in the header ("RENAN"). */
  firstName: string;
  /** Avatar image URL; `Avatar` falls back to the initial when absent. */
  avatarUrl?: string;
  /** GERAL overall score (Russo One number). */
  overall: number;
  /**
   * Per-skill ratings shown in the "Seu progresso" 2×2 grid (ace/blk/ata/def)
   * and the full 6-stat grid on the player card (adds srv/rec). Russo One
   * numbers. MOCK now; real F2.2 progress payload supplies these later.
   */
  ace: number;
  blk: number;
  ata: number;
  def: number;
  srv: number;
  rec: number;
  /** Player level ("Level 15"). */
  level: number;
  /** Current XP toward the next level. */
  xp: number;
  /** XP needed to reach the next level ("XP 2.450 / 5.000"). */
  xpToNext: number;

  // ── Edit-profile fields (S10) — additive; S8 reads only the fields above.
  // Optional so existing S8 consumers stay unaffected; the mock populates them.
  /** Family name, shown in S10's summary ("Renan Dias") + edit SOBRENOME. */
  lastName?: string;
  /** @handle without the leading '@' (e.g. "renan"). */
  handle?: string;
  /** Birth date as a `DD/MM/AAAA` masked string (matches DateField/onboarding). */
  birthDate?: string;
  /** Phone — national digits only (matches the PhoneInput contract). */
  phone?: string;
  /** Court position code (e.g. "LEV"); label resolved via positionLabel(). */
  position?: Position;
};

/** Outcome of a played match (EMPATE: the game was ended level, with no winner). */
export type MatchResult = 'VITORIA' | 'DERROTA' | 'EMPATE';

/**
 * One read-only row of the user's recent match history.
 * Feeds the "MINHAS PARTIDAS" list via `MatchHistoryRow`. MOCK now; F1.6 later.
 */
export type RecentMatch = {
  id: string;
  name: string;
  /** ISO timestamp; rendered "Ontem · 19h30" / "20/06". */
  playedAt: string;
  format: MatchFormat;
  result: MatchResult;
  /** Set score, e.g. "3-1" | "1-3". */
  setScore: string;
};
