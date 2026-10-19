import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { z } from 'zod';

import { fetchMyMatches } from '@/features/matches/api/matchesApi';
import { type ApiProfile, uploadProfilePhoto } from '@/features/profile/api/profileApi';
import { ApiError } from '@/lib/api/client';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

/** Prefix of every feed query; the scope comes after it. */
export const postFeedQueryKey = ['posts', 'feed'] as const;

/** "Para você" (everyone's posts) or "Seguindo" (the players I follow, plus mine). */
export type FeedScope = 'all' | 'following';

/** Longest text the backend accepts (`Post.TextMaxLength`). */
export const POST_TEXT_MAX = 500;

/** One item of `GET /api/v1/posts`. */
export type Post = {
  id: string;
  author: {
    userId: string;
    displayName: string;
    /** Lowercase, without the leading '@'. */
    handle: string | null;
    photoUrl: string | null;
  };
  text: string | null;
  photoUrl: string | null;
  /** The match the author tied the post to. */
  match: {
    id: string;
    name: string;
    /** ISO timestamp. In the future on a post that invites to the match. */
    startsAt: string | null;
    /** Read URL of the match cover, when the organizer uploaded one. */
    coverUrl?: string | null;
  } | null;
  /** ISO timestamp. */
  createdAt: string;
  /** Whether the signed-in user wrote it (and so may delete it). */
  mine: boolean;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  /**
   * `Post` for a post the player wrote. `MatchCreated` is a match its organizer
   * shared (no text or photo, always a match). `PresenceConfirmed` only exists on
   * old cards.
   */
  kind: 'Post' | 'MatchCreated' | 'PresenceConfirmed';
};

type PostFeedPage = {
  items: Post[];
  /** Sent back as `before` to read the next page; null on the last one. */
  nextBefore: string | null;
};

/** The "novo post" form: a text and/or a photo, optionally tied to a match. */
export const newPostSchema = z
  .object({
    text: z.string().trim().max(POST_TEXT_MAX, 'Texto muito longo'),
    /** Local file picked on the phone. */
    photoUri: z.string().optional(),
    matchId: z.string().optional(),
  })
  .refine((post) => post.text.length > 0 || Boolean(post.photoUri), {
    message: 'Escreva algo ou escolha uma foto',
    path: ['text'],
  });

export type NewPost = z.infer<typeof newPostSchema>;

/** The feed of a scope, newest first, loaded page by page. */
export function usePostFeed(scope: FeedScope = 'all') {
  return useInfiniteQuery({
    queryKey: [...postFeedQueryKey, scope] as const,
    queryFn: ({ pageParam }) => {
      const params = [
        scope === 'following' ? 'scope=following' : null,
        pageParam ? `before=${encodeURIComponent(pageParam)}` : null,
      ].filter(Boolean);
      return authorizedApiClient<PostFeedPage>(
        `/api/v1/posts${params.length ? `?${params.join('&')}` : ''}`,
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextBefore,
  });
}

/**
 * Publishes a post (`POST /api/v1/posts`). A picked photo is uploaded first,
 * through the same signed-URL upload as the profile photo.
 */
async function createPost(input: NewPost): Promise<Post> {
  try {
    let photoObjectKey: string | null = null;
    if (input.photoUri) {
      photoObjectKey = await uploadProfilePhoto(input.photoUri);
      if (!photoObjectKey) {
        throw new Error(
          'Fotos ainda não estão disponíveis neste ambiente. Publique só com texto.',
        );
      }
    }
    return await authorizedApiClient<Post>('/api/v1/posts', {
      method: 'POST',
      body: JSON.stringify({
        text: input.text.trim() || null,
        photoObjectKey,
        matchId: input.matchId ?? null,
      }),
    });
  } catch (error) {
    throw toPostError(error);
  }
}

/** A failed publish as an `Error` whose message can be shown to the user as-is. */
function toPostError(error: unknown): Error {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 429:
        return new Error('Você já publicou muito hoje. Tente de novo amanhã.');
      case 422:
        return new Error('Não dá para marcar essa partida neste post.');
      case 400:
        return new Error('Escreva algo ou escolha uma foto.');
      case 401:
        return new Error('Sua sessão expirou. Entre novamente.');
      default:
        return new Error('Não foi possível publicar. Tente novamente.');
    }
  }
  // fetch rejects with a TypeError when the request never reached the server.
  if (error instanceof TypeError) {
    return new Error('Sem conexão. Verifique sua internet e tente de novo.');
  }
  // An error that already carries a message for the user (the photo upload).
  if (error instanceof Error) {
    return error;
  }
  return new Error('Não foi possível publicar. Tente novamente.');
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation<Post, Error, NewPost>({
    mutationFn: createPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postFeedQueryKey }),
  });
}

/**
 * The matches the user can invite to in a post: still to come, open to
 * everyone, and organized or confirmed by them (the backend applies the same
 * rule on `POST /api/v1/posts`).
 */
export function useInvitableMatches() {
  return useQuery({
    queryKey: ['matches', 'invitable'] as const,
    queryFn: async () =>
      (await fetchMyMatches())
        .filter(
          ({ match, isOrganizer, myStatus }) =>
            match.visibility === 'Open' &&
            (match.status === 'Draft' || match.status === 'Open') &&
            new Date(match.dateTime).getTime() > Date.now() &&
            (isOrganizer || myStatus === 'Confirmed'),
        )
        .map(({ match }) => ({ id: match.id, name: match.name })),
  });
}

/**
 * The organizer shares their match to the feed (`POST /api/v1/posts` with only the
 * match): the "criou a partida" card with the way in. Sharing twice keeps one card.
 */
export function useShareMatch() {
  const queryClient = useQueryClient();
  return useMutation<Post, Error, string>({
    mutationFn: async (matchId) => {
      try {
        return await authorizedApiClient<Post>('/api/v1/posts', {
          method: 'POST',
          body: JSON.stringify({ matchId }),
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
          throw new Error('Só dá para compartilhar uma partida aberta que ainda não começou.');
        }
        if (error instanceof ApiError && error.status === 429) {
          throw new Error('Você já publicou muito hoje. Tente de novo amanhã.');
        }
        if (error instanceof TypeError) {
          throw new Error('Sem conexão. Verifique sua internet e tente de novo.');
        }
        throw new Error('Não foi possível compartilhar. Tente novamente.');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postFeedQueryKey }),
  });
}

/** Removes the user's own post (`DELETE /api/v1/posts/{id}`). */
export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      authorizedApiClient<void>(`/api/v1/posts/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postFeedQueryKey }),
  });
}

/**
 * Likes or unlikes a post (`PUT / DELETE /api/v1/posts/{id}/like`). The heart
 * and the count change at the tap; the server's count replaces them when it
 * answers, and a failed request re-reads the feed.
 */
export function useSetPostLike() {
  const queryClient = useQueryClient();
  const patch = (id: string, likes: Pick<Post, 'likeCount' | 'likedByMe'>) =>
    // Both scopes may hold the post.
    queryClient.setQueriesData<InfiniteData<PostFeedPage>>({ queryKey: postFeedQueryKey }, (feed) =>
      feed && {
        ...feed,
        pages: feed.pages.map((page) => ({
          ...page,
          items: page.items.map((post) => (post.id === id ? { ...post, ...likes } : post)),
        })),
      },
    );
  return useMutation<Pick<Post, 'likeCount' | 'likedByMe'>, Error, { post: Post; liked: boolean }>({
    mutationFn: ({ post, liked }) =>
      authorizedApiClient(`/api/v1/posts/${post.id}/like`, { method: liked ? 'PUT' : 'DELETE' }),
    onMutate: ({ post, liked }) => {
      if (liked !== post.likedByMe) {
        patch(post.id, { likedByMe: liked, likeCount: post.likeCount + (liked ? 1 : -1) });
      }
    },
    onSuccess: (likes, { post }) => {
      patch(post.id, likes);
    },
    onError: () => queryClient.invalidateQueries({ queryKey: postFeedQueryKey }),
  });
}

/** Longest comment the backend accepts (`PostComment.TextMaxLength`). */
export const COMMENT_TEXT_MAX = 300;

/** One item of `GET /api/v1/posts/{id}/comments`. */
export type PostComment = {
  id: string;
  author: Post['author'];
  text: string;
  /** ISO timestamp. */
  createdAt: string;
  /** True for who wrote it and for the post's author. */
  canDelete: boolean;
};

const postCommentsQueryKey = (postId: string) => ['posts', 'comments', postId] as const;

/** A post's conversation, oldest first. */
export function usePostComments(postId: string) {
  return useQuery({
    queryKey: postCommentsQueryKey(postId),
    queryFn: async () =>
      (await authorizedApiClient<{ items: PostComment[] }>(`/api/v1/posts/${postId}/comments`)).items,
  });
}

/** Writes a comment (`POST /api/v1/posts/{id}/comments`). */
export function useAddComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation<PostComment, Error, string>({
    mutationFn: async (text) => {
      try {
        return await authorizedApiClient<PostComment>(`/api/v1/posts/${postId}/comments`, {
          method: 'POST',
          body: JSON.stringify({ text }),
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 429) {
          throw new Error('Você já comentou muito hoje. Tente de novo amanhã.');
        }
        if (error instanceof ApiError && error.status === 404) {
          throw new Error('Esse post não existe mais.');
        }
        if (error instanceof TypeError) {
          throw new Error('Sem conexão. Verifique sua internet e tente de novo.');
        }
        throw new Error('Não foi possível comentar. Tente novamente.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postCommentsQueryKey(postId) });
      // The card's comment count.
      queryClient.invalidateQueries({ queryKey: postFeedQueryKey });
    },
  });
}

/** Removes a comment (`DELETE /api/v1/posts/{id}/comments/{commentId}`). */
export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (commentId) =>
      authorizedApiClient<void>(`/api/v1/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postCommentsQueryKey(postId) });
      queryClient.invalidateQueries({ queryKey: postFeedQueryKey });
    },
  });
}

/** Another player's public profile (`GET /api/v1/profiles/{userId}`). */
export function usePlayerProfile(userId: string) {
  return useQuery({
    queryKey: ['players', userId, 'profile'] as const,
    queryFn: () => authorizedApiClient<ApiProfile>(`/api/v1/profiles/${userId}`),
  });
}

/** `GET | PUT | DELETE /api/v1/profiles/{userId}/follow`. */
export type FollowState = {
  followersCount: number;
  followingCount: number;
  followedByMe: boolean;
};

const followStateQueryKey = (userId: string) => ['players', userId, 'follow'] as const;

/** A player's followers and following, and whether I follow them. */
export function useFollowState(userId: string) {
  return useQuery({
    queryKey: followStateQueryKey(userId),
    queryFn: () => authorizedApiClient<FollowState>(`/api/v1/profiles/${userId}/follow`),
  });
}

/** Follows (`true`) or stops following (`false`) a player. */
export function useSetFollow(userId: string) {
  const queryClient = useQueryClient();
  return useMutation<FollowState, Error, boolean>({
    mutationFn: (following) =>
      authorizedApiClient<FollowState>(`/api/v1/profiles/${userId}/follow`, {
        method: following ? 'PUT' : 'DELETE',
      }),
    onSuccess: (state) => {
      queryClient.setQueryData(followStateQueryKey(userId), state);
      // "Seguindo" now has, or no longer has, this player's posts.
      queryClient.invalidateQueries({ queryKey: [...postFeedQueryKey, 'following'] });
    },
  });
}

/** "agora", "há 5 min", "há 3 h", "há 2 d", then the date ("12/09"). */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} d`;
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

/** Why a post is reported (`POST /api/v1/posts/{id}/report`). */
export type ReportReason = 'Spam' | 'Offensive' | 'Inappropriate' | 'Other';

/** Reports a post to the team; it leaves my feed. */
export function useReportPost() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { postId: string; reason: ReportReason }>({
    mutationFn: ({ postId, reason }) =>
      authorizedApiClient<void>(`/api/v1/posts/${postId}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postFeedQueryKey }),
  });
}

/** One item of `GET /api/v1/profiles/me/blocks`. */
export type BlockedPlayer = {
  userId: string;
  displayName: string;
  handle: string | null;
  blockedAt: string;
};

const blockedPlayersQueryKey = ['players', 'blocked'] as const;

/** The players I blocked (Configurações → Jogadores bloqueados). */
export function useBlockedPlayers() {
  return useQuery({
    queryKey: blockedPlayersQueryKey,
    queryFn: () => authorizedApiClient<BlockedPlayer[]>('/api/v1/profiles/me/blocks'),
  });
}

/**
 * Blocks (`true`) or unblocks (`false`) a player (`PUT / DELETE
 * /api/v1/profiles/{userId}/block`). A block hides each one's posts and
 * comments from the other and ends the follows between them.
 */
export function useSetBlock() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { userId: string; blocked: boolean }>({
    mutationFn: ({ userId, blocked }) =>
      authorizedApiClient<void>(`/api/v1/profiles/${userId}/block`, { method: blocked ? 'PUT' : 'DELETE' }),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: postFeedQueryKey });
      queryClient.invalidateQueries({ queryKey: blockedPlayersQueryKey });
      queryClient.invalidateQueries({ queryKey: followStateQueryKey(userId) });
    },
  });
}
