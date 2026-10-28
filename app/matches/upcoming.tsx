import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/ui/BackHeader';
import { PressableScale } from '@/components/ui/PressableScale';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import { useUpcomingMatches } from '@/features/matches/api/getUpcoming';
import { formatStartsAt } from '@/features/matches/lib/formatWhen';
import { splitVenue } from '@/features/matches/lib/venueName';
import { colors } from '@/theme/colors';

function goMatch(id: string) {
  router.push({ pathname: '/matches/[id]', params: { id } });
}

/**
 * "Ver todas" of the Home's PRÓXIMAS PARTIDAS: every upcoming match the user
 * organizes or joined, soonest first (the same list as the Home carousel).
 * Explorar is for finding new matches; this is the user's own agenda.
 */
export default function UpcomingMatchesScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const upcoming = useUpcomingMatches();

  return (
    <View className="flex-1 bg-bg-light">
      <FlatList
        testID="upcoming-list"
        data={upcoming.data ?? []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingTop: headerHeight + 8, paddingBottom: insets.bottom + 24 }}
        onRefresh={() => upcoming.refetch()}
        refreshing={upcoming.isRefetching}
        progressViewOffset={headerHeight}
        ItemSeparatorComponent={() => <View className="h-2" />}
        renderItem={({ item }) => (
          <PressableScale
            accessibilityRole="button"
            onPress={() => goMatch(item.id)}
            testID="upcoming-row"
            className="mx-4 flex-row items-center gap-3 rounded-card border border-line bg-white px-4 py-3"
          >
            <View className="flex-1">
              <Text className="font-body-bold text-body text-text-primary" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="font-body text-caption text-text-muted mt-0.5" numberOfLines={1}>
                {[formatStartsAt(item.startsAt), splitVenue(item.venue).name].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {item.confirmed ? (
              <Text className="font-body-bold text-caption text-success">Confirmado</Text>
            ) : null}
            <ChevronRight size={18} color={colors.textMuted} />
          </PressableScale>
        )}
        ListEmptyComponent={
          upcoming.isPending ? (
            <View className="px-4 gap-2">
              <SkeletonBlock className="h-[64px]" />
              <SkeletonBlock className="h-[64px]" />
            </View>
          ) : upcoming.isError ? (
            <StateMessage
              message="Não foi possível carregar suas partidas"
              actionLabel="Tentar novamente"
              onAction={() => upcoming.refetch()}
            />
          ) : (
            <StateMessage message="Você não tem partidas marcadas" />
          )
        }
      />
      <BackHeader title="Próximas partidas" onHeight={setHeaderHeight} />
    </View>
  );
}
