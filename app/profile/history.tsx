import { router } from 'expo-router';
import { useState } from 'react';
import { SectionList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MatchHistoryRow } from '@/components/domain/MatchHistoryRow';
import { BackHeader } from '@/components/ui/BackHeader';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import { groupByMonth, useMatchHistory } from '@/features/profile/api/getRecentMatches';

function goMatchSummary(id: string) {
  // Past matches open the read-only summary, as on the profile.
  router.push({ pathname: '/matches/[id]/summary', params: { id } });
}

/**
 * "Ver tudo" of the profile's MINHAS PARTIDAS: every finished match of the user,
 * newest first, grouped by month and loaded page by page. Each month is one
 * card, rows split by hairlines, as on the profile.
 */
export default function MatchHistoryScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const history = useMatchHistory();
  const months = groupByMonth(history.data?.pages.flatMap((page) => page.items) ?? []);

  return (
    <View className="flex-1 bg-bg-light">
      <SectionList
        testID="match-history"
        sections={months}
        keyExtractor={(m) => m.id}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text className="px-4 mt-4 mb-2 font-body-bold text-eyebrow text-text-muted uppercase">
            {section.title}
          </Text>
        )}
        renderItem={({ item, index, section }) => (
          <View
            className={`mx-4 bg-white border-line border-x ${index === 0 ? 'rounded-t-card border-t' : ''} ${
              index === section.data.length - 1 ? 'rounded-b-card border-b' : ''
            }`}
          >
            {index > 0 ? <View className="h-px bg-line mx-4" /> : null}
            <MatchHistoryRow match={item} onPress={goMatchSummary} testID="match-history-row" />
          </View>
        )}
        contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: insets.bottom + 24 }}
        onRefresh={() => history.refetch()}
        refreshing={history.isRefetching && !history.isFetchingNextPage}
        progressViewOffset={headerHeight}
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage) history.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          history.isPending ? (
            <View testID="match-history-loading" className="px-4 pt-4 gap-2">
              <SkeletonBlock className="h-[64px]" />
              <SkeletonBlock className="h-[64px]" />
              <SkeletonBlock className="h-[64px]" />
            </View>
          ) : history.isError ? (
            <StateMessage
              message="Não foi possível carregar suas partidas"
              actionLabel="Tentar novamente"
              onAction={() => history.refetch()}
            />
          ) : (
            <StateMessage message="Você ainda não jogou nenhuma partida" />
          )
        }
        ListFooterComponent={
          history.isFetchingNextPage ? <SkeletonBlock className="mx-4 mt-2 h-[64px]" /> : null
        }
      />
      <BackHeader title="Minhas partidas" onHeight={setHeaderHeight} />
    </View>
  );
}
