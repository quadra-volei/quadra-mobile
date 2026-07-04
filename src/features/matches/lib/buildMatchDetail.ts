/**
 * Create-match → domain mapping helpers.
 *
 * The S11 create flow ships mocked (no F1.1 backend yet), but the data the
 * organizer types must be **persisted in memory** so the success screen and the
 * subsequent screens/flows (S12 detail, home lists) show the *real* entered
 * values instead of a static fixture. These pure helpers turn the raw
 * `CreateMatchInput` (kept as the session source of truth) into the shapes the
 * read layers consume: `MatchDetail` (S12) and `UpcomingMatch` (S5 home).
 *
 * TODO(real-api): once F1.1 lands, the backend owns id generation, the resolved
 * start timestamp, and the organizer/player payload; these mappers become the
 * response adapter (or are dropped) behind the unchanged read-hook signatures.
 */
import type { UpcomingMatch } from '@/features/matches/types/match';
import type { MatchDetail } from '@/features/matches/types/matchDetail';
import type {
  CreateMatchDay,
  CreateMatchInput,
} from '@/features/matches/schema/createMatch';

/**
 * A match created by the current user this session. Stores the raw entered
 * input verbatim (the source of truth) plus the fields resolved once at create
 * time — the generated id, the organizer, and the concrete start timestamp
 * derived from the QUANDO quick-date chip.
 */
export type CreatedMatch = {
  id: string;
  organizerId: string;
  /** ISO timestamp the match starts at, resolved from `input.day`. */
  startsAt: string;
  /** ISO timestamp the match was created (session ordering). */
  createdAt: string;
  /** Local URI of the picked cover image, if any. */
  coverUri?: string;
  /** The validated form input, kept verbatim as entered. */
  input: CreateMatchInput;
};

/** No time-of-day control exists this iteration; default matches to the evening. */
const DEFAULT_MATCH_HOUR = 19;

/** Advance `d` in place to the next occurrence of `weekday` (0=Sun … 6=Sat), today included. */
function advanceToWeekday(d: Date, weekday: number): void {
  const delta = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + delta);
}

/**
 * Resolves a QUANDO quick-date chip to a concrete ISO start timestamp
 * (at {@link DEFAULT_MATCH_HOUR}:00 local). Pure — `now` is injectable so the
 * output is deterministic under test.
 */
export function resolveMatchStartsAt(
  day: CreateMatchDay,
  now: Date = new Date(),
): string {
  const d = new Date(now.getTime());
  d.setHours(DEFAULT_MATCH_HOUR, 0, 0, 0);
  if (day === 'tomorrow') {
    d.setDate(d.getDate() + 1);
  } else if (day === 'fri') {
    advanceToWeekday(d, 5);
  } else if (day === 'sat') {
    advanceToWeekday(d, 6);
  }
  // 'today' → keep the resolved evening of `now`.
  return d.toISOString();
}

/** "Grátis" for 0, "R$ N" otherwise — shared by both mappers. */
export function formatPriceLabel(price: number): string {
  return price === 0 ? 'Grátis' : `R$ ${price}`;
}

/**
 * Builds the full S12 `MatchDetail` from a created-match record. The current
 * user is the organizer (so the S12 organizer view renders) and the only
 * confirmed player at creation time; open drop-in slots exist only when the
 * match is public.
 */
export function buildMatchDetail(match: CreatedMatch): MatchDetail {
  const { input } = match;
  const teamCount = 2 as const;
  const perTeam = Math.max(1, Math.floor(input.players / teamCount));

  return {
    id: match.id,
    name: input.name,
    format: input.format,
    level: input.level,
    venue: input.location,
    // Own match — no distance-from-me concept until F1.7 geo lands.
    distanceKm: 0,
    priceLabel: formatPriceLabel(input.price),
    capacity: input.players,
    startsAt: match.startsAt,
    // No datetime picker this iteration: the window closes at match start.
    confirmationClosesAt: match.startsAt,
    confirmationWindowClosed: false,
    organizerId: match.organizerId,
    organizer: { id: match.organizerId, name: 'Você' },
    players: [
      { id: match.organizerId, name: 'Você', status: 'CONFIRMADO' },
    ],
    openDropInSlots: input.isOpen ? Math.max(0, input.players - 1) : 0,
    myParticipationType: null,
    myStatus: null,
    teamConfig: { teamCount, perTeam, drawMode: 'MANUAL' },
  };
}

/** Builds the compact S5 home-card summary from a created-match record. */
export function buildUpcomingMatch(match: CreatedMatch): UpcomingMatch {
  const { input } = match;
  return {
    id: match.id,
    name: input.name,
    startsAt: match.startsAt,
    category: input.level === 'AVANCADO' ? 'COMPETITIVO' : 'CASUAL',
    // Organizer occupies one slot.
    openSlots: Math.max(0, input.players - 1),
    priceLabel: formatPriceLabel(input.price),
    avatarUrls: [],
  };
}
