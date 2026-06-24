import { z } from 'zod';

import type { MatchFormat } from '@/features/matches/types/match';
import { LEVELS } from '@/features/profile/schema/onboarding';

/**
 * Frontend create-match contract (S11).
 *
 * ⚠️ Backend alignment gate: the real F1.1 create-match call is BLOCKED only by
 * the unresolved structured-venue/geo question (the free-text LOCAL field cannot
 * supply it). `type` + `confirmationOpensHoursBefore` are resolved and ship in
 * the final payload shape. This schema defines the *frontend* shape so the form
 * is buildable/testable now; it asserts no real endpoint. See the S11 spec.
 *
 * Enums are reused, not redeclared: `format` mirrors `MatchFormat`
 * (`@/features/matches/types/match`) and `level` mirrors the shared `LEVELS`
 * enum (`@/features/profile/schema/onboarding`).
 */

/** QUANDO quick-date keys (no custom-date '+' / no time control this iteration). */
export const CREATE_MATCH_DAYS = ['today', 'tomorrow', 'fri', 'sat'] as const;
export type CreateMatchDay = (typeof CREATE_MATCH_DAYS)[number];

/** TIPO — Avulso (OneOff) / Recorrente (Recurring). */
export const MATCH_TYPES = ['OneOff', 'Recurring'] as const;
export type MatchType = (typeof MATCH_TYPES)[number];

/**
 * CONFIRMAÇÕES ABREM preset (hours before match start the confirmation window
 * opens; it closes at match start — implicit, no datetime picker token exists).
 */
export const CONFIRMATION_OPENS_OPTIONS = [48, 24, 12, 6] as const;
export type ConfirmationOpensHoursBefore =
  (typeof CONFIRMATION_OPENS_OPTIONS)[number];

// Compile-time guard: keep the schema `format` enum in lockstep with the shared
// MatchFormat union (a mismatch would surface here, not at runtime).
const MATCH_FORMATS = ['2X2', '4X4', '6X6'] as const satisfies readonly MatchFormat[];

export const createMatchSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome à partida'),
  location: z.string().trim().min(1, 'Informe o local'),
  day: z.enum(CREATE_MATCH_DAYS),
  format: z.enum(MATCH_FORMATS),
  level: z.enum(LEVELS),
  type: z.enum(MATCH_TYPES),
  players: z.number().int().min(2, 'Mínimo de 2 jogadores'),
  price: z.number().min(0),
  confirmationOpensHoursBefore: z.union([
    z.literal(48),
    z.literal(24),
    z.literal(12),
    z.literal(6),
  ]),
  isOpen: z.boolean(),
});

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
