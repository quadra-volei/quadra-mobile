import { router } from "expo-router";
import {
  Bell,
  LayoutGrid,
  List,
  MapPin,
  Settings,
  SlidersHorizontal,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExploreFilterSheet } from "@/components/domain/ExploreFilterSheet";
import { MatchCard } from "@/components/domain/MatchCard";
import { Button } from "@/components/ui/Button";
import { PressableScale } from "@/components/ui/PressableScale";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { StateMessage } from "@/components/ui/StateMessage";
import { IconButton } from "@/components/ui/IconButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { FilterChip } from "@/components/ui/FilterChip";
import { SearchField } from "@/components/ui/SearchField";
import {
  DEFAULT_FILTERS,
  applyFilters,
  countActive,
  toggle,
  type ExploreFilters,
} from "@/features/explore/lib/filters";
import { useNearbyMatches } from "@/features/matches/api/getNearby";
import { isMapAvailable } from "@/features/matches/lib/isMapAvailable";
import { useDeviceCoords } from "@/features/matches/lib/useDeviceCoords";
import type { NearbyMatch } from "@/features/matches/types/match";
import { colors } from "@/theme/colors";
import { TAB_BAR_CLEARANCE } from "@/theme/layout";

// Where Explore searches when the device location is not available: São Paulo
// centre. Explore never prompts for location (S6 spec "Permissions"). The
// radius is the API's 50 km cap: one fetch, then every filter (distance
// included) runs on the device (DECISIONS #114).
const DEFAULT_GEO = { lat: -23.55, lon: -46.63, radiusKm: 50 };

type ViewMode = "grid" | "list";

/** One-tap shortcuts into the same filters the sheet edits. */
const QUICK: {
  label: string;
  on: (f: ExploreFilters) => boolean;
  flip: (f: ExploreFilters) => Partial<ExploreFilters>;
}[] = [
  {
    label: "Hoje",
    on: (f) => f.when === "today",
    flip: (f) => ({ when: f.when === "today" ? "any" : "today" }),
  },
  {
    label: "Fim de semana",
    on: (f) => f.when === "weekend",
    flip: (f) => ({ when: f.when === "weekend" ? "any" : "weekend" }),
  },
  {
    label: "Com vaga",
    on: (f) => f.withSpots,
    flip: (f) => ({ withSpots: !f.withSpots }),
  },
  {
    label: "Grátis",
    on: (f) => f.maxPrice === 0,
    flip: (f) => ({ maxPrice: f.maxPrice === 0 ? null : 0 }),
  },
  {
    label: "Iniciante",
    on: (f) => f.levels.includes("INICIANTE"),
    flip: (f) => ({ levels: toggle(f.levels, "INICIANTE") }),
  },
  {
    label: "6x6",
    on: (f) => f.formats.includes("6X6"),
    flip: (f) => ({ formats: toggle(f.formats, "6X6") }),
  },
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

/** "Filtros" pill: opens the sheet; filled with a count badge when filters are on. */
function FiltersButton({
  active,
  onPress,
}: {
  active: number;
  onPress: () => void;
}) {
  const on = active > 0;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={on ? `Filtros, ${active} ativos` : "Filtros"}
      className="h-9 px-3 rounded-pill flex-row items-center gap-1.5 bg-white border border-line"
      style={
        on
          ? { backgroundColor: colors.surfaceDark, borderColor: colors.surfaceDark }
          : undefined
      }
    >
      <SlidersHorizontal
        size={16}
        color={on ? colors.textOnDark : colors.surfaceDark}
      />
      <Text
        className="font-mono text-mono uppercase text-text-primary"
        style={on ? { color: colors.textOnDark } : undefined}
      >
        Filtros
      </Text>
      {on ? (
        <View className="h-5 min-w-[20px] px-1 rounded-pill bg-accent items-center justify-center">
          <Text className="font-body-bold text-caption text-text-primary">
            {active}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

/**
 * Static mini map (Android lite mode: a bitmap, cheap inside a scroll list)
 * with a pin per visible match, framed around the search centre and the
 * nearest results. Taps go to the card around it, never into the map.
 */
function MiniMap({
  center,
  matches,
}: {
  center: { lat: number; lon: number };
  matches: NearbyMatch[];
}) {
  const pins = matches.slice(0, 20);
  const span = pins.reduce(
    (max, m) =>
      Math.max(max, Math.abs(m.lat - center.lat), Math.abs(m.lon - center.lon)),
    0,
  );
  const delta = Math.max(span * 2.4, 0.03);
  return (
    <View pointerEvents="none" className="h-36" testID="explore-mini-map">
      <MapView
        key={`${center.lat},${center.lon},${delta},${pins.length}`}
        liteMode
        style={{ flex: 1 }}
        initialRegion={{
          latitude: center.lat,
          longitude: center.lon,
          latitudeDelta: delta,
          longitudeDelta: delta,
        }}
      >
        {pins.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.lat, longitude: m.lon }}
            pinColor={colors.primary}
          />
        ))}
      </MapView>
    </View>
  );
}

function ResultsArea({
  view,
  setView,
}: {
  view: ViewMode;
  setView: (next: ViewMode) => void;
}) {
  const [filters, setFilters] = useState<ExploreFilters>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const coords = useDeviceCoords();
  const geo = coords
    ? { ...DEFAULT_GEO, lat: coords.latitude, lon: coords.longitude }
    : DEFAULT_GEO;
  const { data, isPending, isError, refetch } = useNearbyMatches(geo);

  const results = useMemo(
    () => applyFilters(data ?? [], filters),
    [data, filters],
  );
  // The match featured on the map card: the closest one found.
  const nearest = useMemo(
    () => results.reduce<NearbyMatch | undefined>(
      (best, m) => (!best || m.distanceKm < best.distanceKm ? m : best),
      undefined,
    ),
    [results],
  );
  const active = countActive(filters);
  const patch = (p: Partial<ExploreFilters>) =>
    setFilters((f) => ({ ...f, ...p }));

  return (
    <>
      {/* ── Search bar ── */}
      <View className="px-4">
        <SearchField
          value={filters.query}
          onChangeText={(query) => patch({ query })}
          placeholder="Buscar quadra, bairro ou horário..."
          onClear={() => patch({ query: "" })}
        />
      </View>

      {/* ── Filtros button + quick chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 gap-2 mt-3"
      >
        <FiltersButton active={active} onPress={() => setSheetOpen(true)} />
        {QUICK.map((q) => (
          <FilterChip
            key={q.label}
            label={q.label}
            selected={q.on(filters)}
            onPress={() => patch(q.flip(filters))}
          />
        ))}
      </ScrollView>

      {/* ── Map card: mini map of the filtered results + the nearest one.
          The whole card opens the full map (S17). ── */}
      <PressableScale
        className="mx-4 mt-4 bg-white rounded-card shadow-card overflow-hidden"
        onPress={goMap}
        accessibilityRole="button"
        accessibilityLabel="Abrir mapa de partidas"
      >
        {isMapAvailable() ? <MiniMap center={geo} matches={results} /> : null}
        <View className="p-3 flex-row items-center gap-3">
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
        </View>
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
        onClearFilters={() => setFilters(DEFAULT_FILTERS)}
      />

      <ExploreFilterSheet
        visible={sheetOpen}
        value={filters}
        source={data ?? []}
        onApply={(next) => {
          setFilters(next);
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
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
