import * as SecureStore from 'expo-secure-store';

// Secure-store keys (ARCHITECTURE "Token storage rules"). Tokens live ONLY in
// expo-secure-store — never AsyncStorage.
export const ACCESS_TOKEN_KEY = 'quadra.accessToken';
export const REFRESH_TOKEN_KEY = 'quadra.refreshToken';

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
};

/** Persists the session's token pair. Called after every login and refresh. */
export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

/** Removes both tokens (logout, or a refresh token the backend rejected). */
export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
