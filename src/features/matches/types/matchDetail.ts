// Match-detail domain types consumed by the S12 Match Detail screen and the
// matches hooks (src/features/matches/api/*), which map the backend payloads
// into them. No `any`.

import type { MatchFormat, MatchLevel } from '@/features/matches/types/match';

/** Court position abbreviations (no per-position color — contrast-based pill). */
export type PlayerPosition = 'LEV' | 'PON' | 'OPO' | 'CEN' | 'LIB' | 'COR';

/** Per-player presence status in the confirmed grid. */
export type PresenceStatus = 'CONFIRMADO' | 'RECUSADO' | 'PENDENTE';

/**
 * How the current user is attached to the match:
 * - REGULAR — invited regular participant (sees confirm/decline).
 * - DROPIN — joined an open drop-in slot.
 * - null — not (yet) a participant (may see "Entrar na partida").
 */
export type ParticipationType = 'REGULAR' | 'DROPIN';

/** How the organizer wants the teams drawn. */
export type DrawMode = 'MANUAL' | 'AUTO';

/**
 * How the match is charged:
 * - AVULSO — a single per-session price, the only one shown.
 * - RECORRENTE — a per-session price for drop-ins AND a monthly price for
 *   regulars; both are shown side by side in the VALORES section.
 */
export type PricePlan = 'AVULSO' | 'RECORRENTE';

/** One player rendered in the confirmed-players grid (PresenceGrid). */
export type PresencePlayer = {
  id: string;
  name: string;
  avatarUrl?: string;
  status: PresenceStatus;
  position?: PlayerPosition;
  /**
   * Player level, rendered as the tier-colored "bolinha" on the avatar and
   * explained by the legend under the grid. Absent for guests (no account, so
   * no level) — the badge is then omitted.
   */
  level?: number;
  /**
   * A manually-added guest occupying a slot (has no app account). Added by the
   * organizer from S12 to fill an open "vaga"; always CONFIRMADO. Rendered with
   * a "convidado" tag in the grid.
   */
  isGuest?: boolean;
};

/** The match organizer shown in the white info card's "Organizado por" row. */
export type MatchOrganizer = {
  id: string;
  name: string;
  avatarUrl?: string;
  position?: PlayerPosition;
  /** Level badge on the organizer's avatar; omitted when unknown. */
  level?: number;
};

/** Organizer team-configuration defaults (read for S12, carried into S13). */
export type TeamConfig = {
  teamCount: 2 | 3 | 4;
  perTeam: number;
  drawMode: DrawMode;
};

/**
 * Full match-detail payload (F1.2). Drives the hero header, the 2×2 metadata
 * grid, the organizer row, the confirmed-players grid, the countdown strip, the
 * participant footer CTAs, and the organizer team-config block.
 */
export type MatchDetail = {
  id: string;
  name: string;
  format: MatchFormat;
  level: MatchLevel;
  venue: string;
  /** "1,2 km" rendered with a comma decimal. */
  distanceKm: number;
  /** Hex tint the hero cover gradient runs from (tint → navy). */
  tint: string;
  /** "R$ 25" | "Grátis" — the per-session (avulso) price. */
  priceLabel: string;
  /** Whether the match charges per session only, or also on a monthly plan. */
  pricePlan: PricePlan;
  /** "R$ 50" — the monthly price; present only when pricePlan is RECORRENTE. */
  priceMonthlyLabel?: string;
  /** Total slots; PresenceGrid renders empties beyond confirmed as "vaga". */
  capacity: number;

  /** ISO timestamp the match starts at (drives the "Começa em …" countdown). */
  startsAt: string;
  /** ISO timestamp confirmations close at (drives "Confirmações fecham em …"). */
  confirmationClosesAt: string;
  /** Whether the confirmation window has already closed. */
  confirmationWindowClosed: boolean;

  organizerId: string;
  organizer: MatchOrganizer;

  players: PresencePlayer[];

  /** Open drop-in slots available to non-Regular users once the window closes. */
  openDropInSlots: number;

  /** Current user's participation (null when not a participant). */
  myParticipationType: ParticipationType | null;
  /** Current user's presence status (null when not a participant). */
  myStatus: PresenceStatus | null;

  /** Organizer team-config defaults (carried into S13). */
  teamConfig: TeamConfig;

  /** A non-participant may take a slot now (a full match queues them). */
  canJoin?: boolean;
  /** Private match joined by code: the join CTA asks for the code first. */
  requiresInviteCode?: boolean;
  /** The invite code of a private match — only the organizer receives it. */
  inviteCode?: string;
  /** The current user's place in the waiting list, when queued. */
  myWaitingListPosition?: number | null;
  /** Where the game is; null/absent until the organizer starts it. */
  game?: MatchGameStage | null;
};

/**
 * The step of the game a match is at, which decides where its CTA leads:
 * - LIVE — being played (live scoreboard);
 * - VOTING — over, MVP voting open;
 * - SUMMARY — the organizer generated the summary.
 */
export type MatchGameStage = 'LIVE' | 'VOTING' | 'SUMMARY';
