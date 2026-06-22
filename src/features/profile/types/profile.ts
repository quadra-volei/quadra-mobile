// Profile domain types consumed by the S8 Profile header + "Seu progresso" card,
// the S10 Settings summary/edit form, and the "MINHAS PARTIDAS" history rows.
// These mirror the field shapes the mockups show so the real F2.1/F2.2 (profile +
// progress) and F1.6 (match history) payloads can slot in unchanged behind the
// mocked hook signatures. No `any`.

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
  lastName: string;
  /** @handle without the leading "@". */
  handle: string;
  /** Masked birth date `DD/MM/AAAA`. */
  birthDate: string;
  /** National phone digits only (BR). */
  phone: string;
  position: Position;
  /** Avatar image URL; `Avatar` falls back to the initial when absent. */
  avatarUrl?: string;
  /** GERAL overall score (Russo One number). */
  overall: number;
  /** Player level ("Level 15"). */
  level: number;
  /** Current XP toward the next level. */
  xp: number;
  /** XP needed to reach the next level ("XP 2.450 / 5.000"). */
  xpToNext: number;
};

/** Win/loss outcome of a played match. */
export type MatchResult = 'VITORIA' | 'DERROTA';

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
