import { z } from 'zod';

import { isValidBrDate, MATCH_DURATIONS } from '@/features/matches/schema/createMatch';
import { LEVELS } from '@/features/profile/schema/onboarding';

/**
 * The organizer's edit form (`app/matches/[id]/edit.tsx`). Type (avulsa / recorrente) and
 * privacy are not editable (API DECISIONS #62), so the form is flat: one date and time, and
 * the address must keep coordinates (the current ones, or a picked suggestion).
 */
export const editMatchSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome para a partida').max(120),
  description: z.string().max(2000),
  location: z.string().trim().min(1, 'Informe o local').max(300),
  latitude: z.number({ message: 'Escolha um endereço da lista' }),
  longitude: z.number({ message: 'Escolha um endereço da lista' }),
  // Set only when a place is picked again: neither sent keeps the arena (API DECISIONS #92).
  placeId: z.string().optional(),
  arenaId: z.string().optional(),
  date: z.string().refine(isValidBrDate, 'Escolha a data'),
  time: z.string().regex(/^\d{1,2}h\d{2}$/, 'Escolha um horário'),
  duration: z.enum(MATCH_DURATIONS),
  format: z.enum(['2X2', '4X4', '6X6']),
  gamePoints: z.number().int().min(5).max(50),
  freeTeams: z.boolean(),
  players: z.number().int().min(2, 'Mínimo de 2 jogadores').max(100),
  level: z.enum(LEVELS),
  price: z.number().min(0),
  priceMonthly: z.number().min(0),
});

export type EditMatchInput = z.infer<typeof editMatchSchema>;
