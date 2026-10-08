import { Platform } from 'react-native';

/**
 * Android draws the map with the Google Maps SDK, which throws natively (closing
 * the app) when the build has no key. Screens must not mount a map on a build
 * without the key. iOS uses Apple Maps and needs no key.
 */
export function isMapAvailable(): boolean {
  return (
    Platform.OS !== 'android' ||
    !!process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY
  );
}
