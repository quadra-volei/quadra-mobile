// Profile domain types consumed by the S8 Profile header + "Seu progresso" card
// and the "MINHAS PARTIDAS" history rows. These mirror the field shapes the S8
// mockup shows; the profile hooks (src/features/profile/api/*) map the backend
// payloads into them.
// No `any`.

import type { PlayerActionKey } from '@/features/matches/lib/playerActions';
import type { MatchFormat } from '@/features/matches/types/match';
import type { ApiTour } from '@/features/profile/api/profileApi';
import type { CardTitleCode } from '@/features/profile/card/cardTitles';
import type { Position } from '@/features/profile/schema/onboarding';
import type { CardFinish } from '@/theme/cardFinish';

/**
 * The authenticated user's identity + progress snapshot.
 * Feeds the S8 header (avatar + greeting) and the "Seu progresso" card
 * (GERAL number + Level/XP bar).
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
   * Per-skill ratings (ACE, BLK, ATK, DEF) shown in "Seu progresso" and on the
   * card. They start from the declared level and position and move with the
   * recorded actions (API DECISIONS #85). Russo One numbers.
   */
  ace: number;
  blk: number;
  atk: number;
  def: number;
  /** The recorded actions over all matches: volume and average per match. */
  actions: ProfileActions;
  /** Level number from accumulated points ("Level 15"). */
  level: number;
  /** Points earned since the current level started. */
  xp: number;
  /** Points between the current level and the next one ("XP 40 / 100"). */
  xpToNext: number;
  /** "Mostrar minhas atividades para quem me segue". */
  shareActivity?: boolean;
  /** How I left the first-access tour; null while never (or on an older API). */
  tour?: ApiTour | null;
  /** Finished matches the player was recorded in, and their outcomes (back of the card). */
  record: { matches: number; wins: number; losses: number; draws: number; mvps: number };
  /** Ranking points: attendance +10, win +15, MVP +25. */
  points: number;
  /** The card's finish, title and own photo, saved on the account. */
  cardStyle: {
    finish: CardFinish;
    title: CardTitleCode | null;
    photoUrl?: string;
    photoObjectKey: string | null;
  };

  // ── Edit-profile fields (S10) — additive; S8 reads only the fields above.
  // Optional so existing S8 consumers stay unaffected.
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

/**
 * The player's recorded actions: `matches` with a stats sheet, and per action
 * the total and the average per match where it was recorded (null: never).
 */
export type ProfileActions = {
  matches: number;
  byAction: Record<PlayerActionKey, { total: number; perMatch: number | null }>;
};

/**
 * Outcome of a played match (EMPATE: the game was ended level, with no winner;
 * SEM_PLACAR: no fixed teams, nobody wins — API DECISIONS #86).
 */
export type MatchResult = 'VITORIA' | 'DERROTA' | 'EMPATE' | 'SEM_PLACAR';

/**
 * One read-only row of the user's recent match history.
 * Feeds the "MINHAS PARTIDAS" list via `MatchHistoryRow`.
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
  /** "8 CRT · 3 SAL": the player's recorded actions in the match; empty with no sheet. */
  actionsLine: string;
  /** The player was the match's MVP. */
  isMvp: boolean;
};
