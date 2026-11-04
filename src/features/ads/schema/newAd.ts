import { z } from 'zod';

/**
 * The "Anunciar" form (DECISIONS #200). The limits mirror the API's (API DECISIONS #102), which
 * checks everything again: title 3–40, text up to 120, https links only, WhatsApp with the
 * country code.
 */
export const AD_TITLE_MAX = 40;
export const AD_BODY_MAX = 120;

/** `DD/MM/AAAA` → `YYYY-MM-DD`, or null when it is not a real date. */
export function toIsoDay(masked: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(masked);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCDate() !== Number(day) || date.getUTCMonth() !== Number(month) - 1) return null;
  return `${year}-${month}-${day}`;
}

/** Today in Brasília as `YYYY-MM-DD` (the API counts days in Brasília). */
export function brasiliaToday(now: Date = new Date()): string {
  return new Date(now.getTime() - 3 * 60 * 60_000).toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` → `DD/MM/AAAA`. */
export function toMasked(isoDay: string): string {
  const [year, month, day] = isoDay.split('-');
  return `${day}/${month}/${year}`;
}

/** Only the digits of a phone; a Brazilian number without the country code gets 55. */
export function whatsAppDigits(input: string): string {
  const digits = input.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}

export const newAdSchema = z
  .object({
    placement: z.enum(['Home', 'Map', 'Opening']),
    radiusKm: z.number(),
    weeks: z.number(),
    startsOn: z
      .string()
      .refine((value) => toIsoDay(value) != null, 'Data inválida')
      .refine((value) => (toIsoDay(value) ?? '') >= brasiliaToday(), 'Escolha hoje ou um dia depois'),
    title: z.string().trim().min(3, 'Escreva um título de 3 letras ou mais').max(AD_TITLE_MAX, 'Título muito longo'),
    body: z.string().trim().max(AD_BODY_MAX, 'Texto muito longo'),
    linkKind: z.enum(['None', 'WhatsApp', 'Url']),
    linkValue: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    if (value.linkKind === 'WhatsApp' && !/^\d{12,13}$/.test(whatsAppDigits(value.linkValue))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['linkValue'], message: 'Número com DDD, ex.: 11 99999-8888' });
    }
    if (value.linkKind === 'Url' && !/^https:\/\/[^\s/]+\.[^\s]+$/.test(value.linkValue)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['linkValue'], message: 'Endereço completo, começando com https://' });
    }
  });

export type NewAdInput = z.infer<typeof newAdSchema>;
