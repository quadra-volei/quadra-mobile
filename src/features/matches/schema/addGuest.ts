import { z } from 'zod';

import type { PlayerPosition } from '@/features/matches/types/matchDetail';

/**
 * Frontend add-guest contract (S12 organizer flow).
 *
 * The organizer taps an open "vaga" slot on the match detail grid and adds a
 * guest player (someone with no app account) to fill it. A guest needs only a
 * name; the court position is optional so the team draw (S13) can place them.
 *
 * TODO(real-api): once F1.4 presence lands, the backend owns guest id
 * generation and roster placement behind the unchanged `useAddGuest` signature.
 */

// Compile-time guard: keep this list in lockstep with the PlayerPosition union
// (a mismatch surfaces here, not at runtime). Mirrors createMatch's MATCH_FORMATS.
export const PLAYER_POSITIONS = [
  'LEV',
  'PON',
  'OPO',
  'CEN',
  'LIB',
  'COR',
] as const satisfies readonly PlayerPosition[];

export const addGuestSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do convidado'),
  position: z.enum(PLAYER_POSITIONS).optional(),
});

export type AddGuestInput = z.infer<typeof addGuestSchema>;
