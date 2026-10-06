import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useMutation } from '@tanstack/react-query';

import {
  type AuthResult,
  type AuthSession,
  type AuthTokensResponse,
  type AuthUser,
  completeLogin,
  toAuthError,
} from '@/features/auth/api/session';
import { apiClient } from '@/lib/api/client';

export type GoogleSession = AuthSession;
export type GoogleUser = AuthUser;
export type GoogleSignInResult = AuthResult;

/**
 * Thrown when the user dismisses the Google account picker. Not a failure: the
 * screen stays put and shows no error.
 */
export class GoogleSignInCancelledError extends Error {
  constructor() {
    super('Login com Google cancelado.');
    this.name = 'GoogleSignInCancelledError';
  }
}

const FAILURE_MESSAGE = 'Não foi possível entrar com o Google.';

let configured = false;

function configureGoogleSignIn(): void {
  if (configured) {
    return;
  }
  // The Web client ID is what makes Google mint an ID token whose audience the
  // backend accepts (it must match the backend's Auth:Google:ClientId).
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
  configured = true;
}

/** Runs the native Google account picker and returns the Google ID token. */
async function getGoogleIdToken(): Promise<string> {
  configureGoogleSignIn();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      throw new GoogleSignInCancelledError();
    }
    const { idToken } = response.data;
    if (!idToken) {
      // Happens when no Web client ID is configured.
      throw new Error(FAILURE_MESSAGE);
    }
    return idToken;
  } catch (error) {
    if (error instanceof GoogleSignInCancelledError) {
      throw error;
    }
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new GoogleSignInCancelledError();
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services indisponível neste aparelho.');
      }
    }
    throw new Error(FAILURE_MESSAGE);
  }
}

/**
 * Signs the user in with Google: the native SDK yields a Google ID token, the
 * backend validates it (POST /api/v1/auth/login/google), finds or creates the
 * account, and returns the Quadra session, which is persisted to
 * expo-secure-store. Rejects with `GoogleSignInCancelledError` if the user backs
 * out of the picker.
 */
async function googleSignIn(): Promise<GoogleSignInResult> {
  const idToken = await getGoogleIdToken();

  let tokens: AuthTokensResponse;
  try {
    tokens = await apiClient<AuthTokensResponse>('/api/v1/auth/login/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  } catch (error) {
    throw toAuthError(error, FAILURE_MESSAGE);
  }
  return completeLogin(tokens);
}

export function useGoogleSignIn() {
  return useMutation<GoogleSignInResult, Error, void>({
    mutationFn: googleSignIn,
  });
}
