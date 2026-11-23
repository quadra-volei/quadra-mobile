/**
 * Publishing a post whose photo the API refuses (Johny's test of 23/11): the
 * error says it was the photo, not the match, so the screen can drop only the
 * photo and keep the text.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-secure-store', () =>
  require('../../../support/inMemorySecureStore'),
);

jest.mock('expo-file-system/legacy', () => ({
  FileSystemUploadType: { BINARY_CONTENT: 0, MULTIPART: 1 },
  uploadAsync: async () => ({ status: 200, body: '', headers: {} }),
}));

import * as SecureStore from 'expo-secure-store';

import { type NewPost, useCreatePost } from '@/features/network/api/postsApi';
import { PhotoRefusedError } from '@/features/profile/api/profileApi';
import { saveTokens } from '@/lib/auth/tokenStorage';

const fetchMock = jest.fn();

function respond(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body ?? {},
  };
}

function answerPostWith(status: number, body: unknown) {
  fetchMock.mockImplementation(async (url: string) =>
    url.endsWith('/photo/upload-url')
      ? respond(201, { uploadUrl: 'https://storage.test/put-here', objectKey: 'profiles/u/p.jpg' })
      : respond(status, body),
  );
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function publish(input: NewPost): Promise<unknown> {
  const { result } = await renderHook(() => useCreatePost(), { wrapper });
  let reason: unknown = null;
  await act(async () => {
    await result.current.mutateAsync(input).catch((error: unknown) => {
      reason = error;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return reason;
}

beforeEach(async () => {
  (SecureStore as unknown as { __reset: () => void }).__reset();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await saveTokens({ accessToken: 'access-jwt', refreshToken: 'refresh-opaque' });
});

const withPhoto: NewPost = { text: 'olha isso', photoUri: 'file:///tmp/p.jpg' };

it('a photo_refused answer becomes PhotoRefusedError', async () => {
  answerPostWith(422, { code: 'photo_refused' });

  const reason = await publish(withPhoto);

  expect(reason).toBeInstanceOf(PhotoRefusedError);
  expect((reason as Error).message).toBe('Essa foto não pode ser publicada no Quadra. Escolha outra.');
});

it('a match_not_allowed answer keeps the match message, even with a photo', async () => {
  answerPostWith(422, { code: 'match_not_allowed' });

  const reason = await publish({ ...withPhoto, matchId: 'm1' });

  expect(reason).not.toBeInstanceOf(PhotoRefusedError);
  expect((reason as Error).message).toBe('Não dá para marcar essa partida neste post.');
});

it('an API without code: a 422 on a post with a photo and no match is the photo', async () => {
  answerPostWith(422, {});

  expect(await publish(withPhoto)).toBeInstanceOf(PhotoRefusedError);
  expect(await publish({ ...withPhoto, matchId: 'm1' })).not.toBeInstanceOf(PhotoRefusedError);
});
