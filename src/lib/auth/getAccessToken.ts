import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'quadra.accessToken';

/**
 * Reads the stored Quadra access token from expo-secure-store.
 * Returns the token string if present, or null if no token is stored.
 */
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}
