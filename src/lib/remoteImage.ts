/**
 * expo-image source for a photo from our storage. The API signs a new read URL
 * on every response (the query string changes), so caching by the full URL
 * missed every time and the Rede downloaded each photo again. Every upload gets
 * a new object key, so the path alone is a safe cache key.
 */
export function remoteImage(uri: string) {
  return { uri, cacheKey: uri.split('?')[0] };
}
