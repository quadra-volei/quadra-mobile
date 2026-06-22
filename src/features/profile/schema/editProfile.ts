import { z } from 'zod';

import { POSITIONS } from '@/features/profile/schema/onboarding';

const BIRTH_DATE_MASK = /^\d{2}\/\d{2}\/\d{4}$/;

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

/** S10 "Editar perfil" form contract (F2.1 profile edit — mocked for MVP). */
export const editProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'Informe seu nome'),
  lastName: z.string().trim().min(1, 'Informe seu sobrenome'),
  birthDate: z
    .string()
    .regex(BIRTH_DATE_MASK, 'Data inválida')
    .refine((value) => {
      const date = parseMaskedDate(value);
      return date !== null && date.getTime() < Date.now();
    }, 'Data inválida'),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, '@ inválido'),
  /** National digits only (BR), 10–11 digits. */
  phone: z
    .string()
    .regex(/^\d{10,11}$/, 'Telefone inválido'),
  position: z.enum(POSITIONS),
});

export type EditProfileInput = z.infer<typeof editProfileSchema>;
