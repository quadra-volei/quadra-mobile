import type { UpcomingMatch } from '@/features/matches/types/match';

/**
 * "VOCÊ ENTRA EM QUADRA": the soonest match, not yet started, where the user's
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

/**
 * Discreet countdown to the next game: "em 45 min", "em 2h15", "em 3 dias";
 * "agora" once it starts. Days count calendar days ("amanhã" from 24 h on).
 */
export function countdownLabel(startsAt: string, now: Date = new Date()): string {
  const minutes = Math.floor((new Date(startsAt).getTime() - now.getTime()) / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `em ${minutes} min`;
  if (minutes < 24 * 60) {
    const rest = minutes % 60;
    return `em ${Math.floor(minutes / 60)}h${rest ? String(rest).padStart(2, '0') : ''}`;
  }
  const start = new Date(startsAt);
  const days = Math.round(
    (new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86_400_000,
  );
  return days <= 1 ? 'amanhã' : `em ${days} dias`;
}
