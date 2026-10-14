import { LinearGradient } from 'expo-linear-gradient';
import { Bell, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { RankingRow } from '@/components/domain/RankingRow';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import { FilterChip } from '@/components/ui/FilterChip';
import { BackHeader } from '@/components/ui/BackHeader';
import {
  useGroupRanking,
  useRankingGroupName,
} from '@/features/ranking/api/getGroupRanking';
import type { RankingRow as RankingRowData } from '@/features/ranking/types/ranking';
import { useAuthStore } from '@/stores/auth';
import { colors, HERO_GRADIENT } from '@/theme/colors';
import { ICON_HIT_SLOP } from '@/theme/layout';

function noop() {}

// ── Scope tabs (Amigos active/functional; Bairro/Geral disabled "Em breve") ──
function ScopeTabs({
  scope,
  onSelectAmigos,
}: {
  scope: 'amigos';
  onSelectAmigos: () => void;
}) {
  return (
    <View className="flex-row gap-2 px-4 pb-2">
      <FilterChip label="Bairro" selected={false} onPress={noop} disabled />
      <FilterChip
        label="Amigos"
        selected={scope === 'amigos'}
        onPress={onSelectAmigos}
      />
      <FilterChip label="Geral" selected={false} onPress={noop} disabled />
    </View>
  );
}

// ── Group selector: names the group being ranked. Inert — a user is ranked in
// one group at a time (the recurring match they scored in most recently). ──
function GroupSelector({ groupName }: { groupName: string }) {
  return (
    <View className="px-4 pb-2">
      <Pressable
        className="flex-row items-center gap-1"
        accessibilityRole="button"
        accessibilityLabel="Selecionar grupo"
        onPress={noop}
      >
        <Text className="font-body-semibold text-body-bold text-text-primary">
          {groupName}
        </Text>
        <ChevronDown size={18} color={colors.surfaceDark} />
      </Pressable>
    </View>
  );
}

// ── Top-3 podium (inline; 2º left, 1º center on navy pedestal, 3º right) ──
function PodiumColumn({
  row,
  place,
}: {
  row: RankingRowData | undefined;
  place: 1 | 2 | 3;
}) {
  if (!row) return <View className="items-center w-24" />;

  const isFirst = place === 1;
  const pedestalHeight = isFirst ? 'h-24' : place === 2 ? 'h-16' : 'h-12';

  return (
    <View className="items-center w-24">
      <Avatar uri={undefined} name={row.name} size="lg" level={row.level} />
      <Text className="font-body-semibold text-body-bold text-text-primary mt-2 text-center">
        {row.name}
      </Text>
      <Text className="font-num text-primary text-body">{row.score}</Text>
      {isFirst ? (
        <View className={`rounded-card overflow-hidden w-24 mt-2 ${pedestalHeight}`}>
          <LinearGradient
            colors={HERO_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text className="font-num text-accent text-body">1º</Text>
          </LinearGradient>
        </View>
      ) : (
        <View
          className={`bg-white rounded-card shadow-card items-center justify-center w-24 mt-2 ${pedestalHeight}`}
        >
          <Text className="font-num text-text-muted text-body">{place}º</Text>
        </View>
      )}
    </View>
  );
}

function Podium({ top }: { top: RankingRowData[] }) {
  return (
    <View className="flex-row items-end justify-center gap-3 px-4 mt-2">
      <PodiumColumn row={top[1]} place={2} />
      <PodiumColumn row={top[0]} place={1} />
      <PodiumColumn row={top[2]} place={3} />
    </View>
  );
}

function RankingSkeleton() {
  return (
    <View className="mt-2">
      <View className="flex-row items-end justify-center gap-3 px-4">
        <SkeletonBlock className="w-24 h-32" />
        <SkeletonBlock className="w-24 h-44" />
        <SkeletonBlock className="w-24 h-28" />
      </View>
      <View className="mx-4 mt-6 gap-2">
        <SkeletonBlock className="h-16" />
        <SkeletonBlock className="h-16" />
        <SkeletonBlock className="h-16" />
      </View>
    </View>
  );
}

export default function RankingScreen() {
  const userId = useAuthStore((s) => s.userId);
  // Local UI state: the only functional scope is "amigos" (Bairro/Geral disabled).
  const [scope, setScope] = useState<'amigos'>('amigos');
  const { data, isPending, isError, refetch } = useGroupRanking({ preview: false });
  const groupName = useRankingGroupName();

  const isMe = (row: RankingRowData) =>
    userId != null ? row.playerId === userId : Boolean(row.isMe);

  const top = data?.slice(0, 3) ?? [];
  const rest = data?.slice(3) ?? [];

  const [headerHeight, setHeaderHeight] = useState(0);

  return (
    <View className="flex-1 bg-bg-light">
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerClassName="pb-10"
          contentContainerStyle={{ paddingTop: headerHeight }}
        >
          <ScopeTabs scope={scope} onSelectAmigos={() => setScope('amigos')} />
          {groupName ? <GroupSelector groupName={groupName} /> : null}

          {isPending ? (
            <RankingSkeleton />
          ) : isError ? (
            <View className="mt-6">
              <StateMessage
                message="Não foi possível carregar o ranking"
                actionLabel="Tentar novamente"
                onAction={() => refetch()}
              />
            </View>
          ) : data.length === 0 ? (
            <View className="mt-6">
              <StateMessage message="Entre em uma partida recorrente para aparecer no ranking" />
            </View>
          ) : (
            <>
              <Podium top={top} />

              {rest.length > 0 ? (
                <View className="mx-4 mt-6 bg-white rounded-card shadow-card overflow-hidden">
                  {rest.map((row, i) => (
                    <View key={row.playerId}>
                      {i > 0 ? <View className="h-px bg-line mx-4" /> : null}
                      <RankingRow row={row} isMe={isMe(row)} />
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>

      <BackHeader
        title="Ranking"
        right={
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Notificações"
            hitSlop={ICON_HIT_SLOP}
            onPress={noop}
          >
            <Bell size={24} color={colors.surfaceDark} />
          </PressableScale>
        }
        onHeight={setHeaderHeight}
      />
    </View>
  );
}
