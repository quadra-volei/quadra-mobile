import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authorizedApiClient } from '@/lib/api/authorizedClient';

/** One item of `GET /api/v1/notifications` (API DECISIONS #77). */
export type AppNotification = {
  id: string;
  /** WaitingListSpot | ConfirmPresence | MatchTomorrow | MvpVotingOpen | SummaryReady */
  type: string;
  title: string;
  body: string;
  matchId: string | null;
  createdAt: string;
  read: boolean;
};

export type NotificationPreferences = { invites: boolean; reminders: boolean; ranking: boolean };

const listKey = ['notifications', 'list'] as const;
const unreadKey = ['notifications', 'unread'] as const;

export function useNotifications() {
  return useQuery({
    queryKey: listKey,
    queryFn: () =>
      authorizedApiClient<{ items: AppNotification[] }>('/api/v1/notifications?limit=50').then((r) => r.items),
  });
}

/** The bell's badge; re-read every minute while the app is open. */
export function useUnreadCount() {
  return useQuery({
    queryKey: unreadKey,
    queryFn: () => authorizedApiClient<{ count: number }>('/api/v1/notifications/unread-count').then((r) => r.count),
    refetchInterval: 60_000,
  });
}

/** Opening a notification marks it read (all of them with `id` undefined). */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string | undefined>({
    mutationFn: (id) =>
      authorizedApiClient<void>(id ? `/api/v1/notifications/${id}/read` : '/api/v1/notifications/read-all', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: unreadKey });
    },
  });
}

/** The three switches of Configurações → Notificações, so the server knows what to push. */
export function useSaveNotificationPreferences() {
  return useMutation<NotificationPreferences, Error, NotificationPreferences>({
    mutationFn: (prefs) =>
      authorizedApiClient<NotificationPreferences>('/api/v1/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(prefs),
      }),
  });
}
