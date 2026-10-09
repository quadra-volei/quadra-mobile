import type { MatchLevel } from '@/features/matches/types/match';
import { colors } from '@/theme/colors';

/**
 * Label and colors of the match-level badge, the same everywhere it shows
 * (DESIGN_SYSTEM "Match level badge"). Three categories, so the brand priority
 * runs lime → blue → orange from the easiest level up.
 */
export const LEVEL_BADGE: Record<MatchLevel, { label: string; bg: string; color: string }> = {
  INICIANTE: { label: 'Iniciante', bg: colors.accent, color: colors.surfaceDark },
  INTERMEDIARIO: { label: 'Intermediário', bg: colors.primary, color: colors.textOnDark },
  AVANCADO: { label: 'Avançado', bg: colors.tertiary, color: colors.surfaceDark },
};
