import { router } from 'expo-router';
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  type LucideIcon,
  Settings,
  Star,
  Ticket,
  Trash2,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { BackHeader } from '@/components/ui/BackHeader';
import { dialog } from '@/components/ui/Dialog';
import { FilterChip } from '@/components/ui/FilterChip';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import {
  type AppNotification,
  useDeleteNotification,
  useMarkRead,
  useNotifications,
} from '@/features/notifications/api/notificationsApi';
import { timeAgo } from '@/features/network/api/postsApi';
import { pushTarget } from '@/lib/push/pushNotifications';
import { colors, withAlpha } from '@/theme/colors';
import { ICON_HIT_SLOP } from '@/theme/layout';

/** "Recentes" are the last 24 h; the rest go under "Anteriores". */
const RECENT_MS = 24 * 60 * 60 * 1000;

/** The tile of each kind: reminders in blue, ranking moments in lime (priority order). */
const KIND: Record<string, { icon: LucideIcon; tile: string; color: string }> = {
  WaitingListSpot: { icon: Ticket, tile: 'bg-primary/10', color: colors.primary },
  ConfirmPresence: { icon: CalendarCheck, tile: 'bg-primary/10', color: colors.primary },
  MatchTomorrow: { icon: CalendarClock, tile: 'bg-primary/10', color: colors.primary },
  MvpVotingOpen: { icon: Star, tile: 'bg-accent/20', color: colors.surfaceDark },
  SummaryReady: { icon: ClipboardList, tile: 'bg-accent/20', color: colors.surfaceDark },
};
const DEFAULT_KIND = { icon: Bell, tile: 'bg-primary/10', color: colors.primary };

/** An unread row: a pale blue wash, apart from the screen's own pale blue. */
const UNREAD_FILL = { backgroundColor: withAlpha(colors.primary, 0.06) };

function groupByAge(items: AppNotification[], now: number = Date.now()) {
  const recent = items.filter((n) => now - new Date(n.createdAt).getTime() < RECENT_MS);
  const earlier = items.filter((n) => now - new Date(n.createdAt).getTime() >= RECENT_MS);
  return [
    { title: 'Recentes', items: recent },
    { title: 'Anteriores', items: earlier },
  ].filter((s) => s.items.length > 0);
}

// The bell: what happened to my games (API DECISIONS #77). Opening one marks it read and takes
// me to its match; a swipe to the left clears it, the trash in the header clears them all
// (API DECISIONS #96); the switches live in Configurações → Notificações (the gear).
export default function NotificationsListScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const list = useNotifications();
  const markRead = useMarkRead();
  const remove = useDeleteNotification();
  // One row open at a time: opening another closes the last.
  const openRow = useRef<SwipeableMethods | null>(null);

  const open = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id);
    const target = pushTarget(n);
    if (target) {
      router.push(target);
    }
  };

  const failed = () => dialog.alert('Não foi possível excluir', 'Confira sua conexão e tente de novo.');
  const removeOne = (id: string) => remove.mutate(id, { onError: failed });
  const clearAll = () =>
    dialog.alert('Limpar todas as notificações?', 'Elas saem da sua lista e não voltam.', [
      { text: 'Limpar todas', style: 'destructive', onPress: () => remove.mutate(undefined, { onError: failed }) },
      { text: 'Cancelar', style: 'cancel' },
    ]);

  const items = list.data ?? [];
  const unreadCount = items.filter((n) => !n.read).length;
  const sections = groupByAge(onlyUnread ? items.filter((n) => !n.read) : items);

  return (
    <View className="flex-1 bg-bg-light">
      <ScrollView contentContainerClassName="px-4 pb-10" contentContainerStyle={{ paddingTop: headerHeight + 16 }}>
        {list.isPending ? (
          <View className="gap-3">
            <SkeletonBlock className="h-11 w-32" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </View>
        ) : list.isError ? (
          <StateMessage message="Não foi possível carregar" actionLabel="Tentar novamente" onAction={() => list.refetch()} />
        ) : items.length === 0 ? (
          <StateMessage message="Nada por aqui ainda. Avisamos de vagas, jogos chegando, MVP e resumos." />
        ) : (
          <>
            <View className="mb-6 flex-row items-center justify-between">
              <FilterChip
                label={unreadCount > 0 ? `Não lidas · ${unreadCount}` : 'Não lidas'}
                selected={onlyUnread}
                onPress={() => setOnlyUnread((v) => !v)}
                testID="filter-unread"
              />
              {unreadCount > 0 ? (
                <PressableScale
                  accessibilityRole="button"
                  hitSlop={ICON_HIT_SLOP}
                  onPress={() => markRead.mutate(undefined)}
                  testID="mark-all-read"
                >
                  <Text className="font-body-semibold text-caption text-primary">Marcar todas como lidas</Text>
                </PressableScale>
              ) : null}
            </View>

            {sections.length === 0 ? (
              <StateMessage
                message="Tudo lido por aqui."
                actionLabel="Ver todas"
                onAction={() => setOnlyUnread(false)}
              />
            ) : (
              sections.map((section) => (
                <View key={section.title} className="mb-6">
                  <Text className="mb-3 font-display text-h2 uppercase text-text-primary">{section.title}</Text>
                  <View className="overflow-hidden rounded-card bg-white shadow-card">
                    {section.items.map((n, index) => (
                      <NotificationRow
                        key={`${n.id}:${n.read}`}
                        notification={n}
                        divider={index > 0}
                        onPress={() => open(n)}
                        onDelete={() => removeOne(n.id)}
                        onOpenRow={(row) => {
                          if (openRow.current && openRow.current !== row) openRow.current.close();
                          openRow.current = row;
                        }}
                      />
                    ))}
                  </View>
                </View>
              ))
            )}

            {sections.length > 0 ? (
              <Text className="text-center font-body text-caption text-text-muted">
                Deslize uma notificação para a esquerda para excluir.
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>

      <BackHeader
        title="Notificações"
        onHeight={setHeaderHeight}
        right={
          <>
            {items.length > 0 ? (
              <IconButton label="Limpar todas" onPress={clearAll} testID="clear-all">
                <Trash2 size={20} color={colors.surfaceDark} />
              </IconButton>
            ) : null}
            <IconButton
              label="Configurar notificações"
              onPress={() => router.push('/profile/notifications')}
              testID="notification-settings"
            >
              <Settings size={20} color={colors.surfaceDark} />
            </IconButton>
          </>
        }
      />
    </View>
  );
}

type NotificationRowProps = {
  notification: AppNotification;
  divider: boolean;
  onPress: () => void;
  onDelete: () => void;
  onOpenRow: (row: SwipeableMethods | null) => void;
};

/**
 * One notification: the kind's tile, the title (bold while unread), the text and how long ago,
 * on a pale blue fill with a blue dot while unread. A swipe to the left shows the red "Excluir";
 * screen readers get the same as an action.
 */
function NotificationRow({ notification: n, divider, onPress, onDelete, onOpenRow }: NotificationRowProps) {
  const row = useRef<SwipeableMethods>(null);
  const kind = KIND[n.type] ?? DEFAULT_KIND;
  const Icon = kind.icon;

  return (
    <View className={divider ? 'border-t border-line' : undefined}>
      <Swipeable
        ref={row}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        onSwipeableWillOpen={() => onOpenRow(row.current)}
        renderRightActions={() => (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Excluir notificação"
            onPress={onDelete}
            testID="notification-delete"
            className="w-24 items-center justify-center gap-1 bg-danger"
          >
            <Trash2 size={20} color={colors.textOnDark} />
            <Text className="font-body-bold text-caption text-text-on-dark">Excluir</Text>
          </PressableScale>
        )}
      >
        {/* White under the tint: the row must hide the red action behind it. */}
        <View className="bg-white">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`${n.read ? '' : 'Não lida. '}${n.title}. ${n.body}. ${timeAgo(n.createdAt)}`}
            accessibilityActions={[{ name: 'activate' }, { name: 'delete', label: 'Excluir notificação' }]}
            onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'delete' ? onDelete() : onPress())}
            onPress={onPress}
            className="flex-row items-start gap-3 px-4 py-3"
            style={n.read ? undefined : UNREAD_FILL}
            testID="notification"
          >
            <View className={`h-10 w-10 items-center justify-center rounded-chip ${kind.tile}`}>
              <Icon size={20} color={kind.color} strokeWidth={2.2} />
            </View>
            <View className="flex-1">
              <Text className={`text-body text-text-primary ${n.read ? 'font-body' : 'font-body-bold'}`}>{n.title}</Text>
              <Text className="mt-1 font-body text-caption text-text-primary">{n.body}</Text>
              <Text className="mt-1 font-body text-caption text-text-muted">{timeAgo(n.createdAt)}</Text>
            </View>
            <View
              className="mt-2 h-2 w-2 rounded-full"
              style={{ backgroundColor: n.read ? 'transparent' : colors.primary }}
            />
          </PressableScale>
        </View>
      </Swipeable>
    </View>
  );
}
