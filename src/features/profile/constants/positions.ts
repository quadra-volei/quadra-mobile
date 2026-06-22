import type { Position } from '@/features/profile/schema/onboarding';

/** Human-readable position names for profile display and S10 edit chips. */
export const POSITION_LABELS: Record<Position, string> = {
  LEV: 'Levantador',
  PON: 'Ponteiro',
  OPO: 'Oposto',
  CEN: 'Central',
  LIB: 'Líbero',
  COR: 'Coringa',
};

/** Single-select chip options for S10 "Posição em quadra". */
export const POSITION_CHIP_OPTIONS: { code: Position; label: string }[] = [
  { code: 'LEV', label: 'Levantador' },
  { code: 'OPO', label: 'Oposto' },
  { code: 'PON', label: 'Ponteiro' },
  { code: 'CEN', label: 'Central' },
  { code: 'LIB', label: 'Líbero' },
  { code: 'COR', label: 'Coringa' },
];
