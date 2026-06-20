import { z } from 'zod';

/**
 * Frontend onboarding profile contract (S4).
 *
 * ⚠️ Backend alignment gate: the real F2.1 profile-create call is BLOCKED until
 * the backend Profile model confirms `@handle`, `lastName`, `birthDate`, and
 * `modality`. This schema defines the *frontend* shape so the wizard is
 * buildable/testable now; it asserts no real endpoint. See the S4 spec.
 */

export const POSITIONS = ['LEV', 'PON', 'OPO', 'CEN', 'LIB', 'COR'] as const;
export const LEVELS = ['INICIANTE', 'INTERMEDIARIO', 'AVANCADO'] as const;
export const MODALITIES = ['INDOOR', 'BEACH'] as const;

const BIRTH_DATE_MASK = /^\d{2}\/\d{2}\/\d{4}$/;

/**
 * Parses a `DD/MM/AAAA` masked string into a real calendar date, or returns
 * `null` when the day/month/year don't form a valid date (e.g. 31/02/2000).
 */
function parseMaskedDate(masked: string): Date | null {
  const parts = masked.split('/');
  if (parts.length !== 3) {
    return null;
  }
  const dd = Number(parts[0]);
  const mm = Number(parts[1]);
  const yyyy = Number(parts[2]);
  const date = new Date(yyyy, mm - 1, dd);
  const isReal =
    date.getFullYear() === yyyy &&
    date.getMonth() === mm - 1 &&
    date.getDate() === dd;
  return isReal ? date : null;
}

export const onboardingSchema = z.object({
  firstName: z.string().trim().min(1, 'Informe seu nome'),
  lastName: z.string().trim().min(1, 'Informe seu sobrenome'),
  birthDate: z
    .string()
    .regex(BIRTH_DATE_MASK, 'Data inválida') // DD/MM/AAAA
    .refine((value) => {
      const date = parseMaskedDate(value);
      // Must be a real calendar date strictly in the past.
      return date !== null && date.getTime() < Date.now();
    }, 'Data inválida'),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, '@ inválido'),
  position: z.enum(POSITIONS),
  level: z.enum(LEVELS),
  modality: z.enum(MODALITIES),
});

export type OnboardingProfileInput = z.infer<typeof onboardingSchema>;

export type Position = (typeof POSITIONS)[number];
export type Level = (typeof LEVELS)[number];
export type Modality = (typeof MODALITIES)[number];
