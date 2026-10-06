import { ApiError } from '@/lib/api/client';
import { hasCompletedOnboarding } from '@/lib/auth/onboardingFlag';
import { saveTokens } from '@/lib/auth/tokenStorage';

/** Body the backend returns from every token-issuing auth endpoint (FA.3). */
export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
  userId: string;
  /** True only on the login that created the account. */
  isNewUser: boolean;
};

export type AuthSession = {
  token: string;
};

export type AuthUser = {
  id: string;
  /** The Auth backend holds no name; it comes from the profile (F2.1). */
  name: string;
  /** Whether the user already completed onboarding. Drives Onboarding vs Home. */
  hasProfile: boolean;
};

export type AuthResult = {
  session: AuthSession;
  user: AuthUser;
};

/**
 * Finishes a login: stores the token pair in expo-secure-store and shapes the
 * result the auth screens consume. A brand-new account never has a profile; a
 * returning one has it if this device saw its onboarding finish.
 */
export async function completeLogin(tokens: AuthTokensResponse): Promise<AuthResult> {
  await saveTokens({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });

  const hasProfile = tokens.isNewUser
    ? false
    : await hasCompletedOnboarding(tokens.userId);

  return {
    session: { token: tokens.accessToken },
    user: { id: tokens.userId, name: '', hasProfile },
  };
}

const NETWORK_MESSAGE = 'Sem conexão. Verifique sua internet e tente de novo.';

/**
 * Turns a failed auth request into an `Error` whose message can be shown to the
 * user as-is (the screens render `error.message` inline). `unauthorized` is the
 * message for a 401, i.e. the backend refused the credential that was sent.
 */
export function toAuthError(
  error: unknown,
  fallback: string,
  unauthorized: string = fallback,
): Error {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return new Error(unauthorized);
      case 422:
        return new Error('Este número não pode receber SMS.');
      case 429:
        return new Error('Muitas tentativas. Aguarde alguns minutos e tente de novo.');
      default:
        return new Error(fallback);
    }
  }
  // fetch rejects with a TypeError when the request never reached the server.
  if (error instanceof TypeError) {
    return new Error(NETWORK_MESSAGE);
  }
  return new Error(fallback);
}
