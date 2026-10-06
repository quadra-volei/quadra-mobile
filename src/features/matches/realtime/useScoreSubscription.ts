import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getConnection } from '@/lib/realtime/connection';
import { currentSetQueryKey, type CurrentSetState } from '@/features/matches/api/getCurrentSet';

/**
 * Real-time score update event from SignalR.
 *
 * MOCK: placeholder for the real ScoreUpdated event that the match hub will emit.
 */
export type ScoreUpdatedEvent = {
  matchId: string;
  setNumber: number;
  scores: [number, number];
  timestamp: string;
};

/**
 * Subscription hook for non-organizers to listen for real-time score updates via SignalR.
 *
 * When a non-organizer mounts the scoreboard (S14), they don't POST score changes themselves.
 * Instead, they subscribe to score updates from the organizer via the SignalR match hub.
 *
 * On each ScoreUpdated event:
 * 1. Update the TanStack Query cache so the display re-renders
 * 2. The organizer's real-time subscription is optional (they POST directly)
 *
 * MOCK: this iteration ships with a placeholder implementation. The ScoreUpdated
 * event and hub methods (JoinMatchRoom, LeaveMatchRoom) are mocked. Once the
 * backend match SignalR hub lands, the connection will work unchanged and events
 * will flow to this hook automatically.
 *
 * Usage:
 * ```tsx
 * // Non-organizer on S14
 * useScoreSubscription(matchId, setNumber);
 * ```
 */
export function useScoreSubscription(matchId: string, setNumber: number): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const conn = await getConnection();

        // MOCK: invoke JoinMatchRoom to subscribe to updates
        // TODO(real-api): Once the backend match hub lands, this will trigger
        // the real hub to start sending ScoreUpdated events to this client.
        await conn.invoke('JoinMatchRoom', matchId);

        // MOCK: set up the event listener
        // TODO(real-api): the real backend will emit ScoreUpdated events
        const handler = (event: ScoreUpdatedEvent) => {
          // Update the query cache with the new scores
          const queryKey = currentSetQueryKey(matchId, setNumber);
          queryClient.setQueryData<CurrentSetState>(queryKey, (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              scores: event.scores,
              // pointsScoredCount would be calculated or sent by the backend
            };
          });
        };

        conn.on('ScoreUpdated', handler);

        // Return the cleanup function
        unsubscribe = () => {
          conn.off('ScoreUpdated', handler);
          // MOCK: invoke LeaveMatchRoom
          // TODO(real-api): tells the backend this client is no longer listening
          void conn.invoke('LeaveMatchRoom', matchId);
        };
      } catch (err) {
        // MOCK: connection failed; non-organizer will see stale scores
        // In production, you might show a "disconnected" indicator
        console.error('Failed to subscribe to score updates:', err);
      }
    })();

    return () => {
      unsubscribe?.();
    };
  }, [matchId, setNumber, queryClient]);
}
