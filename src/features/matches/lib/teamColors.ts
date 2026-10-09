/**
 * Team color mapping helper — maps team index to color class following
 * DESIGN_SYSTEM brand priority: primary (blue) → accent (lime) → tertiary (orange) → quaternary (violet).
 *
 * Used wherever a team is shown (teams screen, set picker, live scoreboard) so
 * a team keeps the same color through the whole game.
 */

export type TeamColorClass = 'bg-primary' | 'bg-accent' | 'bg-tertiary' | 'bg-quaternary';

const TEAM_BG: readonly TeamColorClass[] = [
  'bg-primary', // 0: blue
  'bg-accent', // 1: lime
  'bg-tertiary', // 2: orange
  'bg-quaternary', // 3: violet
];

/**
 * Maps team index (0, 1, 2, ...) to a Tailwind color class.
 *
 * @param teamIndex 0-based team index (0 → primary, 1 → accent, 2 → tertiary, 3 → quaternary)
 * @returns Tailwind className for the team badge background
 */
export function getTeamBgColor(teamIndex: number): TeamColorClass {
  return TEAM_BG[teamIndex % TEAM_BG.length] ?? 'bg-primary';
}

/**
 * Text color that stays readable on top of `getTeamBgColor(teamIndex)`: lime is
 * a light color, so it takes navy text; the others take white.
 */
export function getTeamTextOnColor(teamIndex: number): 'text-surface-dark' | 'text-text-on-dark' {
  return getTeamBgColor(teamIndex) === 'bg-accent' ? 'text-surface-dark' : 'text-text-on-dark';
}
