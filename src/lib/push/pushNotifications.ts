import * as Notifications from 'expo-notifications';
import { type Href, router } from 'expo-router';
import { Platform } from 'react-native';

import { authorizedApiClient } from '@/lib/api/authorizedClient';

import appConfig from '../../../app.json';

// Push to the phone (API DECISIONS #77): after login the app asks for the permission once,
// sends this phone's Expo push token to the API, and a tap on a push opens its match. Every
// step is best effort: without permission or FCM credentials the in-app list still works.

let registeredToken: string | null = null;

// A push that arrives while the app is open still shows as a banner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Asks for the permission (once; Android 13+ and iOS show the system prompt) and registers the token. */
export async function registerForPush(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Quadra',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted || (current.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
    if (!granted) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: appConfig.expo.extra.eas.projectId,
    });
    await authorizedApiClient<void>('/api/v1/notifications/push-token', {
      method: 'PUT',
      body: JSON.stringify({ token }),
    });
    registeredToken = token;
  } catch {
    // No FCM credentials, an emulator, or offline: push stays off, the bell list still works.
  }
}

/** Stops pushes to this phone (logout). Call while the session is still valid. */
export async function unregisterPush(): Promise<void> {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try {
    await authorizedApiClient<void>('/api/v1/notifications/push-token', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    });
  } catch {
    // The API drops the token when another account registers it, or it simply goes unused.
  }
}

/** Where a tapped push goes: its match screen (summary or MVP vote when that is what it says). */
export function pushTarget(data: { type?: unknown; matchId?: unknown } | undefined): Href | null {
  const matchId = typeof data?.matchId === 'string' ? data.matchId : null;
  if (!matchId) return null;
  const pathname =
    data?.type === 'SummaryReady' ? '/matches/[id]/summary' : data?.type === 'MvpVotingOpen' ? '/matches/[id]/mvp-vote' : '/matches/[id]';
  return { pathname, params: { id: matchId } };
}

/** Opens the match of a tapped push. Returns the unsubscribe function. */
export function listenToPushTaps(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const target = pushTarget(response.notification.request.content.data as { type?: unknown; matchId?: unknown });
    if (target) router.push(target);
  });
  return () => subscription.remove();
}
