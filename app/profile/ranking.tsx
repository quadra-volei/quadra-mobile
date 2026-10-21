import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PositionTag } from '@/components/domain/PositionPicker';
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

/** A filter group: an eyebrow saying what it controls, then its chips. */
function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mt-3">
      <Text
        className="px-4 pb-2 font-body-bold text-eyebrow text-text-muted uppercase"
        style={{ letterSpacing: 1.2 }}
      >
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-4"
      >
        {children}
      </ScrollView>
    </View>
  );
}

/**
 * Amigos · Grupos · Geral: which ranking, the main choice, so a segmented
 * control on navy (the active one lime) instead of one more chip row. Selected
 * colors inline, never a toggled className (DECISIONS #87).
 */
function ScopeSwitch({ value, onChange }: { value: RankingScope; onChange: (scope: RankingScope) => void }) {
  return (
    <View className="mx-4 flex-row rounded-pill bg-surface-dark p-1" testID="ranking-scope">
      {SCOPES.map((s) => {
        const selected = value === s.scope;
        return (
          <Pressable
            key={s.scope}
            onPress={() => onChange(s.scope)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            testID={`ranking-scope-${s.scope}`}
            className="h-10 flex-1 items-center justify-center rounded-pill"
            style={selected ? { backgroundColor: colors.accent } : undefined}
          >
            <Text
              className="font-body-bold text-body-bold text-white/70"
              style={selected ? { color: colors.surfaceDark } : undefined}
            >
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A position filter: the position tag (the onboarding look), selectable. */
function PositionFilter({
  code,
  selected,
  onPress,
}: {
  code: Position;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={positionLabel(code)}
      testID={`ranking-position-${code}`}
      className="justify-center"
    >
      <PositionTag code={code} selected={selected} />
    </Pressable>
  );
}

// The podium's pedestals take the palette in its order: 1º lime, 2º blue, 3º orange.
const PEDESTAL: Record<1 | 2 | 3, { box: string; label: string; height: string }> = {
  1: { box: 'bg-accent', label: 'text-surface-dark', height: 'h-24' },
  2: { box: 'bg-primary', label: 'text-text-on-dark', height: 'h-16' },
  3: { box: 'bg-tertiary', label: 'text-surface-dark', height: 'h-12' },
};

// ── Top-3 podium on the navy hero (2º left, 1º center and tallest, 3º right) ──
function PodiumColumn({
  row,
  place,
}: {
  row: RankingRowData | undefined;
  place: 1 | 2 | 3;
}) {
  if (!row) return <View className="items-center w-24" />;

  const pedestal = PEDESTAL[place];

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
        className="font-body-semibold text-body-bold text-text-on-dark mt-2 text-center"
      >
        {row.name}
      </Text>
      <Text className="font-num text-accent text-body">{row.score} pts</Text>
      <View
        className={`w-24 mt-2 items-center justify-center rounded-t-card border-2 border-b-0 border-surface-dark ${pedestal.box} ${pedestal.height}`}
      >
        <Text className={`font-num ${pedestal.label}`} style={{ fontSize: place === 1 ? 32 : 22 }}>
          {row.position}º
        </Text>
      </View>
    </Pressable>
  );
}

function Podium({ top, season }: { top: RankingRowData[]; season: string }) {
  return (
    <View className="mx-4 overflow-hidden rounded-card" testID="ranking-podium">
      <LinearGradient
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 16 }}
      >
        <Text
          className="px-4 font-body-bold text-eyebrow text-accent uppercase text-center"
          style={{ letterSpacing: 1.5 }}
        >
          {season}
        </Text>
        <View className="flex-row items-end justify-center gap-3 px-4 mt-4">
          <PodiumColumn row={top[1]} place={2} />
          <PodiumColumn row={top[0]} place={1} />
          <PodiumColumn row={top[2]} place={3} />
        </View>
      </LinearGradient>
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
        <Podium
          top={top}
          season={`Temporada de ${seasonName(data!.seasonStart)}${
            scope === 'general' ? ` · mínimo de ${data!.minMatches} jogos` : ''
          }`}
        />
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
        contentContainerStyle={{ paddingTop: headerHeight + 8 }}
      >
        <ScopeSwitch value={scope} onChange={setScope} />

        {scope === 'group' && groups.data && groups.data.length > 0 ? (
          <ChipRow label="Grupo">
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

        <ChipRow label="Posição">
          <Pressable
            onPress={() => setPosition(undefined)}
            accessibilityRole="button"
            accessibilityState={{ selected: position === undefined }}
            testID="ranking-position-all"
            className="h-8 justify-center self-center rounded-pill border-2 border-line bg-white px-3"
            style={position === undefined ? { borderColor: colors.primary, backgroundColor: colors.bgLightAlt } : undefined}
          >
            <Text className="font-body-bold text-caption text-surface-dark">Todas</Text>
          </Pressable>
          {POSITIONS.map((p) => (
            <PositionFilter key={p} code={p} selected={position === p} onPress={() => setPosition(p)} />
          ))}
        </ChipRow>

        <View className="mt-5">{body}</View>

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
