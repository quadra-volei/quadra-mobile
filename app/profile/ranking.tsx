import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, ChevronDown, ChevronLeft, Sun } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RankingRow } from '@/components/domain/RankingRow';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { useGroupRanking } from '@/features/ranking/api/getGroupRanking';
import type { RankingRow as RankingRowData } from '@/features/ranking/types/ranking';
import { useAuthStore } from '@/stores/auth';
import { colors, HERO_GRADIENT } from '@/theme/colors';

// MOCK: single recurring-match group for MVP. The selector becomes a real picker
// only once a user belongs to ≥2 groups; here it is present but inert.
const MOCK_GROUP_NAME = 'Vôlei de quinta';

function noop() {}

/** Neutral rounded skeleton block (DESIGN_SYSTEM skeleton shapes TBD — flag). */
function SkeletonBlock({ className }: { className: string }) {
  return <View className={`bg-bg-light-alt rounded-card ${className}`} />;
}

// ── Header (inline; title + back variant — a pushed stack screen) ──
function RankingHeader() {
  return (
    <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={colors.surfaceDark} />
        </Pressable>
        <Text className="font-display text-h1 text-text-primary uppercase">
          RANKING
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notificações"
          onPress={noop}
        >
          <Bell size={24} color={colors.surfaceDark} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Alternar tema"
          onPress={noop}
        >
          <Sun size={24} color={colors.surfaceDark} />
        </Pressable>
      </View>
    </View>
  );
}

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

// ── Group selector (Amigos tab only; inert single-group for MVP-mock) ──
function GroupSelector({ groupName }: { groupName: string }) {
  return (
    <View className="px-4 pb-2">
      <Pressable
        className="flex-row items-center gap-1"
        accessibilityRole="button"
        accessibilityLabel="Selecionar grupo"
        onPress={noop}
      >
        <Text className="font-body text-body-bold text-text-primary">
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
      <Avatar uri={undefined} name={row.name} size="lg" />
      <Text className="font-body text-body-bold text-text-primary mt-2 text-center">
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

function RankingErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="mx-4 mt-6 py-8 items-center" accessibilityLiveRegion="polite">
      <Text className="font-body text-body text-text-muted text-center">
        Não foi possível carregar o ranking
      </Text>
      <Button variant="ghost" onPress={onRetry}>
        Tentar novamente
      </Button>
    </View>
  );
}

function RankingEmptyBlock() {
  return (
    <View className="mx-4 mt-10 py-8 items-center" accessibilityLiveRegion="polite">
      <Text className="font-body text-caption text-text-muted text-center">
        Entre em uma partida recorrente para aparecer no ranking
      </Text>
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

  const isMe = (row: RankingRowData) =>
    userId != null ? row.playerId === userId : Boolean(row.isMe);

  const top = data?.slice(0, 3) ?? [];
  const rest = data?.slice(3) ?? [];

  return (
    <View className="flex-1 bg-bg-light">
      <SafeAreaView edges={['top']} className="flex-1">
        <RankingHeader />
        <ScopeTabs scope={scope} onSelectAmigos={() => setScope('amigos')} />
        <GroupSelector groupName={MOCK_GROUP_NAME} />

        <ScrollView contentContainerClassName="pb-10">
          {isPending ? (
            <RankingSkeleton />
          ) : isError ? (
            <RankingErrorBlock onRetry={() => refetch()} />
          ) : data.length === 0 ? (
            <RankingEmptyBlock />
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
      </SafeAreaView>
    </View>
  );
}
