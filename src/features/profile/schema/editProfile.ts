import { z } from 'zod';

import {
  BIRTH_DATE_MASK,
  HANDLE_REGEX,
  parseMaskedDate,
  POSITIONS,
} from '@/features/profile/schema/onboarding';

/**
 * Frontend edit-profile contract (S10).
 *
 * Reuses the field rules already proven in `onboardingSchema` (name non-empty,
 * `birthDate` masked + real-past-date refine, `handle` `^[a-z0-9_]{3,20}$`,
 * `position` enum) and adds a `phone` rule (national digits, ≤11, matching the
 * `PhoneInput` contract) plus an optional `avatarUri` (a local file URI from the
 * image picker).
 *
 * Saved through `useUpdateProfile` (`PUT /api/v1/profiles/me`). `phone` and
 * `avatarUri` are validated here but not persisted yet — see that hook.
 */
export const editProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'Informe seu nome'),
  lastName: z.string().trim().min(1, 'Informe seu sobrenome'),
  handle: z.string().trim().toLowerCase().regex(HANDLE_REGEX, '@ inválido'),
  birthDate: z
    .string()
    .regex(BIRTH_DATE_MASK, 'Data inválida') // DD/MM/AAAA
    .refine((value) => {
      const date = parseMaskedDate(value);
      // Must be a real calendar date strictly in the past.
      return date !== null && date.getTime() < Date.now();
    }, 'Data inválida'),
  phone: z
    .string()
    .regex(/^\d{10,11}$/, 'Telefone inválido'), // national digits only, 10–11
  position: z.enum(POSITIONS),
  /** Local file URI of a newly picked avatar; absent keeps the current photo. */
  avatarUri: z.string().min(1).optional(),
});

export type EditProfileInput = z.infer<typeof editProfileSchema>;
