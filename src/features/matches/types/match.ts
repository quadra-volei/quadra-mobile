// Shared match domain types consumed by the S5 Home cards. The read hooks
// (src/features/matches/api/*) map the backend payloads into these shapes.
// No `any`.

/** Match format (players-per-side) shown as a mono pill on the dark card. */
export type MatchFormat = '2X2' | '4X4' | '6X6';

/** Skill level of a match, shown as a colored badge (`LEVEL_BADGE`). */
export type MatchLevel = 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO';

/**
 * Compact summary of one of the current user's upcoming matches.
 * Feeds the "PRÓXIMAS PARTIDAS" horizontal scroll via `MatchCardCompact`.
 */
export type UpcomingMatch = {
  id: string;
  name: string;
  /** ISO timestamp; rendered as "Hoje 19h30" / "Amanhã ...". */
  startsAt: string;
  /** Drives the level badge on the cover. */
  level: MatchLevel;
  /** "N vagas". */
  openSlots: number;
  /** "R$ 15" | "Grátis". */
  priceLabel: string;
  /** Confirmed players' avatar URLs (stacked, +N overflow). */
  avatarUrls: string[];
  /** Hex tint for the card's court-image cover gradient (tint → navy). */
  tint: string;
  /** The cover the organizer uploaded; without one the card shows the tinted court. */
  coverUrl?: string;
  /** Venue address ("Hoje · 19h30 · Arena Pinheiros" on the next-game card). */
  venue: string;
  /** The user's own presence is confirmed (picks "VOCÊ ENTRA EM QUADRA"). */
  confirmed: boolean;
};

/**
 * A match happening near the user.
 * Feeds the "JOGOS PERTO DE VOCÊ" 2-col grid via the dark `MatchCard`.
 */
export type NearbyMatch = {
  id: string;
  name: string;
  format: MatchFormat;
  level: MatchLevel;
  /** "1,2 km". */
  distanceKm: number;
  /** Confirmed players, rendered as "2/8". */
  confirmed: number;
  capacity: number;
  /** "R$ 25" | "Grátis". */
  priceLabel: string;
  /** Price in reais, null when free (Explore price filter). */
  price?: number | null;
  /** Hex tint for the card's court-image cover gradient (tint → navy). */
  tint: string;
  /** The cover the organizer uploaded; without one the card shows the tinted court. */
  coverUrl?: string;
  /** The venue address (map preview). */
  venue?: string;
  /**
   * Geographic coordinates of the venue, used to place the match pin on the S17
   * map. A geo-nearby endpoint inherently returns per-match coordinates, so this
   * stays within F1.7's payload. Additive and unused by S5/S6/`MatchCard`.
   */
  lat: number;
  lon: number;
  /** ISO start timestamp (drives the "Hoje" filter on Explore). */
  startsAt?: string;
};
