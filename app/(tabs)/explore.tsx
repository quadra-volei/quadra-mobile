import { router } from "expo-router";
import {
  Bell,
  LayoutGrid,
  List,
  MapPin,
  Settings,
  SlidersHorizontal,
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, useWindowDimensions, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExploreFilterSheet } from "@/components/domain/ExploreFilterSheet";
import { MatchCard } from "@/components/domain/MatchCard";
import {
  CLUSTER_ANCHOR,
  MATCH_PIN_ANCHOR,
  clusterImage,
  matchPinImage,
  venuePinImage,
} from "@/components/domain/MapPins";
import { clusterPoints } from "@/features/explore/lib/cluster";
import {
  NEARBY_VENUES_KM,
  matchIdsAtVenues,
  useNearbyVenues,
  type NearbyVenue,
} from "@/features/explore/api/venues";
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
  NEARBY_KM,
  applyFilters,
  countActive,
  toggle,
  type ExploreFilters,
} from "@/features/explore/lib/filters";
import { useNearbyMatches } from "@/features/matches/api/getNearby";
import { isMapAvailable } from "@/features/matches/lib/isMapAvailable";
import { useDeviceLocation } from "@/features/matches/lib/useDeviceCoords";
import type { NearbyMatch } from "@/features/matches/types/match";
import { HARD_SHADOW, colors } from "@/theme/colors";
import { MAP_STYLE } from "@/theme/mapStyle";
import { usePullToRefresh, useRefreshOnFocus } from "@/hooks/useRefresh";
import { TAB_BAR_CLEARANCE } from "@/theme/layout";

// Where Explore searches when the device location is not available: São Paulo
// centre. Explore never prompts for location (S6 spec "Permissions"). The
// radius is the API's 50 km cap: one fetch, then every filter (distance
// included) runs on the device (DECISIONS #114); the cards start at NEARBY_KM
// (DECISIONS #176).
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
      className="h-11 px-4 rounded-pill flex-row items-center gap-2 bg-white border-2 border-surface-dark"
      style={
        on
          ? { backgroundColor: colors.surfaceDark, ...HARD_SHADOW }
          : HARD_SHADOW
      }
    >
      <SlidersHorizontal
        size={18}
        color={on ? colors.textOnDark : colors.surfaceDark}
      />
      <Text
        className="font-body-bold text-h2 text-text-primary"
        style={on ? { color: colors.textOnDark } : undefined}
      >
        Filtros
      </Text>
      {/* The badge's room is always there, so turning a filter on never
          resizes the button (owner's 4th review, item 4). */}
      <View
        className="h-5 min-w-[20px] px-1 rounded-pill bg-accent items-center justify-center"
        style={{ opacity: on ? 1 : 0 }}
        testID="explore-filters-badge"
      >
        <Text className="font-body-bold text-caption text-text-primary">
          {on ? active : 0}
        </Text>
      </View>
    </PressableScale>
  );
}

// The preview always frames NEARBY_KM around the user (owner, 22/10/2026).
const MINI_MAP_DELTA = (2 * NEARBY_KM) / 111;
const MINI_MAP_PINS = 20;
const MINI_MAP_HEIGHT = 144; // h-36

/**
 * Static mini map (Android lite mode: a bitmap, cheap inside a scroll list)
 * drawn like the full map (owner's 4th review, item 1), but only where there
 * is a game: arenas with the number of the filtered games there, and a drop
 * per filtered game away from an arena. Arenas without games are left to the
 * full map; at this scale they were a cloud of dots. Always framed NEARBY_KM
 * around the search centre. Taps go to the card around it, never into the map.
 */
function MiniMap({
  center,
  matches,
  venues,
}: {
  center: { lat: number; lon: number };
  matches: NearbyMatch[];
  venues: NearbyVenue[];
}) {
  const shown = new Set(matches.map((m) => m.id));
  const atVenues = matchIdsAtVenues(venues);
  const loose = matches.filter((m) => !atVenues.has(m.id)).slice(0, MINI_MAP_PINS);
  const arenas = venues
    .map((v) => ({ venue: v, games: v.matches.filter((m) => shown.has(m.id)).length }))
    .filter((a) => a.games > 0)
    .slice(0, MINI_MAP_PINS);
  // Grouped like the full map (DECISIONS #177). The card is the screen minus
  // its margins wide; the map shows the frame's height and more across.
  const width = useWindowDimensions().width - 32;
  const clusters = clusterPoints<{ venue?: NearbyVenue; games: number; match?: NearbyMatch }>(
    [
      ...arenas.map(({ venue, games }) => ({
        id: `v:${venue.placeId}`, lat: venue.lat, lon: venue.lon, games, item: { venue, games },
      })),
      ...loose.map((m) => ({ id: `m:${m.id}`, lat: m.lat, lon: m.lon, games: 1, item: { match: m, games: 1 } })),
    ],
    {
      latitudeDelta: MINI_MAP_DELTA,
      longitudeDelta: (MINI_MAP_DELTA * width) / MINI_MAP_HEIGHT / Math.cos((center.lat * Math.PI) / 180),
      width,
      height: MINI_MAP_HEIGHT,
    },
  );
  return (
    <View pointerEvents="none" className="h-36" testID="explore-mini-map">
      <MapView
        key={`${center.lat},${center.lon}`}
        liteMode
        customMapStyle={MAP_STYLE}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: center.lat,
          longitude: center.lon,
          latitudeDelta: MINI_MAP_DELTA,
          longitudeDelta: MINI_MAP_DELTA,
        }}
      >
        {clusters.map((c) => {
          const { venue, match, games } = c.points[0]!.item;
          const [anchor, image] =
            c.points.length > 1
              ? [CLUSTER_ANCHOR, clusterImage(c.games, c.points.length)]
              : venue
                ? [{ x: 0.5, y: 0.5 }, venuePinImage(venue, games)]
                : [MATCH_PIN_ANCHOR, matchPinImage(match ? match.capacity - match.confirmed : 0)];
          return (
            <Marker
              key={c.id}
              coordinate={{ latitude: c.lat, longitude: c.lon }}
              anchor={anchor}
              image={image}
              testID={`explore-mini-map-pin-${c.id}`}
            />
          );
        })}
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

  // Nothing is searched until the position is known: searching the default
  // centre first meant two searches and the cards changing under the user.
  const { coords, resolved } = useDeviceLocation();
  const geo = coords
    ? { ...DEFAULT_GEO, lat: coords.latitude, lon: coords.longitude }
    : DEFAULT_GEO;
  const { data, isPending, isError, refetch } = useNearbyMatches(geo, resolved);
  // The arenas around, for the preview map (optional: none while loading or on
  // error). Same query the full map opens with, so it opens from the cache.
  const venuesQuery = useNearbyVenues(
    { lat: geo.lat, lon: geo.lon, radiusKm: NEARBY_VENUES_KM },
    isMapAvailable() && resolved,
  );

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
        // pb-1 leaves room for the selected chips' hard shadow.
        contentContainerClassName="px-4 gap-2 pt-3 pb-1"
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
        {/* The native map mounts once the results are in: the tab opens without
            waiting for it, and the map is drawn once, with its pins. */}
        {!isMapAvailable() ? null : isPending ? (
          <SkeletonBlock className="h-36 rounded-none" />
        ) : (
          <MiniMap center={geo} matches={results} venues={venuesQuery.data?.venues ?? []} />
        )}
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
        // None this close, but some farther: offer the whole 50 km instead of
        // "Limpar filtros", which would bring back the same NEARBY_KM.
        widenKm={
          results.length === 0 &&
          filters.maxKm != null &&
          applyFilters(data ?? [], { ...filters, maxKm: null }).length > 0
            ? filters.maxKm
            : null
        }
        onWiden={() => patch({ maxKm: null })}
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
  widenKm,
  onWiden,
  onRetry,
  onClearFilters,
}: {
  isPending: boolean;
  isError: boolean;
  results: NearbyMatch[];
  view: ViewMode;
  sourceEmpty: boolean;
  /** The distance limit that hides every result, when a wider one would show some. */
  widenKm: number | null;
  onWiden: () => void;
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
    if (widenKm != null) {
      return (
        <StateMessage
          message={`Nenhuma partida até ${widenKm} km`}
          actionLabel="Ver até 50 km"
          onAction={onWiden}
        />
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
  const queryClient = useQueryClient();

  // Spots and new matches change while the tab stays mounted: re-read the
  // nearby matches when the tab is shown again, or on a pull.
  const refetch = () =>
    queryClient.refetchQueries({ queryKey: ["matches", "nearby"], type: "active" });
  useRefreshOnFocus(refetch);
  const pull = usePullToRefresh(refetch);

  return (
    <View className="flex-1 bg-bg-light">
      <View className="flex-1 bg-bg-light">
        <ScrollView
          contentContainerStyle={{
            paddingTop: headerHeight,
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
          }}
          refreshControl={
            <RefreshControl
              refreshing={pull.refreshing}
              onRefresh={pull.onRefresh}
              progressViewOffset={headerHeight}
            />
          }
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
