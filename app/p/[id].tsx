import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { setPendingLink } from '@/lib/pendingLink';
import { useAuthStore } from '@/stores/auth';

import { getAuthBootstrap } from '../_layout';

// An invite link (https://quadra-volei.app/p/<id>?c=<code>, or quadra://p/<id>) only navigates:
// it opens the match, with the code ready to see and join a private one; joining takes a tap.
// A link can start the app here, before the session is restored: wait for it, and keep the link
// for after login when nobody is signed in.
export default function InviteLinkScreen() {
  const { id, c } = useLocalSearchParams<{ id: string; c?: string }>();

  useEffect(() => {
    const target: Href = { pathname: '/matches/[id]', params: c ? { id, c } : { id } };
    void getAuthBootstrap().then(() => {
      const { isAuthenticated, hasProfile } = useAuthStore.getState();
      if (isAuthenticated && hasProfile) {
        router.replace('/(tabs)');
        router.push(target);
      } else {
        setPendingLink(target);
        router.replace('/');
      }
    });
  }, [id, c]);

  return <View className="flex-1 bg-surface-dark" />;
}
