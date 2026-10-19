import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import { type AppNotification, useMarkRead, useNotifications } from '@/features/notifications/api/notificationsApi';
import { timeAgo } from '@/features/network/api/postsApi';
import { pushTarget } from '@/lib/push/pushNotifications';

// The bell: what happened to my games (API DECISIONS #77). Opening one marks it read and takes
// me to its match; the switches live in Configurações → Notificações.
export default function NotificationsListScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const list = useNotifications();
  const markRead = useMarkRead();

  const open = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id);
    const target = pushTarget(n);
    if (target) {
      router.push(target);
    }
  };

  const unread = list.data?.some((n) => !n.read) ?? false;

  return (
    <View className="flex-1 bg-bg-light">
      <ScrollView contentContainerClassName="px-4 pb-10" contentContainerStyle={{ paddingTop: headerHeight + 16 }}>
        {list.isPending ? (
          <View className="gap-3">
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
          </View>
        ) : list.isError ? (
          <StateMessage message="Não foi possível carregar" actionLabel="Tentar novamente" onAction={() => list.refetch()} />
        ) : list.data.length === 0 ? (
          <StateMessage message="Nada por aqui ainda. Avisamos de vagas, jogos chegando, MVP e resumos." />
        ) : (
          <>
            {unread ? (
              <View className="mb-3 self-end">
                <Button variant="ghost" onPress={() => markRead.mutate(undefined)} testID="mark-all-read">
                  Marcar todas como lidas
                </Button>
              </View>
            ) : null}
            <View className="bg-white rounded-card shadow-card overflow-hidden">
              {list.data.map((n, index) => (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  onPress={() => open(n)}
                  className={`flex-row gap-3 px-4 py-3 ${index > 0 ? 'border-t border-line' : ''}`}
                  testID="notification"
                >
                  <View className={`mt-2 h-2 w-2 rounded-full ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
                  <View className="flex-1">
                    <Text className={`text-body text-text-primary ${n.read ? 'font-body' : 'font-body-bold'}`}>{n.title}</Text>
                    <Text className="mt-0.5 font-body text-caption text-text-muted">{n.body}</Text>
                    <Text className="mt-1 font-body text-caption text-text-muted">{timeAgo(n.createdAt)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
        <View className="mt-6">
          <Button variant="ghost" onPress={() => router.push('/profile/notifications')} testID="notification-settings">
            Configurar notificações
          </Button>
        </View>
      </ScrollView>

      <BackHeader title="Notificações" onHeight={setHeaderHeight} />
    </View>
  );
}
