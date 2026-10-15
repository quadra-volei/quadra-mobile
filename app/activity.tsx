import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityRow } from '@/components/domain/ActivityRow';
import { BackHeader } from '@/components/ui/BackHeader';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import { type ActivityLine, useActivityFeed } from '@/features/activity/api/activityApi';

function goTarget(target: ActivityLine['target']) {
  router.push({ pathname: target.pathname, params: { id: target.id } });
}

/**
 * "Ver tudo" of the Home's ATIVIDADE DOS AMIGOS: every activity of the players
 * the user follows (last 30 days), newest first, loaded page by page. One card,
 * rows split by hairlines, as on the Home.
 */
export default function ActivityScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const feed = useActivityFeed();
  const items = feed.data?.pages.flatMap((page) => page.items) ?? [];
  const last = items.length - 1;

  return (
    <View className="flex-1 bg-bg-light">
      <FlatList
        testID="activity-feed"
        data={items}
        keyExtractor={(a) => a.id}
        renderItem={({ item, index }) => (
          <View
            className={`mx-4 bg-white border-line border-x ${index === 0 ? 'rounded-t-card border-t' : ''} ${
              index === last ? 'rounded-b-card border-b' : ''
            }`}
          >
            {index > 0 ? <View className="h-px bg-line mx-4" /> : null}
            <ActivityRow activity={item} onPress={goTarget} testID="activity-row" />
          </View>
        )}
        contentContainerStyle={{ paddingTop: headerHeight + 16, paddingBottom: insets.bottom + 24 }}
        onRefresh={() => feed.refetch()}
        refreshing={feed.isRefetching && !feed.isFetchingNextPage}
        progressViewOffset={headerHeight}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          feed.isPending ? (
            <View testID="activity-loading" className="px-4 gap-2">
              <SkeletonBlock className="h-[68px]" />
              <SkeletonBlock className="h-[68px]" />
              <SkeletonBlock className="h-[68px]" />
            </View>
          ) : feed.isError ? (
            <StateMessage
              message="Não foi possível carregar a atividade"
              actionLabel="Tentar novamente"
              onAction={() => feed.refetch()}
            />
          ) : (
            <Text className="px-4 font-body text-body text-text-muted text-center">
              Seus amigos ainda não jogaram. Siga jogadores na Rede para ver o que eles andam fazendo.
            </Text>
          )
        }
        ListFooterComponent={
          feed.isFetchingNextPage ? <SkeletonBlock className="mx-4 mt-2 h-[68px]" /> : null
        }
      />
      <BackHeader title="Atividade dos amigos" onHeight={setHeaderHeight} />
    </View>
  );
}
