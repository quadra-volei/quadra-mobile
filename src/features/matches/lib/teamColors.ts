/**
 * Team color mapping helper — maps team index to color class following
 * DESIGN_SYSTEM brand priority: primary (blue) → accent (lime) → tertiary (orange) → quaternary (violet).
 *
 * Used by S13.5 team picker to render color-coded team badges in a fixed priority order.
 */

export type TeamColorClass = 'bg-primary' | 'bg-accent' | 'bg-tertiary' | 'bg-quaternary';

/**
 * Maps team index (0, 1, 2, ...) to a Tailwind color class.
 * Priority order: primary (blue) → accent (lime) → tertiary (orange) → quaternary (violet).
 *
 * @param teamIndex 0-based team index (0 → primary, 1 → accent, 2 → tertiary, 3 → quaternary)
 * @returns Tailwind className for the team badge background
 */
export function getTeamBgColor(teamIndex: number): TeamColorClass {
  const colors: readonly TeamColorClass[] = [
    'bg-primary',    // 0: blue
    'bg-accent',     // 1: lime
    'bg-tertiary',   // 2: orange
    'bg-quaternary', // 3: violet
  ];
  const color = colors[teamIndex % colors.length];
  return color ?? 'bg-primary';
}

/**
 * Maps team index to a human-readable color name (for labels/accessibility).
 * Used in accessibility labels and test descriptions.
 *
 * @param teamIndex 0-based team index
 * @returns Color name (Portuguese)
 */
export function getTeamColorName(teamIndex: number): string {
  const names = ['Azul', 'Lima', 'Laranja', 'Violeta'] as const;
  return names[teamIndex % names.length] ?? 'Azul';
}
