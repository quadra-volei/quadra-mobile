import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { z } from 'zod';

import { fetchMyMatches } from '@/features/matches/api/matchesApi';
import { uploadProfilePhoto } from '@/features/profile/api/profileApi';
import { ApiError } from '@/lib/api/client';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

/** Query key (ARCHITECTURE convention). */
export const postFeedQueryKey = ['posts', 'feed'] as const;

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
  } | null;
  /** ISO timestamp. */
  createdAt: string;
  /** Whether the signed-in user wrote it (and so may delete it). */
  mine: boolean;
  likeCount: number;
  likedByMe: boolean;
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

/** The feed of everyone's posts, newest first, loaded page by page. */
export function usePostFeed() {
  return useInfiniteQuery({
    queryKey: postFeedQueryKey,
    queryFn: ({ pageParam }) =>
      authorizedApiClient<PostFeedPage>(
        pageParam
          ? `/api/v1/posts?before=${encodeURIComponent(pageParam)}`
          : '/api/v1/posts',
      ),
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
    queryClient.setQueryData<InfiniteData<PostFeedPage>>(postFeedQueryKey, (feed) =>
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
