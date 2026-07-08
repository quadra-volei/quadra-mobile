import { BlurTargetView } from 'expo-blur';
import { router } from 'expo-router';
import { Bell, LayoutGrid, List, MapPin, Settings } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';

import { MatchCard } from '@/components/domain/MatchCard';
import { Button } from '@/components/ui/Button';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { FilterChip } from '@/components/ui/FilterChip';
import { SearchField } from '@/components/ui/SearchField';
import { useNearbyMatches } from '@/features/matches/api/getNearby';
import { useRegisterNavBlurTarget } from '@/stores/navBlurTarget';
import type { NearbyMatch } from '@/features/matches/types/match';
import { colors } from '@/theme/colors';

// Placeholder geo while nearby is mocked — no device location read on Explore
// (S6 spec "Permissions"; the real lat/lon arrive with S17's permission flow).
const PLACEHOLDER_GEO = { lat: -23.55, lon: -46.63, radiusKm: 5 };

type FilterId = 'todos' | 'perto' | 'hoje' | 'iniciante' | '6x6';
type ViewMode = 'grid' | 'list';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'perto', label: 'Perto' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'iniciante', label: 'Iniciante' },
  { id: '6x6', label: '6x6' },
];

function goMap() {
  router.push('/explore/map');
}
function goMatch(id: string) {
  router.push({ pathname: '/matches/[id]', params: { id } });
}
function goSettings() {
  router.push('/profile/settings');
}

/**
 * Pure, deterministic client-side derivation of the visible results from the
 * mocked list + search text + active chip. Server-side search/filter/bbox
 * params land with F1.7 (see S6 spec "Out of scope").
 */
function deriveResults(
  source: NearbyMatch[],
  query: string,
  activeFilter: FilterId,
): NearbyMatch[] {
  const q = query.trim().toLowerCase();
  let list = q
    ? source.filter((m) => m.name.toLowerCase().includes(q))
    : source.slice();

  switch (activeFilter) {
    case 'perto':
      // "Perto" sorts by proximity (nearest first).
      list = list.slice().sort((a, b) => a.distanceKm - b.distanceKm);
      break;
    case 'iniciante':
      list = list.filter((m) => m.level === 'INICIANTE');
      break;
    case '6x6':
      list = list.filter((m) => m.format === '6X6');
      break;
    case 'hoje':
      // TODO(real-api): "Hoje" is a documented no-op this iteration — NearbyMatch
      // has no date/time field and this screen must NOT extend the type or the S5
      // mock (S5's contract). The chip renders and toggles its selected state but
      // its predicate is the identity. Adding the date field is part of F1.7
      // alignment in quadra-api; only then does "Hoje" become a real filter.
      break;
    case 'todos':
    default:
      break;
  }

  return list;
}

/** Neutral rounded skeleton block (DESIGN_SYSTEM skeleton shapes TBD — flag). */
function SkeletonBlock({ className }: { className: string }) {
  return <View className={`bg-bg-light-alt rounded-card ${className}`} />;
}

function ResultsArea({
  view,
  setView,
}: {
  view: ViewMode;
  setView: (next: ViewMode) => void;
}) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterId>('todos');

  const { data, isPending, isError, refetch } = useNearbyMatches(PLACEHOLDER_GEO);

  const results = useMemo(
    () => deriveResults(data ?? [], query, activeFilter),
    [data, query, activeFilter],
  );

  function clearFilters() {
    setQuery('');
    setActiveFilter('todos');
  }

  return (
    <>
      {/* ── Search bar ── */}
      <View className="px-4">
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar quadra, bairro ou horário..."
          onClear={() => setQuery('')}
        />
      </View>

      {/* ── Filter chips (horizontal, selectable) ── */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 gap-2 mt-3"
        data={FILTERS}
        keyExtractor={(f) => f.id}
        renderItem={({ item }) => (
          <FilterChip
            label={item.label}
            selected={activeFilter === item.id}
            onPress={() => setActiveFilter(item.id)}
          />
        )}
      />

      {/* ── Map preview (inline; full map is S17) ── */}
      <Pressable
        className="mx-4 mt-4 h-44 rounded-card overflow-hidden shadow-card bg-bg-light-alt"
        onPress={goMap}
        accessibilityRole="button"
        accessibilityLabel="Abrir mapa de partidas"
      >
        {/* lime "N jogos ao vivo" badge (top-left). Display-only; no SignalR on
            this screen (live score is S14).
            TODO(real-api): live status is derived from the F1.7 payload — while
            mocked, NearbyMatch has no `live` flag and must NOT be extended, so the
            count tracks the loaded list length as a visual placeholder. */}
        <View className="absolute top-3 left-3 bg-accent rounded-pill px-3 py-1">
          <Text className="font-mono text-mono text-text-primary uppercase">
            {results.length} jogos ao vivo
          </Text>
        </View>

        {/* Floating selected-venue card (bottom) — STATIC visual placeholder, NOT
            data-bound. Venue name/rating/reviews are Layer-3 venue data absent
            from NearbyMatch; literal sample copy until S17 owns real venue data.
            The ★ is a plain text glyph (text-text-muted), not a lucide Star. */}
        <View className="absolute bottom-3 left-3 right-3 bg-white rounded-card shadow-card p-3 flex-row items-center gap-3">
          <View className="h-10 w-10 rounded-card bg-primary items-center justify-center">
            <MapPin size={20} color={colors.textOnDark} />
          </View>
          <View className="flex-1">
            <Text className="font-body text-h3 text-text-primary" numberOfLines={1}>
              Beach Vôlei SP
            </Text>
            <Text className="font-body text-caption text-text-muted">
              ★ 4.9 (341) · 3,4 km · R$ 40
            </Text>
          </View>
          <Button variant="primary" onPress={goMap}>
            Ver
          </Button>
        </View>
      </Pressable>

      {/* ── Results count + Grade/Lista toggle ── */}
      <View className="flex-row items-center justify-between px-4 mt-6">
        <Text
          className="font-body text-body-bold text-text-primary"
          accessibilityLiveRegion="polite"
        >
          {results.length} partidas encontradas
        </Text>
        <Button
          variant="ghost"
          onPress={() => setView(view === 'grid' ? 'list' : 'grid')}
          leftIcon={
            view === 'grid' ? (
              <LayoutGrid size={18} color={colors.primary} />
            ) : (
              <List size={18} color={colors.primary} />
            )
          }
        >
          {view === 'grid' ? 'Grade' : 'Lista'}
        </Button>
      </View>

      {/* ── Results: loading / error / empty / grid|list ── */}
      <ResultsBody
        isPending={isPending}
        isError={isError}
        results={results}
        view={view}
        sourceEmpty={(data ?? []).length === 0}
        onRetry={() => refetch()}
        onClearFilters={clearFilters}
      />
    </>
  );
}

function ResultsBody({
  isPending,
  isError,
  results,
  view,
  sourceEmpty,
  onRetry,
  onClearFilters,
}: {
  isPending: boolean;
  isError: boolean;
  results: NearbyMatch[];
  view: ViewMode;
  sourceEmpty: boolean;
  onRetry: () => void;
  onClearFilters: () => void;
}) {
  if (isPending) {
    return (
      <View className="flex-row flex-wrap px-4 gap-3 mt-2">
        <View className="w-[48%]">
          <SkeletonBlock className="h-36" />
        </View>
        <View className="w-[48%]">
          <SkeletonBlock className="h-36" />
        </View>
        <View className="w-[48%]">
          <SkeletonBlock className="h-36" />
        </View>
        <View className="w-[48%]">
          <SkeletonBlock className="h-36" />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="px-4 py-6 items-center" accessibilityLiveRegion="polite">
        <Text className="font-body text-body text-text-muted text-center">
          Não foi possível carregar
        </Text>
        <Button variant="ghost" onPress={onRetry}>
          Tentar novamente
        </Button>
      </View>
    );
  }

  if (results.length === 0) {
    // Distinguish "no data at all" from "filtered out by search/chip".
    if (sourceEmpty) {
      return (
        <View className="px-4 py-6 items-center" accessibilityLiveRegion="polite">
          <Text className="font-body text-caption text-text-muted text-center">
            Nenhuma partida perto de você ainda
          </Text>
        </View>
      );
    }
    return (
      <View className="px-4 py-6 items-center" accessibilityLiveRegion="polite">
        <Text className="font-body text-caption text-text-muted text-center">
          Nenhuma partida encontrada para esta busca
        </Text>
        <Button variant="ghost" onPress={onClearFilters}>
          Limpar filtros
        </Button>
      </View>
    );
  }

  return (
    <View
      className={
        view === 'grid'
          ? 'flex-row flex-wrap px-4 gap-3 mt-2'
          : 'px-4 gap-3 mt-2'
      }
    >
      {results.map((m) => (
        <View key={m.id} className={view === 'grid' ? 'w-[48%]' : 'w-full'}>
          <MatchCard match={m} onPress={goMatch} />
        </View>
      ))}
    </View>
  );
}

export default function ExploreScreen() {
  const [view, setView] = useState<ViewMode>('grid');
  const [headerHeight, setHeaderHeight] = useState(0);
  const blurTarget = useRef<View>(null);
  useRegisterNavBlurTarget(blurTarget);

  return (
    <View className="flex-1 bg-bg-light">
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
        <ScrollView
          contentContainerClassName="pb-24"
          contentContainerStyle={{ paddingTop: headerHeight }}
        >
          <ResultsArea view={view} setView={setView} />
        </ScrollView>
      </BlurTargetView>

      {/* Glass header — no avatar/greeting. Bell is a no-op this iteration
          (no notifications screen). */}
      <GlassHeader blurTarget={blurTarget} onHeight={setHeaderHeight}>
        <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
          <Text className="font-display text-h1 text-text-primary uppercase">
            EXPLORAR
          </Text>
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notificações"
              onPress={() => {}}
            >
              <Bell size={24} color={colors.surfaceDark} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Configurações"
              onPress={goSettings}
            >
              <Settings size={24} color={colors.surfaceDark} />
            </Pressable>
          </View>
        </View>
      </GlassHeader>
    </View>
  );
}
