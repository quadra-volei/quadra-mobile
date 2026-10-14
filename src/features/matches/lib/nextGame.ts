import type { UpcomingMatch } from '@/features/matches/types/match';

/**
 * "SEU PRÓXIMO JOGO": the soonest match, not yet started, where the user's
 * presence is confirmed. `undefined` when there is none (the section hides).
 */
export function pickNextGame(
  matches: UpcomingMatch[],
  now: Date = new Date(),
): UpcomingMatch | undefined {
  return matches
    .filter((m) => m.confirmed && new Date(m.startsAt).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
}
