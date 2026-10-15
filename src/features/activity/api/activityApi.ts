import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { myProfileQueryKey } from '@/features/profile/api/getMyProfile';
import type { MyProfile } from '@/features/profile/types/profile';
import { timeAgo } from '@/features/network/api/postsApi';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

/** One item of `GET /api/v1/activities` (what a player I follow did). */
export type Activity = {
  id: string;
  type: 'MatchStarted' | 'MatchEnded' | 'MvpAwarded' | 'LevelUp';
  actor: {
    userId: string;
    displayName: string;
    handle: string | null;
    photoUrl: string | null;
    /** Level number (accumulated points), shown on the avatar badge. */
    level: number;
  };
  /** The match it happened in; null for a level up. */
  match: { id: string; name: string } | null;
  /** MatchStarted: other followed players in the same game. */
  othersCount: number;
  /** MatchEnded, from the actor's side. */
  outcome: 'Win' | 'Loss' | 'Draw' | null;
  setsWon: number | null;
  setsLost: number | null;
  levelFrom: number | null;
  levelTo: number | null;
  /** ISO timestamp. */
  occurredAt: string;
};

type ActivityPage = {
  items: Activity[];
  /** Sent back as `before` for the next page; null on the last one. */
  nextBefore: string | null;
};

const ACTIVITY_PATH = '/api/v1/activities';
export const activityQueryKey = ['activity'] as const;

/** How many activities the Home section shows ("Ver tudo" opens the rest). */
export const HOME_ACTIVITY_COUNT = 5;

/** The latest friends' activities for the Home section. */
export function useFriendsActivity(enabled = true) {
  return useQuery({
    enabled,
    queryKey: [...activityQueryKey, 'home'] as const,
    queryFn: () => authorizedApiClient<ActivityPage>(`${ACTIVITY_PATH}?limit=${HOME_ACTIVITY_COUNT}`),
    select: (page) => page.items.slice(0, HOME_ACTIVITY_COUNT),
  });
}

/** Every friends' activity (30 days), newest first, page by page. */
export function useActivityFeed() {
  return useInfiniteQuery({
    queryKey: [...activityQueryKey, 'all'] as const,
    queryFn: ({ pageParam }) =>
      authorizedApiClient<ActivityPage>(
        pageParam ? `${ACTIVITY_PATH}?before=${encodeURIComponent(pageParam)}` : ACTIVITY_PATH,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextBefore,
  });
}

/**
 * "Mostrar minhas atividades para quem me segue" (`PUT /profiles/me/activity-sharing`).
 * The profile in the cache takes the answer, so the switch follows the server.
 */
export function useSetActivitySharing() {
  const queryClient = useQueryClient();
  return useMutation<{ enabled: boolean }, Error, boolean>({
    mutationFn: (enabled) =>
      authorizedApiClient<{ enabled: boolean }>('/api/v1/profiles/me/activity-sharing', {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: ({ enabled }) => {
      queryClient.setQueryData<MyProfile>(myProfileQueryKey, (profile) =>
        profile ? { ...profile, shareActivity: enabled } : profile,
      );
    },
  });
}

/** A piece of the activity sentence: the name, plain words, or the highlighted object. */
export type ActivityPart = { text: string; kind: 'name' | 'plain' | 'object' };

export type ActivityLine = {
  parts: ActivityPart[];
  /** Grey second line: what it means, then how long ago. */
  caption: string;
  icon: 'levelUp' | 'finished' | 'live' | 'mvp';
  /** Where a tap goes. */
  target: { pathname: '/matches/[id]' | '/players/[id]'; id: string };
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "Vitória por 2 sets a 1", winner's sets first; just "Empate" for a draw. */
function resultCaption(a: Activity): string {
  if (a.outcome === 'Draw') return 'Empate';
  const label = a.outcome === 'Win' ? 'Vitória' : 'Derrota';
  if (a.setsWon == null || a.setsLost == null) return label;
  const [high, low] = a.outcome === 'Win' ? [a.setsWon, a.setsLost] : [a.setsLost, a.setsWon];
  return `${label} por ${plural(high, 'set')} a ${low}`;
}

/** The sentence, caption, icon and destination of an activity row. */
export function describeActivity(a: Activity, now: number = Date.now()): ActivityLine {
  const name: ActivityPart = { text: a.actor.displayName, kind: 'name' };
  const when = timeAgo(a.occurredAt, now);
  const match = a.match ?? { id: '', name: '' };
  const matchTarget = { pathname: '/matches/[id]' as const, id: match.id };

  switch (a.type) {
    case 'LevelUp':
      return {
        parts: [name, { text: ' subiu para o ', kind: 'plain' }, { text: `nível ${a.levelTo ?? a.actor.level}`, kind: 'object' }],
        caption: `Novo nível desbloqueado · ${when}`,
        icon: 'levelUp',
        target: { pathname: '/players/[id]', id: a.actor.userId },
      };
    case 'MatchEnded':
      return {
        parts: [name, { text: ' terminou uma partida ', kind: 'plain' }, { text: match.name, kind: 'object' }],
        caption: `${resultCaption(a)} · ${when}`,
        icon: 'finished',
        target: matchTarget,
      };
    case 'MvpAwarded':
      return {
        parts: [
          name,
          { text: ' foi o ', kind: 'plain' },
          { text: 'MVP', kind: 'object' },
          { text: ' de ', kind: 'plain' },
          { text: match.name, kind: 'object' },
        ],
        caption: `Eleito o melhor da partida · ${when}`,
        icon: 'mvp',
        target: matchTarget,
      };
    case 'MatchStarted':
    default:
      return {
        parts: [
          name,
          {
            text: a.othersCount > 0 ? ` e mais ${a.othersCount} iniciaram uma partida ` : ' iniciou uma partida ',
            kind: 'plain',
          },
          { text: match.name, kind: 'object' },
        ],
        caption: `A partida está rolando agora · ${when}`,
        icon: 'live',
        target: matchTarget,
      };
  }
}
