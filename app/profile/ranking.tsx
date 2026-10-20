import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { RankingRow } from '@/components/domain/RankingRow';
import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { FilterChip } from '@/components/ui/FilterChip';
import { PressableScale } from '@/components/ui/PressableScale';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import { POSITIONS, positionLabel, type Position } from '@/features/profile/schema/onboarding';
import {
  useRanking,
  useRankingGroups,
  type RankingScope,
} from '@/features/ranking/api/getGroupRanking';
import type { RankingRow as RankingRowData } from '@/features/ranking/types/ranking';
import { colors, HERO_GRADIENT } from '@/theme/colors';
import { ICON_HIT_SLOP } from '@/theme/layout';

function noop() {}

function openPlayer(id: string) {
  router.push(`/players/${id}`);
}

const SCOPES: { scope: RankingScope; label: string }[] = [
  { scope: 'friends', label: 'Amigos' },
  { scope: 'group', label: 'Grupos' },
  { scope: 'general', label: 'Geral' },
];

const EMPTY_MESSAGE: Record<RankingScope, string> = {
  friends: 'Ninguém que você segue pontuou neste mês. Jogos recorrentes contam pontos.',
  group: 'Ninguém pontuou neste grupo neste mês',
  general: 'Ninguém tem jogos suficientes neste mês ainda',
};

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 pb-2"
    >
      {children}
    </ScrollView>
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
    <Pressable
      className="items-center w-24"
      accessibilityRole="button"
      accessibilityLabel={`${row.position}º, ${row.name}, ${row.score} pontos`}
      onPress={() => openPlayer(row.playerId)}
    >
      <Avatar uri={row.photoUrl} name={row.name} size="lg" level={row.level} />
      <Text
        numberOfLines={1}
        className="font-body-semibold text-body-bold text-text-primary mt-2 text-center"
      >
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
            <Text className="font-num text-accent text-body">{row.position}º</Text>
          </LinearGradient>
        </View>
      ) : (
        <View
          className={`bg-white rounded-card shadow-card items-center justify-center w-24 mt-2 ${pedestalHeight}`}
        >
          <Text className="font-num text-text-muted text-body">{row.position}º</Text>
        </View>
      )}
    </Pressable>
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

function seasonName(seasonStart: string): string {
  return new Date(seasonStart).toLocaleDateString('pt-BR', {
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  });
}

/**
 * Season ranking (quadra-api DECISIONS #63): Amigos · Grupos · Geral, filtered
 * by court position. `?scope=group&groupId=` opens a group directly (match detail).
 */
export default function RankingScreen() {
  const params = useLocalSearchParams<{ scope?: RankingScope; groupId?: string }>();
  const [scope, setScope] = useState<RankingScope>(params.scope ?? 'friends');
  const [pickedGroupId, setGroupId] = useState<string | undefined>(params.groupId);
  const [position, setPosition] = useState<Position | undefined>();

  const groups = useRankingGroups();
  const groupId = pickedGroupId ?? groups.data?.[0]?.id;
  const ranking = useRanking({
    scope,
    groupId: scope === 'group' ? groupId : undefined,
    position,
  });

  const [headerHeight, setHeaderHeight] = useState(0);

  const data = ranking.data;
  const top = data?.rows.slice(0, 3) ?? [];
  const rest = data?.rows.slice(3) ?? [];
  const me = data?.me;
  const meListed = me != null && data?.rows.some((r) => r.playerId === me.playerId);
  const noGroups = scope === 'group' && groups.isSuccess && groups.data.length === 0;

  let body: React.ReactNode;
  if (noGroups) {
    body = <StateMessage message="Jogue uma partida recorrente para ter o ranking do grupo" />;
  } else if (ranking.isPending) {
    body = <RankingSkeleton />;
  } else if (ranking.isError) {
    body = (
      <StateMessage
        message="Não foi possível carregar o ranking"
        actionLabel="Tentar novamente"
        onAction={() => ranking.refetch()}
      />
    );
  } else if (data!.rows.length === 0) {
    body = <StateMessage message={EMPTY_MESSAGE[scope]} />;
  } else {
    body = (
      <>
        <Podium top={top} />
        {rest.length > 0 ? (
          <View className="mx-4 mt-6 bg-white rounded-card shadow-card overflow-hidden">
            {rest.map((row, i) => (
              <Pressable
                key={row.playerId}
                accessibilityRole="button"
                onPress={() => openPlayer(row.playerId)}
              >
                {i > 0 ? <View className="h-px bg-line mx-4" /> : null}
                <RankingRow row={row} isMe={Boolean(row.isMe)} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </>
    );
  }

  return (
    <View className="flex-1 bg-bg-light">
      <ScrollView
        contentContainerClassName="pb-10"
        contentContainerStyle={{ paddingTop: headerHeight }}
      >
        <ChipRow>
          {SCOPES.map((s) => (
            <FilterChip
              key={s.scope}
              label={s.label}
              selected={scope === s.scope}
              onPress={() => setScope(s.scope)}
            />
          ))}
        </ChipRow>

        {scope === 'group' && groups.data && groups.data.length > 0 ? (
          <ChipRow>
            {groups.data.map((g) => (
              <FilterChip
                key={g.id}
                label={g.name}
                selected={(data?.groupId ?? groupId) === g.id}
                onPress={() => setGroupId(g.id)}
              />
            ))}
          </ChipRow>
        ) : null}

        <ChipRow>
          <FilterChip
            label="Todas"
            selected={position === undefined}
            onPress={() => setPosition(undefined)}
          />
          {POSITIONS.map((p) => (
            <FilterChip
              key={p}
              label={positionLabel(p) ?? p}
              selected={position === p}
              onPress={() => setPosition(p)}
            />
          ))}
        </ChipRow>

        {data ? (
          <Text className="font-body text-caption text-text-muted px-4 pb-2">
            Temporada de {seasonName(data.seasonStart)}
            {scope === 'general' ? ` · mínimo de ${data.minMatches} jogos` : ''}
          </Text>
        ) : null}

        <View className="mt-2">{body}</View>

        {me && !meListed ? (
          <View className="mx-4 mt-6">
            <View className="bg-white rounded-card shadow-card overflow-hidden">
              <RankingRow row={me} isMe />
            </View>
            {me.position == null && data ? (
              <Text className="font-body text-caption text-text-muted mt-2 text-center">
                Jogue mais {Math.max(data.minMatches - (me.matches ?? 0), 1)} jogo(s) neste mês
                para entrar no ranking
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

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
