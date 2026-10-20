import { useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';

import type { FeedbackInput } from '@/features/profile/schema/feedback';
import { ApiError } from '@/lib/api/client';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

import appConfig from '../../../../app.json';

export type SendFeedbackResult = {
  /** Id of the stored feedback entry. */
  id: string;
};

/**
 * Sends the user's feedback (type + message) to the team
 * (`POST /api/v1/feedback`), together with the app version and platform so a
 * reported problem can be placed. The backend only stores it.
 */
async function sendFeedback(input: FeedbackInput): Promise<SendFeedbackResult> {
  try {
    return await authorizedApiClient<SendFeedbackResult>('/api/v1/feedback', {
      method: 'POST',
      body: JSON.stringify({
        type: input.type,
        message: input.message,
        appVersion: appConfig.expo.version,
        platform: Platform.OS,
      }),
    });
  } catch (error) {
    throw toFeedbackError(error);
  }
}

/** A failed send as an `Error` whose message can be shown to the user as-is. */
function toFeedbackError(error: unknown): Error {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 429:
        return new Error('Você já enviou muitos feedbacks hoje. Tente de novo amanhã.');
      case 400:
        return new Error('Confira a mensagem e tente de novo.');
      case 401:
        return new Error('Sua sessão expirou. Entre novamente.');
      default:
        return new Error('Não foi possível enviar. Tente novamente.');
    }
  }
  // fetch rejects with a TypeError when the request never reached the server.
  if (error instanceof TypeError) {
    return new Error('Sem conexão. Verifique sua internet e tente de novo.');
  }
  return new Error('Não foi possível enviar. Tente novamente.');
}

export function useSendFeedback() {
  return useMutation<SendFeedbackResult, Error, FeedbackInput>({
    mutationFn: sendFeedback,
  });
}
