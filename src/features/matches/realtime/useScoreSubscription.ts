import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { liveGameQueryKey, scoreMutationKey } from '@/features/matches/api/liveGame';
import { getConnection, joinMatchRoom, leaveMatchRoom } from '@/lib/realtime/connection';

/**
 * Keeps the live game of a match fresh for everyone watching it: joins the
 * match room on the SignalR hub and refetches the game whenever the backend
 * announces a scoreboard change (a point, an undo, a set or the game ending).
 *
 * The announcement is only a signal — the game is always re-read over REST — so
 * a missed or out-of-order message cannot leave the screen with a wrong score.
 * After a reconnect the room is rejoined and the game re-read (connection.ts).
 * When the hub is unreachable the screen still works; it just does not update
 * by itself.
 */
export function useScoreSubscription(matchId: string): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!matchId) {
      return;
    }
    let active = true;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const conn = await getConnection();
        const refetch = () => void queryClient.invalidateQueries({ queryKey: liveGameQueryKey(matchId) });
        await joinMatchRoom(matchId, refetch);
        const handler = () => {
          // The organizer's own taps announce themselves too; while some are
          // still on their way the server is behind the screen, and the last
          // one writes the server's score anyway (useAddPoint).
          if (queryClient.isMutating({ mutationKey: scoreMutationKey(matchId) }) > 0) {
            return;
          }
          refetch();
        };
        conn.on('ScoreboardUpdated', handler);
        unsubscribe = () => {
          conn.off('ScoreboardUpdated', handler);
          leaveMatchRoom(matchId);
        };
        if (!active) {
          unsubscribe();
        }
      } catch {
        // No live updates this time; the REST data on screen stays valid.
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [matchId, queryClient]);
}
