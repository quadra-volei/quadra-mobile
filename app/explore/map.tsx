import * as Location from 'expo-location';
import { router } from 'expo-router';
import { ArrowRight, ChevronLeft, Clock, LocateFixed, MapPin, Users } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { Slider } from '@/components/ui/Slider';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { CourtImage } from '@/components/ui/CourtImage';
import { Tag } from '@/components/ui/Tag';
import { MatchCard } from '@/components/domain/MatchCard';
import { MapListSheet } from '@/components/domain/MapListSheet';
import {
  CLUSTER_ANCHOR,
  VENUE_HALO,
  clusterImage,
  MATCH_PIN,
  venuePinImage,
} from '@/components/domain/MapPins';
import {
  boxToFetch,
  initialMapBox,
  useArenaDetail,
  useMapItems,
  type ArenaGame,
  type MapArena,
  type MapBox,
} from '@/features/explore/api/mapItems';
import { useVenueDetails, VENUE_KINDS, type VenueKind } from '@/features/explore/api/venues';
import { NO_CLUSTER_DELTA, clusterPoints, type MapPoint } from '@/features/explore/lib/cluster';
import { useNearbyMatches } from '@/features/matches/api/getNearby';
import { distanceKm } from '@/features/matches/lib/distanceKm';
import { readDeviceCoords } from '@/features/matches/lib/useDeviceCoords';
import { formatWhen } from '@/features/matches/lib/formatWhen';
import { splitVenue } from '@/features/matches/lib/venueName';
import { LEVEL_BADGE } from '@/features/matches/lib/levelBadge';
import { isMapAvailable } from '@/features/matches/lib/isMapAvailable';
import type { NearbyMatch } from '@/features/matches/types/match';
import { HARD_SHADOW, colors } from '@/theme/colors';
import { MAP_STYLE } from '@/theme/mapStyle';

// Fallback map center (São Paulo), for a device with no position fix.
const DEFAULT_CENTER = { latitude: -23.5605, longitude: -46.6433 };
const REGION_DELTA = { latitudeDelta: 0.05, longitudeDelta: 0.05 };
// The backend refuses a larger radius.
// ponytail: zoomed out past ~100 km across, the user is asked to zoom in; raise
// the backend cap (or cluster server-side) if country-wide browsing matters.
const MAX_RADIUS_KM = 50;
const KM_PER_DEGREE = 111;

type SearchArea = { lat: number; lon: number; radiusKm: number; tooWide: boolean };
/** What a pin on the map stands for. */
type PinItem = { type: 'venue'; venue: MapArena } | { type: 'match'; match: NearbyMatch };

/** The rectangle a map region shows. */
export function boxOf(region: Region): MapBox {
  return {
    south: region.latitude - region.latitudeDelta / 2,
    west: region.longitude - region.longitudeDelta / 2,
    north: region.latitude + region.latitudeDelta / 2,
    east: region.longitude + region.longitudeDelta / 2,
  };
}

/**
 * What the map is showing: its centre and the radius to its farthest edge,
 * capped at what the API accepts. Rounded (centre ~1 km, radius whole km).
 */
export function searchAreaFor(region: Region): SearchArea {
  const halfHeightKm = (region.latitudeDelta / 2) * KM_PER_DEGREE;
  const halfWidthKm =
    (region.longitudeDelta / 2) *
    KM_PER_DEGREE *
    Math.cos((region.latitude * Math.PI) / 180);
  const needed = Math.max(1, Math.ceil(Math.max(halfHeightKm, halfWidthKm)));
  return {
    lat: Math.round(region.latitude * 100) / 100,
    lon: Math.round(region.longitude * 100) / 100,
    radiusKm: Math.min(needed, MAX_RADIUS_KM),
    tooWide: needed > MAX_RADIUS_KM,
  };
}

type PermissionState = 'undetermined' | 'granted' | 'denied';

// The map's own filters (owner's 4th review, items 7 and 8): a distance from the
// user and the kinds of place. MAX_KM is "any distance".
const MAX_KM = 50;
// Arenas without a game show only this close in (view radius), or when a kind
// of place is picked: further out they hid the few pins with games (#176).
const EMPTY_ARENAS_KM = 6;
// Just closer than the grouping goes (NO_CLUSTER_DELTA): where a group of places on one spot
// opens to, and the zoom an arena picked in the list or the "next arena" card is shown at.
const CLOSE_SPAN = NO_CLUSTER_DELTA * 0.75;

/**
 * The closest other arena with games, from `from`: where the arena sheet's
 * last card takes the user next. Null when no other arena has a game.
 */
export function nextVenueWithGames(from: MapArena, venues: MapArena[]): MapArena | null {
  const here = { latitude: from.lat, longitude: from.lon };
  return (
    venues
      .filter((v) => v.id !== from.id && v.gamesCount > 0)
      .map((v) => ({ v, km: distanceKm(here, { latitude: v.lat, longitude: v.lon }) }))
      .sort((a, b) => a.km - b.km)[0]?.v ?? null
  );
}

/** "1,2 km" — comma decimal. */
function formatKm(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/** "3 jogos esta semana": the arena's games in the map's 7-day window (API DECISIONS #93). */
function gamesThisWeek(count: number): string {
  return count === 1 ? '1 jogo esta semana' : `${count} jogos esta semana`;
}

type VenueSheetItem = { kind: 'game'; game: ArenaGame } | { kind: 'next'; venue: MapArena };

/**
 * The tapped arena: its name (from Google, on tap) and address, then its upcoming
 * games as cards to swipe through — time, name and open slots — and, after the
 * last one, a card that moves on to the closest other arena with games, saying
 * it is another place and how far. No screen of its own in v1 (D9).
 */
function VenueSheet({
  venue,
  games,
  title,
  address,
  next,
  onOpenMatch,
  onNextVenue,
}: {
  venue: MapArena;
  /** All its upcoming games once loaded (`useArenaDetail`), else the first ones the map has. */
  games: ArenaGame[];
  /** Undefined while the name loads from Google: a skeleton holds its place. */
  title?: string;
  address?: string;
  next: MapArena | null;
  onOpenMatch: (id: string) => void;
  onNextVenue: (venue: MapArena) => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 64, 320);
  const items: VenueSheetItem[] = [
    ...games.map((game) => ({ kind: 'game' as const, game })),
    ...(next ? [{ kind: 'next' as const, venue: next }] : []),
  ];
  const nextKm = next
    ? distanceKm({ latitude: venue.lat, longitude: venue.lon }, { latitude: next.lat, longitude: next.lon })
    : 0;
  const kind = VENUE_KINDS.find((k) => k.kind === venue.kind);
  // Swiping past the last game lands on "Outra arena" and goes there.
  const onSwipeEnd = (x: number) => {
    const item = items[Math.round(x / (cardWidth + 12))];
    if (item?.kind === 'next') onNextVenue(item.venue);
  };

  return (
    <View className="bg-white rounded-card border-2 border-surface-dark pt-4 pb-4" style={HARD_SHADOW} testID="map-venue-card">
      <View className="px-4 flex-row items-start gap-3">
        <View className="flex-1">
          {kind ? (
            <View className="flex-row items-center gap-1">
              <kind.Icon size={14} color={colors.textMuted} />
              <Text className="font-mono text-mono text-text-muted uppercase" testID="map-venue-kind">
                {kind.label}
              </Text>
            </View>
          ) : null}
          {title === undefined ? (
            <View className="gap-1 py-1" testID="map-venue-title-loading">
              <SkeletonBlock className="h-5 w-44" />
              <SkeletonBlock className="h-3 w-56" />
            </View>
          ) : (
            <Text numberOfLines={1} className="font-body-bold text-h3 text-text-primary" testID="map-venue-title">
              {title}
            </Text>
          )}
          {address ? (
            <Text numberOfLines={1} className="mt-0.5 font-body text-caption text-text-muted">
              {address}
            </Text>
          ) : null}
        </View>
        {venue.gamesCount > 0 ? (
          <View className="rounded-pill bg-success px-3 py-1">
            <Text className="font-body-bold text-caption text-text-on-dark">{gamesThisWeek(venue.gamesCount)}</Text>
          </View>
        ) : null}
      </View>

      {games.length === 0 ? (
        <Text className="mt-3 px-4 font-body text-body text-text-muted">Nenhum jogo marcado aqui nos próximos dias.</Text>
      ) : (
        <FlatList<VenueSheetItem>
          horizontal
          data={items}
          keyExtractor={(item) => (item.kind === 'game' ? item.game.id : `next-${item.venue.id}`)}
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + 12}
          decelerationRate="fast"
          onMomentumScrollEnd={(e) => onSwipeEnd(e.nativeEvent.contentOffset.x)}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12, marginTop: 12 }}
          renderItem={({ item }) => {
            if (item.kind === 'next') {
              return (
                <Pressable
                  onPress={() => onNextVenue(item.venue)}
                  accessibilityRole="button"
                  accessibilityLabel={`Próxima arena com jogos, a ${formatKm(nextKm)} daqui`}
                  testID="map-venue-next"
                  className="rounded-card border-2 border-dashed border-primary bg-bg-light p-4 justify-between"
                  style={{ width: cardWidth, minHeight: 168 }}
                >
                  <View>
                    <MapPin size={20} color={colors.primary} />
                    <Text className="mt-2 font-body-bold text-body text-text-primary">Outra arena com jogos</Text>
                    <Text className="font-body text-caption text-text-muted">
                      {`a ${formatKm(nextKm)} daqui · ${gamesThisWeek(item.venue.gamesCount)}`}
                    </Text>
                  </View>
                  <View className="mt-3 flex-row items-center gap-2">
                    <Text className="font-body-bold text-body text-primary">Ir para lá</Text>
                    <ArrowRight size={18} color={colors.primary} />
                  </View>
                </Pressable>
              );
            }
            const { game } = item;
            const openSlots = Math.max(0, game.capacity - game.confirmed);
            return (
              <Pressable
                onPress={() => onOpenMatch(game.id)}
                accessibilityRole="button"
                accessibilityLabel={`${game.name}, ${game.live ? 'ao vivo' : formatWhen(game.startsAt)}`}
                testID={`map-venue-match-${game.id}`}
                className="overflow-hidden rounded-card border-2 border-surface-dark bg-white"
                style={{ width: cardWidth }}
              >
                <CourtImage tint={colors.primary} height={88} radius={0}>
                  <View className="absolute top-2 left-2 rounded-pill bg-white px-2 py-0.5">
                    <Text className={`font-body-bold text-caption ${game.live ? 'text-danger' : 'text-surface-dark'}`}>
                      {game.live ? 'AO VIVO' : formatWhen(game.startsAt)}
                    </Text>
                  </View>
                </CourtImage>
                <View className="px-3 py-2">
                  <Text numberOfLines={1} className="font-body-bold text-body text-text-primary">
                    {game.name}
                  </Text>
                  <Text className="font-body-semibold text-caption text-text-muted">
                    {game.full ? 'Lotada · lista de espera' : openSlots === 1 ? '1 vaga' : `${openSlots} vagas`}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

/** Normalizes an expo-location permission status into the screen's state union. */
function toPermissionState(status: Location.PermissionStatus): PermissionState {
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  if (status === Location.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

/** The map's shape while it loads: the map area and the top bar's places. */
function MapSkeleton() {
  return (
    <View className="flex-1 bg-bg-light" testID="map-skeleton">
      <SkeletonBlock className="absolute inset-0 rounded-none" />
      <SafeAreaView edges={['top']} className="flex-row items-center gap-3 px-4 pt-2">
        <View className="h-12 w-12 rounded-full bg-white" />
        <View className="h-9 w-40 rounded-pill bg-white" />
        <View className="flex-1" />
        <View className="h-12 w-12 rounded-full bg-white" />
      </SafeAreaView>
    </View>
  );
}

/** Full-screen centered container for the permission / error states. */
function StateContainer({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      className="flex-1 items-center justify-center bg-bg-light px-6"
    >
      {children}
    </SafeAreaView>
  );
}

export default function MapScreen() {
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<
    { latitude: number; longitude: number } | null
  >(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);
  const [maxKm, setMaxKm] = useState(MAX_KM);
  const [kinds, setKinds] = useState<VenueKind[]>([]);
  const [distanceOpen, setDistanceOpen] = useState(false);
  // The map fills the screen: its size and region say how close pins sit on screen.
  const screen = useWindowDimensions();
  const [region, setRegion] = useState<Region | null>(null);

  // What the map shows, once it has moved, and the areas loaded for it: the
  // search follows the screen (a match in another city shows up when the map
  // is taken there) but only leaves an area the map no longer fits in.
  const [view, setView] = useState<SearchArea | null>(null);
  const [box, setBox] = useState<MapBox | null>(null);

  // Until the map moves, the same rectangle as Explore's preview (its cache answers it).
  const center = userLocation ?? DEFAULT_CENTER;
  const loadedBox = box ?? initialMapBox(center);
  const located = !checkingPermission && !resolvingLocation;
  // One request per rectangle: arenas with their games and the games with no arena (#179).
  const items = useMapItems(
    { ...loadedBox, kinds, lat: center.latitude, lon: center.longitude },
    located && isMapAvailable(),
  );
  // Without a map (no Maps key), the screen lists the nearby games instead.
  const nearby = useNearbyMatches(
    { lat: center.latitude, lon: center.longitude, radiusKm: MAX_RADIUS_KM },
    located && !isMapAvailable(),
  );
  const allVenues: MapArena[] = items.data?.arenas ?? [];
  const selectedVenue = allVenues.find((v) => v.id === selectedVenueId) ?? null;
  const venueDetails = useVenueDetails(selectedVenue?.placeId ?? null);
  const arenaGames = useArenaDetail(selectedVenueId);

  async function resolveLocation() {
    setResolvingLocation(true);
    try {
      // A recent fix answers at once; only without one is the GPS waited for.
      setUserLocation(await readDeviceCoords());
    } catch {
      // No fix: the map opens on the default centre.
    } finally {
      setResolvingLocation(false);
    }
  }

  // Check the already-granted state on mount without prompting: only render the
  // rationale when the permission is genuinely undetermined.
  useEffect(() => {
    let active = true;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (!active) return;
      const next = toPermissionState(status);
      setPermission(next);
      if (next === 'granted') await resolveLocation();
      if (active) setCheckingPermission(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleRequestPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const next = toPermissionState(status);
    setPermission(next);
    if (next === 'granted') await resolveLocation();
  }

  // --- Permission gates -------------------------------------------------------

  // The map's own skeleton from the first frame, also while the permission is checked.
  if (checkingPermission) {
    return <MapSkeleton />;
  }

  if (permission === 'undetermined') {
    return (
      <StateContainer>
        <Text className="font-display text-h1 text-text-primary uppercase text-center">
          Veja partidas perto de você
        </Text>
        <Text className="font-body text-body text-text-muted text-center mt-3 mb-6">
          Precisamos da sua localização para mostrar as partidas próximas no
          mapa.
        </Text>
        <View className="w-full">
          <Button variant="primary" onPress={handleRequestPermission}>
            Permitir localização
          </Button>
        </View>
      </StateContainer>
    );
  }

  if (permission === 'denied') {
    return (
      <StateContainer>
        <Text className="font-display text-h1 text-text-primary uppercase text-center">
          Precisamos da sua localização
        </Text>
        <Text className="font-body text-body text-text-muted text-center mt-3 mb-6">
          Ative a localização nas configurações para ver as partidas perto de
          você no mapa.
        </Text>
        <View className="w-full">
          <Button variant="ghost" onPress={() => Linking.openSettings()}>
            Abrir configurações
          </Button>
        </View>
      </StateContainer>
    );
  }

  // --- Granted: loading / error / map ----------------------------------------

  // The map shows as soon as the position is known; the pins come in as they load.
  if (resolvingLocation) {
    return <MapSkeleton />;
  }

  const query = isMapAvailable() ? items : nearby;
  if (query.isError && !query.data) {
    return (
      <StateContainer>
        <Text className="font-body-semibold text-body-bold text-text-primary text-center mb-6">
          Não foi possível carregar as partidas por perto.
        </Text>
        <View className="w-full">
          <Button variant="ghost" onPress={() => query.refetch()}>
            Tentar novamente
          </Button>
        </View>
      </StateContainer>
    );
  }

  // Games with no arena (the API puts each game under its arena or here, never both).
  const matches: NearbyMatch[] = (isMapAvailable() ? items.data?.games : nearby.data) ?? [];
  // The map's filters: within maxKm of the user, of the picked kinds. A game away
  // from any arena is not a kind of place, so picking kinds hides it.
  const within = (lat: number, lon: number) =>
    maxKm >= MAX_KM || distanceKm(center, { latitude: lat, longitude: lon }) <= maxKm;
  const shownVenues = allVenues.filter((v) => within(v.lat, v.lon) && (kinds.length === 0 || kinds.includes(v.kind)));
  // Arenas with games always; the others only close in or when a kind is picked.
  const closeIn = (view?.radiusKm ?? 0) <= EMPTY_ARENAS_KM || kinds.length > 0;
  const withGames = shownVenues.filter((v) => v.gamesCount > 0);
  const empty = closeIn ? shownVenues.filter((v) => v.gamesCount === 0) : [];
  const venues = [...withGames, ...empty];
  const looseMatches = kinds.length > 0 ? [] : matches.filter((m) => within(m.lat, m.lon));
  const shownGames = venues.reduce((n, v) => n + v.gamesCount, 0) + looseMatches.length;
  const morePlaces = items.data?.truncated ?? false;
  const countLabel = shownGames === 1 ? '1 partida por perto' : `${shownGames} partidas por perto`;
  // Pins that would overlap become one group (DECISIONS #177).
  const clusters = clusterPoints<PinItem>(
    [
      ...venues.map((venue) => ({
        id: `v:${venue.id}`,
        lat: venue.lat,
        lon: venue.lon,
        games: venue.gamesCount,
        item: { type: 'venue' as const, venue },
      })),
      ...looseMatches.map((match) => ({
        id: `m:${match.id}`,
        lat: match.lat,
        lon: match.lon,
        games: 1,
        item: { type: 'match' as const, match },
      })),
    ],
    { ...(region ?? REGION_DELTA), width: screen.width, height: screen.height },
  );
  // A tap on a group zooms the map onto its places, which then show apart. Places (nearly) on
  // the same spot only get as close as the grouping stops: fitting them went to building level.
  const openCluster = (points: MapPoint<PinItem>[]) => {
    const lats = points.map((p) => p.lat);
    const lons = points.map((p) => p.lon);
    const [south, north, west, east] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
    if (Math.max(north - south, east - west) < CLOSE_SPAN) {
      mapRef.current?.animateToRegion({
        latitude: (south + north) / 2,
        longitude: (west + east) / 2,
        latitudeDelta: CLOSE_SPAN,
        longitudeDelta: CLOSE_SPAN,
      });
      return;
    }
    mapRef.current?.fitToCoordinates(
      points.map((p) => ({ latitude: p.lat, longitude: p.lon })),
      { edgePadding: { top: 200, right: 64, bottom: 240, left: 64 }, animated: true },
    );
  };
  const filtersOn = maxKm < MAX_KM || kinds.length > 0;
  const selected = matches.find((m) => m.id === selectedMatchId) ?? null;
  // The ring only around a pin of its own, not around a group it fell into.
  const haloVenue = clusters.some((c) => c.points.length === 1 && c.id === `v:${selectedVenueId}`)
    ? selectedVenue
    : null;
  const toggleKind = (kind: VenueKind) =>
    setKinds((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]));

  // Centred at a street zoom: moving only the centre kept whatever zoom the map had.
  const showArena = (arena: MapArena) =>
    mapRef.current?.animateToRegion(
      { latitude: arena.lat, longitude: arena.lon, latitudeDelta: CLOSE_SPAN, longitudeDelta: CLOSE_SPAN },
      450,
    );

  function goMatch(id: string) {
    router.push({ pathname: '/matches/[id]', params: { id } });
  }

  const backButton = (className: string) => (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      testID="map-back"
      className={`rounded-full items-center justify-center ${className}`}
    >
      <ChevronLeft size={24} color={colors.surfaceDark} />
    </Pressable>
  );

  if (!isMapAvailable()) {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg-light">
        {backButton('m-4 h-10 w-10 border-2 border-surface-dark bg-white')}
        <ScrollView>
          <View className="px-4 pb-6 gap-4">
            <Text className="font-body text-body text-text-muted">
              {matches.length === 0
                ? 'O mapa não está disponível nesta versão do app. Nenhuma partida perto de você ainda.'
                : 'O mapa não está disponível nesta versão do app. Estas são as partidas perto de você.'}
            </Text>
            {matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onPress={goMatch}
                testID={`map-list-${match.id}`}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-bg-light">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={MAP_STYLE}
        // initialRegion, not region: a controlled region snaps the map back to
        // the centre on every re-render (e.g. when a pin is selected).
        initialRegion={{ ...center, ...REGION_DELTA }}
        onRegionChangeComplete={(shown) => {
          setRegion(shown);
          setView(searchAreaFor(shown));
          // A new request only once the view leaves the loaded rectangle (or zooms well
          // into one that hit the API's limits).
          setBox(boxToFetch(loadedBox, boxOf(shown), items.data?.truncated ?? false));
        }}
        // The native toolbar (Android) would sit over the summary card.
        toolbarEnabled={false}
        // A pin tap also reaches the map's onPress on some platforms; only a tap
        // on the map itself closes the card.
        onPress={(e) => {
          if (e.nativeEvent.action !== 'marker-press') {
            setSelectedMatchId(null);
            setSelectedVenueId(null);
          }
        }}
      >
        {/* Pins are images (DECISIONS #176): a new look is a new image on the same marker. */}
        {clusters.map((cluster) => {
          if (cluster.points.length > 1) {
            return (
              <Marker
                key={cluster.id}
                coordinate={{ latitude: cluster.lat, longitude: cluster.lon }}
                onPress={() => openCluster(cluster.points)}
                testID={`map-cluster-${cluster.id}`}
                anchor={CLUSTER_ANCHOR}
                image={clusterImage(cluster.games, cluster.points.length)}
              />
            );
          }
          const { item } = cluster.points[0]!;
          if (item.type === 'venue') {
            const { venue } = item;
            return (
              <Marker
                key={cluster.id}
                coordinate={{ latitude: venue.lat, longitude: venue.lon }}
                onPress={() => {
                  setSelectedMatchId(null);
                  setSelectedVenueId(venue.id);
                }}
                testID={`map-venue-${venue.id}`}
                anchor={{ x: 0.5, y: 0.5 }}
                image={venuePinImage(venue)}
                zIndex={venue.id === selectedVenueId ? 2 : 0}
              />
            );
          }
          const { match } = item;
          return (
            <Marker
              key={cluster.id}
              coordinate={{ latitude: match.lat, longitude: match.lon }}
              onPress={() => {
                setSelectedVenueId(null);
                setSelectedMatchId(match.id);
              }}
              testID={`map-pin-${match.id}`}
              // Over an arena on the same spot (a game not linked to it), or the arena takes the tap.
              zIndex={1}
              anchor={CLUSTER_ANCHOR}
              image={MATCH_PIN}
            />
          );
        })}
        {/* The selected arena's lime ring, under its pin and over the others. */}
        {haloVenue ? (
          <Marker
            key="selected-halo"
            coordinate={{ latitude: haloVenue.lat, longitude: haloVenue.lon }}
            anchor={{ x: 0.5, y: 0.5 }}
            image={VENUE_HALO}
            zIndex={1}
            testID="map-venue-halo"
          />
        ) : null}
      </MapView>

      {/* Floating top bar: back + title/count pill, and the recenter button.
          Laid out in flow inside the safe area so nothing sits under the status bar. */}
      <SafeAreaView
        edges={['top']}
        pointerEvents="box-none"
        className="absolute top-0 left-0 right-0"
      >
        {/* Opening the map shows only the way back, a count and the recenter;
            details come with a tap on a pin. */}
        <View pointerEvents="box-none" className="flex-row items-center gap-3 px-4 pt-2">
          {backButton('h-12 w-12 border-2 border-surface-dark bg-white')}
          <View className="flex-1 items-start" pointerEvents="none">
            <View className="rounded-pill bg-white px-4 py-2 shadow-card" testID="map-count-pill">
              <Text
                numberOfLines={1}
                className="font-body-bold text-caption text-text-primary"
                accessibilityLabel={items.isFetching ? 'Carregando esta área' : countLabel}
              >
                {/* While a new area loads, three dots like the references (#180). */}
                {items.isFetching ? '•••' : countLabel}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() =>
              mapRef.current?.animateToRegion({ ...center, ...REGION_DELTA })
            }
            accessibilityRole="button"
            accessibilityLabel="Centralizar na minha localização"
            testID="map-recenter"
            className="h-12 w-12 rounded-full border-2 border-surface-dark bg-white items-center justify-center"
            style={HARD_SHADOW}
          >
            <LocateFixed size={22} color={colors.surfaceDark} />
          </Pressable>
        </View>

        {/* The map's filters: distance (slider) and kind of place, with a way to clear them. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-4 gap-2 pt-3 pb-1"
          testID="map-filters"
        >
          <FilterChip
            label={maxKm >= MAX_KM ? 'Distância' : `Até ${maxKm} km`}
            selected={distanceOpen || maxKm < MAX_KM}
            onPress={() => setDistanceOpen((open) => !open)}
            testID="map-filter-distance"
          />
          {VENUE_KINDS.map(({ kind, label, Icon }) => (
            <FilterChip
              key={kind}
              label={label}
              icon={Icon}
              selected={kinds.includes(kind)}
              onPress={() => toggleKind(kind)}
              testID={`map-filter-${kind}`}
            />
          ))}
          {filtersOn ? (
            <FilterChip
              label="Limpar"
              selected={false}
              onPress={() => {
                setMaxKm(MAX_KM);
                setKinds([]);
                setDistanceOpen(false);
              }}
              testID="map-filter-clear"
            />
          ) : null}
        </ScrollView>
        {distanceOpen ? (
          <View className="mx-4 mt-2 rounded-card border-2 border-surface-dark bg-white px-4 py-3" style={HARD_SHADOW} testID="map-distance-panel">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-body-bold text-caption text-text-primary">Distância de você</Text>
              <Text className="font-num text-body text-primary" testID="map-distance-value">
                {maxKm >= MAX_KM ? 'Qualquer' : `${maxKm} km`}
              </Text>
            </View>
            <Slider
              value={maxKm}
              min={1}
              max={MAX_KM}
              onChange={setMaxKm}
              accessibilityLabel="Distância máxima"
              valueText={(km) => (km >= MAX_KM ? 'qualquer distância' : `até ${km} quilômetros`)}
              testID="map-distance-slider"
            />
          </View>
        ) : null}

        {/* More places than drawn: say so; moving or zooming the map brings the others. */}
        {morePlaces && !view?.tooWide ? (
          <View pointerEvents="none" className="items-center px-4 pt-3">
            <View className="bg-white rounded-pill px-4 py-2 shadow-card" testID="map-more-places">
              <Text className="font-body text-caption text-text-primary text-center">
                Há mais locais nesta área. Aproxime ou mova o mapa para ver.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Empty notice — granted but no matches in radius */}
        {((shownGames === 0 && !items.isPending) || view?.tooWide) && (
          <View pointerEvents="none" className="items-center px-4 pt-3">
            <View className="bg-white rounded-pill px-6 py-3 shadow-card">
              <Text className="font-body text-body text-text-primary text-center">
                {view?.tooWide
                  ? 'Aproxime o mapa para ver as partidas desta área'
                  : filtersOn
                    ? 'Nenhuma partida com esses filtros'
                    : view
                      ? 'Nenhuma partida nesta área'
                      : 'Nenhuma partida perto de você ainda'}
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>

      {/* The list of the area in a panel dragged up from the bottom (#180), while no pin is open. */}
      {!selectedVenue && !selected && !view?.tooWide ? (
        <MapListSheet
          arenas={venues}
          games={looseMatches}
          // The server's counts cover the whole area; with a distance or kind filter, what is shown.
          arenaCount={filtersOn ? venues.length : (items.data?.arenaCount ?? venues.length)}
          gameCount={filtersOn ? shownGames : (items.data?.gameCount ?? shownGames)}
          onOpenArena={(arena) => {
            setSelectedVenueId(arena.id);
            showArena(arena);
          }}
          onOpenMatch={goMatch}
        />
      ) : null}

      {/* Arena sheet — name from Google on tap, and its upcoming games to swipe */}
      {selectedVenue && (
        <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0">
          <View className="px-4 pb-4">
            <VenueSheet
              key={selectedVenue.id}
              venue={selectedVenue}
              games={arenaGames.data ?? selectedVenue.games}
              title={
                selectedVenue.placeId && venueDetails.isPending ? undefined : (venueDetails.data?.title ?? 'Arena')
              }
              address={venueDetails.data?.address}
              next={nextVenueWithGames(selectedVenue, shownVenues)}
              onOpenMatch={goMatch}
              onNextVenue={(next) => {
                setSelectedVenueId(next.id);
                showArena(next);
              }}
            />
          </View>
        </SafeAreaView>
      )}

      {/* Bottom preview card — only when a pin is selected */}
      {selected && (
        <SafeAreaView
          edges={['bottom']}
          className="absolute bottom-0 left-0 right-0"
        >
          <View className="px-4 pb-4">
            <View
              className="bg-white rounded-card shadow-card overflow-hidden"
              testID="map-preview-card"
            >
              {/* Cover: the organizer's photo, or the court tinted by level. */}
              <CourtImage
                tint={selected.tint}
                imageUri={selected.coverUrl}
                height={124}
                radius={0}
              >
                <View className="absolute top-3 left-3 flex-row items-center gap-2">
                  <Tag bg="rgba(255,255,255,0.92)" color={colors.surfaceDark}>
                    {selected.format}
                  </Tag>
                  <Tag
                    bg={LEVEL_BADGE[selected.level].bg}
                    color={LEVEL_BADGE[selected.level].color}
                    outlined
                  >
                    {LEVEL_BADGE[selected.level].label}
                  </Tag>
                </View>
                <View className="absolute top-3 right-3 rounded-pill bg-accent px-3 py-1">
                  <Text className="font-body-bold text-caption text-text-primary">
                    {selected.priceLabel}
                  </Text>
                </View>
              </CourtImage>

              <View className="p-4">
                <Text
                  numberOfLines={1}
                  className="font-body-bold text-h3 text-text-primary"
                >
                  {selected.name}
                </Text>
                {selected.venue ? (
                  <Text
                    numberOfLines={1}
                    className="mt-0.5 font-body text-caption text-text-muted"
                  >
                    {splitVenue(selected.venue).name}
                  </Text>
                ) : null}

                <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-1">
                  {selected.startsAt ? (
                    <View className="flex-row items-center gap-1">
                      <Clock size={14} color={colors.primary} />
                      <Text className="font-body-semibold text-caption text-text-primary">
                        {formatWhen(selected.startsAt)}
                      </Text>
                    </View>
                  ) : null}
                  <View className="flex-row items-center gap-1">
                    <MapPin size={14} color={colors.primary} />
                    <Text className="font-body-semibold text-caption text-text-primary">
                      {/* From the user, not from the map centre the search used. */}
                      {(userLocation
                        ? distanceKm(userLocation, {
                            latitude: selected.lat,
                            longitude: selected.lon,
                          })
                        : selected.distanceKm
                      )
                        .toFixed(1)
                        .replace('.', ',')}{' '}
                      km
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Users size={14} color={colors.primary} />
                    <Text className="font-body-semibold text-caption text-text-primary">
                      {selected.confirmed}/{selected.capacity} confirmados
                    </Text>
                  </View>
                </View>

                <View className="mt-4">
                  <Button
                    variant="primary"
                    onPress={() => goMatch(selected.id)}
                    testID="map-preview-open"
                  >
                    Ver partida
                  </Button>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}
