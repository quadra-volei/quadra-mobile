/**
 * Create-match helpers: the record the "partida criada" screen shows, and the
 * resolution of the entered schedule to a concrete start timestamp.
 */
import type { CreateMatchInput } from '@/features/matches/schema/createMatch';

/**
 * A match the current user just created: the id the backend gave it plus the
 * form input, for the confirmation screen.
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

/** Fallback hour when the entered `time` is missing/malformed. */
const DEFAULT_MATCH_HOUR = 19;

/** Parses a 'HHhMM' time string ('19h30') → {hour, minute}; evening fallback. */
function parseTime(time: string | undefined): { hour: number; minute: number } {
  const match = /^(\d{1,2})h(\d{2})$/.exec(time ?? '');
  if (!match) return { hour: DEFAULT_MATCH_HOUR, minute: 0 };
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** Parses a 'DD/MM/AAAA' date string → Date (local midnight), or null. */
function parseBrDate(value: string | undefined): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value ?? '');
  if (!match) return null;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
}

/**
 * Resolves the entered schedule (OneOff Hoje/Amanhã/Data or the Recurring start
 * date, plus the chosen time-of-day) to a concrete ISO start timestamp. Pure —
 * `now` is injectable so the output is deterministic under test.
 */
export function resolveMatchStartsAt(
  input: Pick<
    CreateMatchInput,
    'type' | 'whenType' | 'customDate' | 'recStart' | 'time'
  >,
  now: Date = new Date(),
): string {
  const { hour, minute } = parseTime(input.time);
  const d = new Date(now.getTime());

  if (input.type === 'Recurring') {
    const start = parseBrDate(input.recStart);
    if (start) {
      d.setFullYear(start.getFullYear(), start.getMonth(), start.getDate());
    }
  } else if (input.whenType === 'tomorrow') {
    d.setDate(d.getDate() + 1);
  } else if (input.whenType === 'date') {
    const custom = parseBrDate(input.customDate);
    if (custom) {
      d.setFullYear(custom.getFullYear(), custom.getMonth(), custom.getDate());
    }
  }
  // OneOff 'today' → keep `now`'s date.

  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

