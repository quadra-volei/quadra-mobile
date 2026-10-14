import { router } from "expo-router";
import { Bell, LayoutGrid, List, MapPin, Settings } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MatchCard } from "@/components/domain/MatchCard";
import { Button } from "@/components/ui/Button";
import { PressableScale } from "@/components/ui/PressableScale";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { StateMessage } from "@/components/ui/StateMessage";
import { IconButton } from "@/components/ui/IconButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { FilterChip } from "@/components/ui/FilterChip";
import { SearchField } from "@/components/ui/SearchField";
import { useNearbyMatches } from "@/features/matches/api/getNearby";
import { useDeviceCoords } from "@/features/matches/lib/useDeviceCoords";
import type { NearbyMatch } from "@/features/matches/types/match";
import { colors } from "@/theme/colors";
import { TAB_BAR_CLEARANCE } from "@/theme/layout";

// Where Explore searches when the device location is not available: São Paulo
// centre. Explore never prompts for location (S6 spec "Permissions").
const DEFAULT_GEO = { lat: -23.55, lon: -46.63, radiusKm: 5 };

type FilterId = "todos" | "perto" | "hoje" | "iniciante" | "6x6";
type ViewMode = "grid" | "list";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "perto", label: "Perto" },
  { id: "hoje", label: "Hoje" },
  { id: "iniciante", label: "Iniciante" },
  { id: "6x6", label: "6x6" },
];

function goMap() {
  router.push("/explore/map");
}
function goMatch(id: string) {
  router.push({ pathname: "/matches/[id]", params: { id } });
}
function goSettings() {
  router.push("/profile/settings");
}

/**
 * Pure, deterministic client-side derivation of the visible results from the
 * nearby list + search text + active chip. Server-side search/filter/bbox
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
    case "perto":
      // "Perto" sorts by proximity (nearest first).
      list = list.slice().sort((a, b) => a.distanceKm - b.distanceKm);
      break;
    case "iniciante":
      list = list.filter((m) => m.level === "INICIANTE");
      break;
    case "6x6":
      list = list.filter((m) => m.format === "6X6");
      break;
    case "hoje": {
      // Matches that start today (device time). One with no known start stays.
      const today = new Date().toDateString();
      list = list.filter(
        (m) => !m.startsAt || new Date(m.startsAt).toDateString() === today,
      );
      break;
    }
    case "todos":
    default:
      break;
  }

  return list;
}

function ResultsArea({
  view,
  setView,
}: {
  view: ViewMode;
  setView: (next: ViewMode) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterId>("todos");

  const coords = useDeviceCoords();
  const { data, isPending, isError, refetch } = useNearbyMatches(
    coords
      ? { ...DEFAULT_GEO, lat: coords.latitude, lon: coords.longitude }
      : DEFAULT_GEO,
  );

  const results = useMemo(
    () => deriveResults(data ?? [], query, activeFilter),
    [data, query, activeFilter],
  );
  // The match featured on the map preview: the closest one found.
  const nearest = useMemo(
    () => results.slice().sort((a, b) => a.distanceKm - b.distanceKm)[0],
    [results],
  );

  function clearFilters() {
    setQuery("");
    setActiveFilter("todos");
  }

  return (
    <>
      {/* ── Search bar ── */}
      <View className="px-4">
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar quadra, bairro ou horário..."
          onClear={() => setQuery("")}
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

      {/* ── Map entry (full map is S17): how many matches are nearby and how
          far the closest one is. One flat row — the whole row opens the map. ── */}
      <PressableScale
        className="mx-4 mt-4 p-3 flex-row items-center gap-3 bg-white rounded-card shadow-card overflow-hidden"
        onPress={goMap}
        accessibilityRole="button"
        accessibilityLabel="Abrir mapa de partidas"
      >
        <View className="h-10 w-10 rounded-chip bg-primary items-center justify-center">
          <MapPin size={20} color={colors.textOnDark} />
        </View>
        <View className="flex-1">
          <Text
            className="font-body-bold text-body text-text-primary"
            numberOfLines={1}
          >
            {results.length} jogos por perto
          </Text>
          {nearest ? (
            <View className="flex-row gap-1">
              <Text className="font-body text-caption text-text-muted">
                Mais perto:
              </Text>
              <Text
                className="shrink font-body-semibold text-caption text-text-primary"
                numberOfLines={1}
              >
                {nearest.distanceKm.toFixed(1).replace(".", ",")} km ·{" "}
                {nearest.priceLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <Button variant="primary" onPress={goMap}>
          Ver
        </Button>
      </PressableScale>

      {/* ── Results count + Grade/Lista toggle ── */}
      <View className="flex-row items-center justify-between px-4 mt-6">
        <Text
          className="font-body-semibold text-body-bold text-text-primary"
          accessibilityLiveRegion="polite"
        >
          {results.length} partidas encontradas
        </Text>
        <Button
          variant="ghost"
          onPress={() => setView(view === "grid" ? "list" : "grid")}
          leftIcon={
            view === "grid" ? (
              <LayoutGrid size={18} color={colors.primary} />
            ) : (
              <List size={18} color={colors.primary} />
            )
          }
        >
          {view === "grid" ? "Grade" : "Lista"}
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
      <View className="flex-row flex-wrap justify-between px-4 gap-y-3 mt-2">
        <View className="w-[48%]">
          <SkeletonBlock className="h-[172px]" />
        </View>
        <View className="w-[48%]">
          <SkeletonBlock className="h-[172px]" />
        </View>
        <View className="w-[48%]">
          <SkeletonBlock className="h-[172px]" />
        </View>
        <View className="w-[48%]">
          <SkeletonBlock className="h-[172px]" />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <StateMessage
        message="Não foi possível carregar"
        actionLabel="Tentar novamente"
        onAction={onRetry}
      />
    );
  }

  if (results.length === 0) {
    // Distinguish "no data at all" from "filtered out by search/chip".
    if (sourceEmpty) {
      return (
        <StateMessage message="Nenhuma partida perto de você ainda" />
      );
    }
    return (
      <StateMessage
        message="Nenhuma partida encontrada para esta busca"
        actionLabel="Limpar filtros"
        onAction={onClearFilters}
      />
    );
  }

  return (
    <View
      className={
        view === "grid"
          ? "flex-row flex-wrap justify-between px-4 gap-y-3 mt-2"
          : "px-4 gap-3 mt-2"
      }
    >
      {results.map((m) => (
        <View key={m.id} className={view === "grid" ? "w-[48%]" : "w-full"}>
          <MatchCard match={m} onPress={goMatch} />
        </View>
      ))}
    </View>
  );
}

export default function ExploreScreen() {
  const [view, setView] = useState<ViewMode>("grid");
  const [headerHeight, setHeaderHeight] = useState(0);
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-bg-light">
      <View className="flex-1 bg-bg-light">
        <ScrollView
          contentContainerStyle={{
            paddingTop: headerHeight,
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
          }}
        >
          <ResultsArea view={view} setView={setView} />
        </ScrollView>
      </View>

      {/* Screen header — no avatar/greeting. Bell is a no-op this iteration
          (no notifications screen). */}
      <ScreenHeader onHeight={setHeaderHeight}>
        <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
          <Text className="font-display text-h1 text-text-primary uppercase">
            EXPLORAR
          </Text>
          <View className="flex-row items-center gap-3">
            <IconButton label="Notificações" onPress={() => {}}>
              <Bell size={20} color={colors.surfaceDark} />
            </IconButton>
            <IconButton label="Configurações" onPress={goSettings}>
              <Settings size={20} color={colors.surfaceDark} />
            </IconButton>
          </View>
        </View>
      </ScreenHeader>
    </View>
  );
}
