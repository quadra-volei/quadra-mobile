/**
 * A team's color and name follow its place in the match (DECISIONS #173, API
 * DECISIONS #88), from the brand palette: Time Azul (#1A1AFF), Time Limão
 * (#AADD00), Time Laranja (#FF6B00), Time Roxo (#6B1AFF). Two teams are Azul ×
 * Limão. The API returns teams in this order.
 *
 * Used wherever a team is shown (teams screen, set picker, live scoreboard,
 * summary) so a team keeps the same color and name through the whole game.
 */

const TEAM_NAMES = ['Time Azul', 'Time Limão', 'Time Laranja', 'Time Roxo'] as const;

/** "Time Azul"… by place; past the palette, "Time 5". */
export function teamName(teamIndex: number): string {
  return TEAM_NAMES[teamIndex] ?? `Time ${teamIndex + 1}`;
}

/** The short form for tight spots: "Azul", "Limão", "Laranja", "Roxo". */
export function shortTeamName(name: string): string {
  return name.replace(/^Time /, '');
}

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
