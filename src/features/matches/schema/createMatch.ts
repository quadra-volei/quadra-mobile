import { z } from 'zod';

import type { MatchFormat } from '@/features/matches/types/match';
import { LEVELS } from '@/features/profile/schema/onboarding';

/**
 * Frontend create-match contract (S11) — "formulário vivo" (progressive
 * disclosure) port of the Quadra prototype (`screens-create.jsx`).
 *
 * The form is a single conversational flow: each answer reveals the next block.
 * The schema is a flat object (so React Hook Form owns every field) with a
 * `superRefine` enforcing the branch-dependent requirements — OneOff needs a
 * `whenType` (+ `customDate` when "Outra data"), Recurring needs `recDays` +
 * `recStart`, and a private match needs an `inviteMode`.
 *
 * The LOCAL field is free text with address suggestions: picking one also sets
 * `latitude`/`longitude`; typed text alone is still accepted. The API body is
 * built from this input by `toApiCreateMatch` (`api/matchesApi.ts`).
 *
 * Enums are reused, not redeclared: `format` mirrors `MatchFormat`
 * (`@/features/matches/types/match`) and `level` mirrors the shared `LEVELS`
 * enum (`@/features/profile/schema/onboarding`).
 */

/** TIPO — Avulso (OneOff) / Recorrente (Recurring). */
export const MATCH_TYPES = ['OneOff', 'Recurring'] as const;
export type MatchType = (typeof MATCH_TYPES)[number];

/** QUANDO (OneOff only) — Hoje / Amanhã / Outra data. */
export const WHEN_TYPES = ['today', 'tomorrow', 'date'] as const;
export type WhenType = (typeof WHEN_TYPES)[number];

/** Recurring frequency. UI labels: Semanal / Quinzenal / Mensal. */
export const REC_FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const;
export type RecFrequency = (typeof REC_FREQUENCIES)[number];

/** Time-of-day quick presets (Avulso + Recorrente); "Outro horário" adds a custom value. */
export const TIME_PRESETS = ['19h00', '20h00'] as const;

/** Match duration presets ("Quanto tempo de jogo?"). Default 1h30. */
export const MATCH_DURATIONS = [
  '1h',
  '1h30',
  '2h',
  '2h30',
  '3h',
  '3h30',
  '4h',
] as const;
export type MatchDuration = (typeof MATCH_DURATIONS)[number];

/**
 * CONFIRMAÇÕES ABREM preset (hours before match start the confirmation window
 * opens; it closes at match start — implicit, no datetime picker token exists).
 */
export const CONFIRMATION_OPENS_OPTIONS = [48, 24, 12, 6] as const;
export type ConfirmationOpensHoursBefore =
  (typeof CONFIRMATION_OPENS_OPTIONS)[number];

/** PRIVACIDADE — Aberta (open) / Privada (private). */
export const PRIVACY_MODES = ['open', 'private'] as const;
export type PrivacyMode = (typeof PRIVACY_MODES)[number];

/** Invite mode for a private match — Código de convite / Somente convidados. */
export const INVITE_MODES = ['code', 'guests'] as const;
export type InviteMode = (typeof INVITE_MODES)[number];

// Compile-time guard: keep the schema `format` enum in lockstep with the shared
// MatchFormat union (a mismatch would surface here, not at runtime).
const MATCH_FORMATS = ['2X2', '4X4', '6X6'] as const satisfies readonly MatchFormat[];

/** Suggested player count per format — pre-fills the "Jogadores" stepper. */
export const SUGGESTED_PLAYERS: Record<MatchFormat, number> = {
  '2X2': 4,
  '4X4': 8,
  '6X6': 12,
};

/** True for a real `DD/MM/AAAA` calendar date. Empty/malformed → false. */
export function isValidBrDate(value: string | undefined): boolean {
  if (!value) return false;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export const createMatchSchema = z
  .object({
    // ── Bloco 1 · nome ──
    name: z.string().trim().min(1, 'Dê um nome à partida'),
    // ── Bloco 2 · local ──
    location: z.string().trim().min(1, 'Informe o local'),
    // Set when the location was picked from the address search; absent for free text.
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    // ── Bloco 3 · tipo + agenda ──
    type: z.enum(MATCH_TYPES),
    // OneOff scheduling
    whenType: z.enum(WHEN_TYPES).optional(),
    customDate: z.string().optional(), // DD/MM/AAAA when whenType === 'date'
    // Recurring scheduling
    recDays: z.array(z.number().int().min(0).max(6)).default([]),
    recFreq: z.enum(REC_FREQUENCIES).default('weekly'),
    recStart: z.string().optional(), // DD/MM/AAAA
    // Shared schedule
    time: z.string().min(1, 'Escolha um horário'), // 'HHhMM'
    duration: z.enum(MATCH_DURATIONS),
    // ── Bloco 4 · formato ──
    format: z.enum(MATCH_FORMATS),
    players: z.number().int().min(2, 'Mínimo de 2 jogadores'),
    // ── Bloco 5 · nível ──
    level: z.enum(LEVELS),
    // ── Bloco 6 · valor ──
    price: z.number().min(0), // avulso; 0 ⇒ "Grátis"
    priceMonthly: z.number().min(0), // recorrente (only used when type === 'Recurring')
    // ── Bloco 7 · confirmações ──
    confirmationOpensHoursBefore: z.union([
      z.literal(48),
      z.literal(24),
      z.literal(12),
      z.literal(6),
    ]),
    // ── Bloco 8 · privacidade ──
    privacy: z.enum(PRIVACY_MODES),
    inviteMode: z.enum(INVITE_MODES).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'OneOff') {
      if (!v.whenType) {
        ctx.addIssue({
          path: ['whenType'],
          code: z.ZodIssueCode.custom,
          message: 'Escolha quando vai rolar',
        });
      } else if (v.whenType === 'date' && !isValidBrDate(v.customDate)) {
        ctx.addIssue({
          path: ['customDate'],
          code: z.ZodIssueCode.custom,
          message: 'Informe a data',
        });
      }
    } else {
      if (v.recDays.length === 0) {
        ctx.addIssue({
          path: ['recDays'],
          code: z.ZodIssueCode.custom,
          message: 'Escolha ao menos um dia',
        });
      }
      if (!isValidBrDate(v.recStart)) {
        ctx.addIssue({
          path: ['recStart'],
          code: z.ZodIssueCode.custom,
          message: 'Informe a data de início',
        });
      }
    }
    if (v.privacy === 'private' && !v.inviteMode) {
      ctx.addIssue({
        path: ['inviteMode'],
        code: z.ZodIssueCode.custom,
        message: 'Escolha como convidar',
      });
    }
  });

export type CreateMatchInput = z.infer<typeof createMatchSchema>;

/**
 * Whether the whole conversational form is answered enough to submit — mirrors
 * the schema's `superRefine` so the sticky footer CTA can gate ("Criar partida"
 * vs "Responda pra continuar") without surfacing field errors mid-flow.
 */
export function isCreateMatchComplete(v: Partial<CreateMatchInput>): boolean {
  return createMatchSchema.safeParse(v).success;
}
