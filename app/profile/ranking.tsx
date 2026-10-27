import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleHelp, Crown, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { PositionTag } from '@/components/domain/PositionPicker';
import { RankingRow } from '@/components/domain/RankingRow';
import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { IconButton } from '@/components/ui/IconButton';
import { FilterChip } from '@/components/ui/FilterChip';
import { PressableScale } from '@/components/ui/PressableScale';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import { POSITIONS, positionLabel, type Position } from '@/features/profile/schema/onboarding';
import {
  useRanking,
  useRankingGroups,
  type Ranking,
  type RankingScope,
  type RankingSort,
} from '@/features/ranking/api/getGroupRanking';
import { POINT_RULES } from '@/features/ranking/pointRules';
import type { PointsBreakdown, RankingRow as RankingRowData } from '@/features/ranking/types/ranking';
import { colors, HERO_GRADIENT } from '@/theme/colors';
import { ICON_HIT_SLOP } from '@/theme/layout';
import { MOTION } from '@/theme/motion';

function openPlayer(id: string) {
  router.push(`/players/${id}`);
}

const SCOPES: { scope: RankingScope; label: string }[] = [
  { scope: 'friends', label: 'Rede' },
  { scope: 'group', label: 'Grupos' },
  { scope: 'general', label: 'Geral' },
];

const SORTS: { sort: RankingSort; label: string }[] = [
  { sort: 'points', label: 'Pontos' },
  { sort: 'mvps', label: 'MVPs' },
  { sort: 'wins', label: 'Vitórias' },
];

const EMPTY_MESSAGE: Record<RankingScope, string> = {
  friends: 'Ninguém da sua rede pontuou neste mês. Jogos recorrentes contam pontos.',
  group: 'Ninguém pontuou neste grupo neste mês',
  general: 'Ninguém tem jogos suficientes neste mês ainda',
};

// The breakdown bar takes the palette in its order (blue, lime, orange); MVP,
// the main signal, gets the lime highlight.
const BREAKDOWN: { key: keyof PointsBreakdown; label: string; fill: string }[] = [
  { key: 'attendance', label: 'Presença', fill: 'bg-primary' },
  { key: 'mvp', label: 'MVP', fill: 'bg-accent' },
  { key: 'wins', label: 'Vitórias', fill: 'bg-tertiary' },
];

// The ledger starts in July 2026 (the first recurring games); the arrows never go before it.
const FIRST_SEASON = '2026-07';

/** `yyyy-MM` of a date, in Brasília time. */
function monthOf(date: Date): string {
  const [, month, year] = date
    .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    .split('/');
  return `${year}-${month}`;
}

function shiftMonth(season: string, by: number): string {
  const [year, month] = season.split('-').map(Number);
  const d = new Date(Date.UTC(year!, month! - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthName(season: string): string {
  const [year, month] = season.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, 15)).toLocaleDateString('pt-BR', {
    month: 'long',
    timeZone: 'UTC',
  });
}

/** The number a row shows under the chosen order. */
function scoreFor(row: RankingRowData, sort: RankingSort): number {
  if (sort === 'mvps') return row.mvps ?? 0;
  if (sort === 'wins') return row.wins ?? 0;
  return row.score;
}

const UNIT: Record<RankingSort, { short: string; long: string; one: string }> = {
  points: { short: 'pts', long: 'pontos', one: 'ponto' },
  mvps: { short: 'MVP', long: 'MVPs', one: 'MVP' },
  wins: { short: 'vit.', long: 'jogos ganhos', one: 'jogo ganho' },
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
 * A segmented control on navy (the active one lime): Rede · Grupos · Geral and
 * the list order. Selected colors inline, never a toggled className (DECISIONS #87).
 */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  testID,
  compact,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  testID: string;
  compact?: boolean;
}) {
  return (
    <View className="flex-row rounded-pill bg-surface-dark p-1" testID={testID}>
      {options.map((o) => {
        const selected = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            testID={`${testID}-${o.key}`}
            className={`${compact ? 'h-8 px-3' : 'h-10 flex-1'} items-center justify-center rounded-pill`}
            style={selected ? { backgroundColor: colors.accent } : undefined}
          >
            <Text
              className={`font-body-bold ${compact ? 'text-caption' : 'text-body-bold'} text-white/70`}
              style={selected ? { color: colors.surfaceDark } : undefined}
            >
              {o.label}
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

// ── Top-3 podium (2º left, 1º center and tallest, 3º right) ──
function PodiumColumn({
  row,
  place,
  sort,
  champion,
}: {
  row: RankingRowData | undefined;
  place: 1 | 2 | 3;
  sort: RankingSort;
  champion: boolean;
}) {
  if (!row) return <View className="items-center w-24" />;

  const pedestal = PEDESTAL[place];
  const score = scoreFor(row, sort);

  return (
    <Animated.View entering={FadeInDown.delay(place * 80).duration(260)}>
      <Pressable
        className="items-center w-24"
        accessibilityRole="button"
        accessibilityLabel={`${row.position}º, ${row.name}, ${score} ${UNIT[sort].long}`}
        onPress={() => openPlayer(row.playerId)}
      >
        {champion ? <Crown size={22} color={colors.accent} /> : <View className="h-6" />}
        <Avatar uri={row.photoUrl} name={row.name} size="lg" level={row.level} />
        <Text
          numberOfLines={1}
          className="font-body-semibold text-body-bold text-text-on-dark mt-2 text-center"
        >
          {row.name}
          {row.isMe ? ' · você' : ''}
        </Text>
        <Text className="font-num text-accent text-body">
          {score} {UNIT[sort].short}
        </Text>
        <View
          className={`w-24 mt-2 items-center justify-center rounded-t-card border-2 border-b-0 border-surface-dark ${pedestal.box} ${pedestal.height}`}
        >
          <Text className={`font-num ${pedestal.label}`} style={{ fontSize: place === 1 ? 32 : 22 }}>
            {row.position}º
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** The navy hero: the season with its arrows, then the podium (or the empty / error state). */
function Hero({
  season,
  isCurrent,
  canGoBack,
  onShift,
  sort,
  children,
  top,
}: {
  season: string;
  isCurrent: boolean;
  canGoBack: boolean;
  onShift: (by: number) => void;
  sort: RankingSort;
  children?: React.ReactNode;
  top: RankingRowData[];
}) {
  const champion = !isCurrent && top.length > 0;
  return (
    <View className="mx-4 overflow-hidden rounded-card" testID="ranking-podium">
      <LinearGradient
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 12, paddingBottom: children ? 8 : 0 }}
      >
        <View className="flex-row items-center justify-between px-3">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            disabled={!canGoBack}
            hitSlop={ICON_HIT_SLOP}
            onPress={() => onShift(-1)}
            testID="ranking-season-prev"
            style={{ opacity: canGoBack ? 1 : 0.3 }}
          >
            <ChevronLeft size={24} color={colors.textOnDark} />
          </PressableScale>
          <View className="items-center">
            <Text
              className="font-body-bold text-eyebrow text-accent uppercase"
              style={{ letterSpacing: 1.5 }}
              testID="ranking-season"
            >
              {champion ? `Campeão de ${monthName(season)}` : `Temporada de ${monthName(season)}`}
            </Text>
            <Text className="font-body text-caption text-white/70 mt-1">
              {isCurrent ? 'Zera no dia 1º do próximo mês' : 'Temporada encerrada'}
            </Text>
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
            disabled={isCurrent}
            hitSlop={ICON_HIT_SLOP}
            onPress={() => onShift(1)}
            testID="ranking-season-next"
            style={{ opacity: isCurrent ? 0.3 : 1 }}
          >
            <ChevronRight size={24} color={colors.textOnDark} />
          </PressableScale>
        </View>
        {children ?? (
          <View className="flex-row items-end justify-center gap-3 px-4 mt-3">
            <PodiumColumn row={top[1]} place={2} sort={sort} champion={false} />
            <PodiumColumn row={top[0]} place={1} sort={sort} champion={champion} />
            <PodiumColumn row={top[2]} place={3} sort={sort} champion={false} />
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

/** A stacked bar of where the points came from, with its legend. */
function BreakdownBar({ breakdown, total }: { breakdown: PointsBreakdown; total: number }) {
  const parts = BREAKDOWN.filter((b) => breakdown[b.key] > 0);
  return (
    <View testID="ranking-breakdown">
      <View className="h-3 rounded-pill bg-bg-light-alt overflow-hidden flex-row">
        {parts.map((b) => (
          <View
            key={b.key}
            className={`h-3 ${b.fill}`}
            style={{ width: `${total > 0 ? (breakdown[b.key] / total) * 100 : 0}%` }}
          />
        ))}
      </View>
      <View className="flex-row flex-wrap gap-x-4 gap-y-1 mt-2">
        {BREAKDOWN.map((b) => (
          <View key={b.key} className="flex-row items-center gap-1">
            <View className={`w-2 h-2 rounded-full ${b.fill}`} />
            <Text className="font-body text-caption text-text-muted">
              {b.label} <Text className="font-num text-text-primary">{breakdown[b.key]}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** A small stat: a Russo number over its label. */
function Stat({ value, one, many }: { value: number; one: string; many: string }) {
  return (
    <View className="flex-1 flex-row items-center gap-2 rounded-chip bg-bg-light px-4 py-3">
      <Text className="font-num text-primary" style={{ fontSize: 20 }}>
        {value}
      </Text>
      <Text className="flex-1 font-body text-caption text-text-muted" numberOfLines={2}>
        {value === 1 ? one : many}
      </Text>
    </View>
  );
}

/** Two by two, so each label has room inside its box. */
function Stats({ row }: { row: RankingRowData }) {
  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <Stat value={row.matches ?? 0} one="partida" many="partidas" />
        <Stat value={row.wins ?? 0} one="jogo ganho" many="jogos ganhos" />
      </View>
      <View className="flex-row gap-2">
        <Stat value={row.votes ?? 0} one="voto de MVP" many="votos de MVP" />
        <Stat value={row.mvps ?? 0} one="vez MVP do dia" many="vezes MVP do dia" />
      </View>
    </View>
  );
}

/** My standing: rank, points, the arrow, who to pass and where my points came from. */
function MyStanding({ data, sort, isCurrent }: { data: Ranking; sort: RankingSort; isCurrent: boolean }) {
  const me = data.me;
  if (!me) {
    return (
      <View className="mx-4 mt-4 rounded-card bg-white shadow-card p-4" testID="ranking-me">
        <Text className="font-body-bold text-body-bold text-text-primary">
          {isCurrent ? 'Você ainda não pontuou neste mês' : 'Você não pontuou neste mês'}
        </Text>
        <Text className="font-body text-caption text-text-muted mt-1">
          Jogue uma partida recorrente para entrar no ranking.
        </Text>
      </View>
    );
  }

  const mine = scoreFor(me, sort);
  const target = data.nextUp;
  const gap = target ? scoreFor(target, sort) - mine : 0;
  const missing = me.position == null ? Math.max(data.minMatches - (me.matches ?? 0), 1) : 0;

  return (
    <Animated.View
      entering={FadeIn.duration(MOTION.fadeIn)}
      className="mx-4 mt-4 rounded-card bg-white shadow-card p-4"
      testID="ranking-me"
    >
      <View className="flex-row items-center">
        <View className="items-center w-24">
          <Text className="font-num text-primary" style={{ fontSize: 32 }}>
            {me.position != null ? `${me.position}º` : '–'}
          </Text>
          <Text numberOfLines={1} className="font-body text-caption text-text-muted">sua posição</Text>
        </View>
        <View className="flex-1 ml-3">
          <Text className="font-body-bold text-body-bold text-text-primary">
            {mine} {mine === 1 ? UNIT[sort].one : UNIT[sort].long}
          </Text>
          <Text className="font-body text-caption text-text-muted mt-1" testID="ranking-me-goal">
            {!isCurrent
              ? me.position != null
                ? `Temporada encerrada: você terminou em ${me.position}º`
                : 'Temporada encerrada'
              : missing > 0
              ? `Jogue mais ${missing} ${missing === 1 ? 'partida' : 'partidas'} neste mês para entrar no ranking`
              : me.position === 1
                ? 'Você lidera! Continue jogando para segurar o topo.'
                : target
                  ? `Faltam ${gap + 1} ${UNIT[sort].short} para passar ${target.name}`
                  : 'Continue jogando para subir.'}
          </Text>
          {me.trend && me.trend.direction !== 'flat' ? (
            <Text
              className="font-body-bold text-caption mt-1"
              style={{ color: me.trend.direction === 'up' ? colors.success : colors.danger }}
            >
              {me.trend.direction === 'up' ? '▲ subiu' : '▼ caiu'} {me.trend.delta}{' '}
              {me.trend.delta === 1 ? 'posição' : 'posições'} na semana
            </Text>
          ) : null}
        </View>
      </View>
      {me.breakdown && me.score > 0 ? (
        <View className="mt-4">
          <BreakdownBar breakdown={me.breakdown} total={me.score} />
        </View>
      ) : null}
    </Animated.View>
  );
}

// The "Como pontuar" tutorial, as a list: the point rules, then how the season works.
const TUTORIAL: typeof POINT_RULES = [
  ...POINT_RULES,
  { badge: '1º', title: 'Temporada', detail: 'O ranking vale para o mês e zera no dia 1º. No Geral, só entra quem jogou 3 partidas no mês.' },
  { badge: '▲', title: 'Subiu ou caiu', detail: 'A seta compara a sua posição com a de 7 dias atrás.' },
];

function HowToScoreSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        onPress={onClose}
        className="flex-1 justify-end bg-black/40"
      >
        {/* Taps on the card must not reach the backdrop. */}
        <Pressable
          onPress={() => {}}
          testID="ranking-tutorial"
          className="rounded-t-card bg-bg-light px-4 pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-h2 text-text-primary uppercase">Como pontuar</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-chip bg-white shadow-card"
            >
              <X size={20} color={colors.surfaceDark} />
            </Pressable>
          </View>
          <Text className="mt-1 font-body text-caption text-text-muted">
            O MVP, votado por quem jogou, é o que mais vale.
          </Text>
          <View className="mt-4 gap-2">
            {TUTORIAL.map((t) => (
              <View key={t.title} className="flex-row items-center gap-3 rounded-chip bg-white px-4 py-3 shadow-card">
                <View
                  className={`h-12 w-12 items-center justify-center rounded-chip ${t.mvp ? 'bg-accent' : 'bg-bg-light-alt'}`}
                >
                  <Text className={`font-num ${t.mvp ? 'text-surface-dark' : 'text-primary'}`} style={{ fontSize: 18 }}>
                    {t.badge}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-body-bold text-body-bold text-text-primary">{t.title}</Text>
                  <Text className="font-body text-caption text-text-muted">{t.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** A list row that opens in place: stats, where the points came from, "Ver perfil". */
function ExpandableRow({
  row,
  sort,
  open,
  onToggle,
  divider,
}: {
  row: RankingRowData;
  sort: RankingSort;
  open: boolean;
  onToggle: () => void;
  divider: boolean;
}) {
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View>
      {divider ? <View className="h-px bg-line mx-4" /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        testID={`ranking-row-${row.playerId}`}
        className={`flex-row items-center ${row.isMe ? 'bg-primary/10 rounded-card' : ''}`}
      >
        <View className="flex-1">
          <RankingRow
            row={{ ...row, score: scoreFor(row, sort) }}
            isMe={Boolean(row.isMe)}
            scoreUnit={UNIT[sort].long}
            highlight={false}
            onPressPlayer={() => openPlayer(row.playerId)}
            testID={`ranking-row-${row.playerId}-main`}
          />
        </View>
        <View className="pr-3">
          <Chevron size={18} color={colors.textMuted} />
        </View>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(MOTION.fadeIn)} className="px-4 pb-4 gap-3" testID="ranking-row-detail">
          <Stats row={row} />
          {row.breakdown && row.score > 0 ? <BreakdownBar breakdown={row.breakdown} total={row.score} /> : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

function RankingSkeleton() {
  return (
    <View className="mt-4 gap-2 mx-4">
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-16" />
      <SkeletonBlock className="h-16" />
    </View>
  );
}

/**
 * Season ranking (quadra-api DECISIONS #63, #95): Rede · Grupos · Geral, any
 * month since the first season, filtered by court position and ordered by
 * points, MVPs or games won. `?scope=group&groupId=` opens a group directly.
 */
export default function RankingScreen() {
  const params = useLocalSearchParams<{ scope?: RankingScope; groupId?: string }>();
  const [scope, setScope] = useState<RankingScope>(params.scope ?? 'friends');
  const [pickedGroupId, setGroupId] = useState<string | undefined>(params.groupId);
  const [position, setPosition] = useState<Position | undefined>();
  const [sort, setSort] = useState<RankingSort>('points');
  const currentSeason = monthOf(new Date());
  const [season, setSeason] = useState(currentSeason);
  const [openId, setOpenId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const groups = useRankingGroups();
  const groupId = pickedGroupId ?? groups.data?.[0]?.id;
  const isCurrent = season === currentSeason;
  const ranking = useRanking({
    scope,
    groupId: scope === 'group' ? groupId : undefined,
    position,
    season: isCurrent ? undefined : season,
    sort,
  });

  const [headerHeight, setHeaderHeight] = useState(0);

  const data = ranking.data;
  const top = data?.rows.slice(0, 3) ?? [];
  const noGroups = scope === 'group' && groups.isSuccess && groups.data.length === 0;

  let heroBody: React.ReactNode = undefined;
  if (noGroups) {
    heroBody = <StateMessage message="Jogue uma partida recorrente para ter o ranking do grupo" tone="dark" />;
  } else if (ranking.isPending) {
    heroBody = (
      <View className="flex-row items-end justify-center gap-3 px-4 mt-3 pb-2">
        <SkeletonBlock className="w-24 h-32" />
        <SkeletonBlock className="w-24 h-44" />
        <SkeletonBlock className="w-24 h-28" />
      </View>
    );
  } else if (ranking.isError) {
    heroBody = (
      <StateMessage
        message="Não foi possível carregar o ranking"
        actionLabel="Tentar novamente"
        onAction={() => ranking.refetch()}
        tone="dark"
      />
    );
  } else if (data!.rows.length === 0) {
    heroBody = <StateMessage message={EMPTY_MESSAGE[scope]} tone="dark" />;
  }

  const toggle = (id: string) => setOpenId((current) => (current === id ? null : id));

  return (
    <View className="flex-1 bg-bg-light">
      <ScrollView
        contentContainerClassName="pb-10"
        contentContainerStyle={{ paddingTop: headerHeight + 8 }}
        refreshControl={
          <RefreshControl
            refreshing={ranking.isRefetching}
            onRefresh={() => ranking.refetch()}
            progressViewOffset={headerHeight}
            colors={[colors.primary]}
          />
        }
      >
        <View className="mx-4">
          <Segmented
            options={SCOPES.map((s) => ({ key: s.scope, label: s.label }))}
            value={scope}
            onChange={setScope}
            testID="ranking-scope"
          />
        </View>

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

        <View className="mt-5">
          <Hero
            season={season}
            isCurrent={isCurrent}
            canGoBack={season > FIRST_SEASON}
            onShift={(by) => {
              setOpenId(null);
              setSeason((s) => shiftMonth(s, by));
            }}
            sort={sort}
            top={top}
          >
            {heroBody}
          </Hero>
        </View>

        {ranking.isPending && !noGroups ? <RankingSkeleton /> : null}

        {data && !noGroups ? <MyStanding data={data} sort={sort} isCurrent={isCurrent} /> : null}

        {data && !noGroups && data.rows.length > 0 ? (
          <View className="mx-4 mt-6">
            <Text className="font-display text-h2 text-text-primary uppercase">Classificação</Text>
            <View className="mt-3 self-start">
              <Segmented
                options={SORTS.map((s) => ({ key: s.sort, label: s.label }))}
                value={sort}
                onChange={setSort}
                testID="ranking-sort"
                compact
              />
            </View>
            <Text className="font-body text-caption text-text-muted mt-3">
              {scope === 'general' ? `Mínimo de ${data.minMatches} partidas no mês · ` : ''}
              Toque na linha para ver os números e na foto para abrir o perfil
            </Text>
            <Animated.View
              key={`${scope}-${season}-${sort}-${position ?? 'all'}`}
              entering={FadeIn.duration(MOTION.fadeIn)}
              className="mt-3 bg-white rounded-card shadow-card overflow-hidden"
            >
              {data.rows.map((row, i) => (
                <ExpandableRow
                  key={row.playerId}
                  row={row}
                  sort={sort}
                  open={openId === row.playerId}
                  onToggle={() => toggle(row.playerId)}
                  divider={i > 0}
                />
              ))}
            </Animated.View>
          </View>
        ) : null}

      </ScrollView>

      <BackHeader
        title="Ranking"
        onHeight={setHeaderHeight}
        right={
          <IconButton label="Como pontuar" onPress={() => setHelpOpen(true)} testID="ranking-help">
            <CircleHelp size={20} color={colors.surfaceDark} />
          </IconButton>
        }
      />
      <HowToScoreSheet visible={helpOpen} onClose={() => setHelpOpen(false)} />
    </View>
  );
}
