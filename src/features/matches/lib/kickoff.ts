import { useEffect, useState } from 'react';

import { formatWhen } from '@/features/matches/lib/formatWhen';

/**
 * How long before the match time the backend lets the organizer start the game
 * (API `Kickoff.Tolerance`). Before that it refuses with `422`.
 */
export const KICKOFF_TOLERANCE_MS = 15 * 60 * 1000;

/** When the game of a match may start: 15 minutes before its time. */
export function kickoffOpensAt(startsAt: string): Date {
  return new Date(new Date(startsAt).getTime() - KICKOFF_TOLERANCE_MS);
}

/** "Aguardando horário · libera hoje às 19h45" (or "… libera 28/10 às 19h45"). */
export function kickoffWaitingLabel(startsAt: string): string {
  const opensAt = formatWhen(kickoffOpensAt(startsAt).toISOString())
    .replace('Hoje', 'hoje')
    .replace(' · ', ' às ');
  return `Aguardando horário · libera ${opensAt}`;
}

// setTimeout takes at most a signed 32-bit delay (~24.8 days).
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Whether the game of a match may start now. Flips to true by itself when the
 * window opens, so a screen left open turns "Aguardando horário" into
 * "Começar partida" without a refresh.
 */
export function useKickoffOpen(startsAt: string | undefined): boolean {
  const opensAt = startsAt ? kickoffOpensAt(startsAt).getTime() : null;
  const [open, setOpen] = useState(() => opensAt != null && Date.now() >= opensAt);

  useEffect(() => {
    setOpen(opensAt != null && Date.now() >= opensAt);
    if (opensAt == null || Date.now() >= opensAt) {
      return undefined;
    }
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const wait = opensAt - Date.now();
      if (wait <= 0) {
        setOpen(true);
        return;
      }
      timer = setTimeout(schedule, Math.min(wait, MAX_TIMEOUT_MS));
    };
    schedule();
    return () => clearTimeout(timer);
  }, [opensAt]);

  return open;
}
