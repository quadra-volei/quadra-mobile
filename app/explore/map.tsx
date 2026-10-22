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
import {
  CLUSTER_ANCHOR,
  MATCH_PIN_ANCHOR,
  MATCH_PIN_CENTER_OFFSET,
  VENUE_HALO,
  clusterImage,
  matchPinImage,
  venueActivityFor as activityOf,
  venuePinImage,
  type VenueActivity,
} from '@/components/domain/MapPins';
import {
  NEARBY_VENUES_KM,
  matchIdsAtVenues,
  useNearbyVenues,
  useVenueDetails,
  VENUE_KINDS,
  type NearbyVenue,
  type VenueKind,
} from '@/features/explore/api/venues';
import { clusterPoints, type MapPoint } from '@/features/explore/lib/cluster';
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
// Games are searched like Explore does (the whole 50 km at once), so the map
// opens from Explore's cache; arenas like Explore's preview (NEARBY_VENUES_KM).
const MATCHES_MIN_KM = 15;
const VENUES_MIN_KM = 5;
// The API looks up new arenas on Google only up to this radius (API DECISIONS #82).
const VENUES_DISCOVERY_KM = NEARBY_VENUES_KM;

type SearchArea = { lat: number; lon: number; radiusKm: number; tooWide: boolean };
type Area = { lat: number; lon: number; radiusKm: number };
/** What a pin on the map stands for. */
type PinItem = { type: 'venue'; venue: NearbyVenue } | { type: 'match'; match: NearbyMatch };

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

/**
 * The area to load for what the map shows (DECISIONS #176): the loaded one
 * while it still covers the view, so panning and zooming inside it cost no
 * request; else the view plus half its size around it, between `minKm` and
 * `maxKm`. `dense`: the loaded area hit the API's cap (closest results only),
 * so zooming well into it loads the view again.
 */
export function areaToFetch(
  loaded: Area,
  view: SearchArea,
  minKm: number,
  maxKm: number,
  dense = false,
): Area {
  const fromCentre = distanceKm(
    { latitude: loaded.lat, longitude: loaded.lon },
    { latitude: view.lat, longitude: view.lon },
  );
  const covered = fromCentre + view.radiusKm <= loaded.radiusKm;
  const zoomedIn = view.radiusKm * 2 < loaded.radiusKm;
  if (covered && !(dense && zoomedIn)) return loaded;
  return {
    lat: view.lat,
    lon: view.lon,
    radiusKm: Math.min(Math.max(Math.ceil(view.radiusKm * 1.5), minKm), maxKm),
  };
}

type PermissionState = 'undetermined' | 'granted' | 'denied';

/** Puts a game pin's tip, not the middle of its view, on the coordinate. */
export const PIN_ANCHOR = MATCH_PIN_ANCHOR;

export function venueActivityFor(venue: NearbyVenue): VenueActivity {
  return activityOf(venue.matches);
}

// The map's own filters (owner's 4th review, items 7 and 8): a distance from the
// user and the kinds of place. MAX_KM is "any distance".
const MAX_KM = 50;
// Arenas without a game show only this close in (view radius), or when a kind
// of place is picked: further out they hid the few pins with games (#176).
const EMPTY_ARENAS_KM = 6;

/**
 * The closest other arena with games, from `from`: where the arena sheet's
 * last card takes the user next. Null when no other arena has a game.
 */
export function nextVenueWithGames(from: NearbyVenue, venues: NearbyVenue[]): NearbyVenue | null {
  const here = { latitude: from.lat, longitude: from.lon };
  return (
    venues
      .filter((v) => v.placeId !== from.placeId && v.matches.length > 0)
      .map((v) => ({ v, km: distanceKm(here, { latitude: v.lat, longitude: v.lon }) }))
      .sort((a, b) => a.km - b.km)[0]?.v ?? null
  );
}

/** "1,2 km" — comma decimal. */
function formatKm(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

type VenueSheetItem = { kind: 'game'; id: string } | { kind: 'next'; venue: NearbyVenue };

/**
 * The tapped arena: its name (from Google, on tap) and address, then its games
 * today as cards to swipe through — cover, name, time and open slots — and,
 * after the last one, a card that moves on to the closest other arena with
 * games, saying it is another place and how far.
 */
function VenueSheet({
  venue,
  title,
  address,
  matchesById,
  next,
  onOpenMatch,
  onNextVenue,
}: {
  venue: NearbyVenue;
  /** Undefined while the name loads from Google: a skeleton holds its place. */
  title?: string;
  address?: string;
  matchesById: Map<string, NearbyMatch>;
  next: NearbyVenue | null;
  onOpenMatch: (id: string) => void;
  onNextVenue: (venue: NearbyVenue) => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 64, 320);
  const games = venue.matches;
  const items: VenueSheetItem[] = [
    ...games.map((m) => ({ kind: 'game' as const, id: m.id })),
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
            <Text className="font-mono text-mono text-text-muted uppercase" testID="map-venue-kind">
              {kind.emoji} {kind.label}
            </Text>
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
        {games.length > 0 ? (
          <View className="rounded-pill bg-success px-3 py-1">
            <Text className="font-body-bold text-caption text-text-on-dark">
              {games.length === 1 ? '1 jogo hoje' : `${games.length} jogos hoje`}
            </Text>
          </View>
        ) : null}
      </View>

      {games.length === 0 ? (
        <Text className="mt-3 px-4 font-body text-body text-text-muted">Nenhum jogo marcado aqui hoje.</Text>
      ) : (
        <FlatList<VenueSheetItem>
          horizontal
          data={items}
          keyExtractor={(item) => (item.kind === 'game' ? item.id : `next-${item.venue.placeId}`)}
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
                      {`a ${formatKm(nextKm)} daqui · ${
                        item.venue.matches.length === 1 ? '1 jogo hoje' : `${item.venue.matches.length} jogos hoje`
                      }`}
                    </Text>
                  </View>
                  <View className="mt-3 flex-row items-center gap-2">
                    <Text className="font-body-bold text-body text-primary">Ir para lá</Text>
                    <ArrowRight size={18} color={colors.primary} />
                  </View>
                </Pressable>
              );
            }
            const game = venue.matches.find((m) => m.id === item.id)!;
            const match = matchesById.get(item.id);
            const openSlots = match ? Math.max(0, match.capacity - match.confirmed) : null;
            return (
              <Pressable
                onPress={() => onOpenMatch(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${game.name}, ${game.live ? 'ao vivo' : formatWhen(game.startsAt)}`}
                testID={`map-venue-match-${item.id}`}
                className="overflow-hidden rounded-card border-2 border-surface-dark bg-white"
                style={{ width: cardWidth }}
              >
                <CourtImage tint={match?.tint ?? colors.primary} imageUri={match?.coverUrl} height={88} radius={0}>
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
                  {openSlots != null ? (
                    <Text className="font-body-semibold text-caption text-text-muted">
                      {openSlots === 0 ? 'Lotada' : openSlots === 1 ? '1 vaga' : `${openSlots} vagas`}
                      {match ? ` · ${match.priceLabel}` : ''}
                    </Text>
                  ) : null}
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
  const [matchArea, setMatchArea] = useState<Area | null>(null);
  const [venueArea, setVenueArea] = useState<Area | null>(null);

  // Until the map moves, the same queries as Explore (its cache answers them).
  const center = userLocation ?? DEFAULT_CENTER;
  const matchesArea = matchArea ?? { lat: center.latitude, lon: center.longitude, radiusKm: MAX_RADIUS_KM };
  const venuesArea = venueArea ?? { lat: center.latitude, lon: center.longitude, radiusKm: NEARBY_VENUES_KM };
  const located = !checkingPermission && !resolvingLocation;
  const nearby = useNearbyMatches(matchesArea, located);
  // Arenas are extra: until they load (or if they fail) the map shows only the games.
  const venuesQuery = useNearbyVenues(venuesArea, located && isMapAvailable());
  const venueDetails = useVenueDetails(selectedVenueId);

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

  if (nearby.isError && !nearby.data) {
    return (
      <StateContainer>
        <Text className="font-body-semibold text-body-bold text-text-primary text-center mb-6">
          Não foi possível carregar as partidas por perto.
        </Text>
        <View className="w-full">
          <Button variant="ghost" onPress={() => nearby.refetch()}>
            Tentar novamente
          </Button>
        </View>
      </StateContainer>
    );
  }

  const matches: NearbyMatch[] = nearby.data ?? [];
  // The map's filters: within maxKm of the user, of the picked kinds. A game away
  // from any arena is not a kind of place, so picking kinds hides it.
  const within = (lat: number, lon: number) =>
    maxKm >= MAX_KM || distanceKm(center, { latitude: lat, longitude: lon }) <= maxKm;
  const allVenues: NearbyVenue[] = venuesQuery.data?.venues ?? [];
  const shownVenues = allVenues.filter((v) => within(v.lat, v.lon) && (kinds.length === 0 || kinds.includes(v.kind)));
  // Arenas with games always; the others only close in or when a kind is picked.
  const closeIn = (view?.radiusKm ?? 0) <= EMPTY_ARENAS_KM || kinds.length > 0;
  const withGames = shownVenues.filter((v) => v.matches.length > 0);
  const empty = closeIn ? shownVenues.filter((v) => v.matches.length === 0) : [];
  const venues = [...withGames, ...empty];
  // A game at an arena is listed inside the arena's card instead of having its own pin.
  const atVenues = matchIdsAtVenues(allVenues);
  const looseMatches = kinds.length > 0 ? [] : matches.filter((m) => !atVenues.has(m.id) && within(m.lat, m.lon));
  const shownGames = venues.reduce((n, v) => n + v.matches.length, 0) + looseMatches.length;
  const morePlaces = closeIn && (venuesQuery.data?.hasMore ?? false);
  // Pins that would overlap become one group (DECISIONS #177).
  const clusters = clusterPoints<PinItem>(
    [
      ...venues.map((venue) => ({
        id: `v:${venue.placeId}`,
        lat: venue.lat,
        lon: venue.lon,
        games: venue.matches.length,
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
  // A tap on a group zooms the map onto its places, which then show apart.
  const openCluster = (points: MapPoint<PinItem>[]) =>
    mapRef.current?.fitToCoordinates(
      points.map((p) => ({ latitude: p.lat, longitude: p.lon })),
      { edgePadding: { top: 200, right: 64, bottom: 240, left: 64 }, animated: true },
    );
  const filtersOn = maxKm < MAX_KM || kinds.length > 0;
  const selected = matches.find((m) => m.id === selectedMatchId) ?? null;
  const selectedVenue = allVenues.find((v) => v.placeId === selectedVenueId) ?? null;
  // The ring only around a pin of its own, not around a group it fell into.
  const haloVenue = clusters.some((c) => c.points.length === 1 && c.id === `v:${selectedVenueId}`)
    ? selectedVenue
    : null;
  const toggleKind = (kind: VenueKind) =>
    setKinds((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]));

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
          const next = searchAreaFor(shown);
          setRegion(shown);
          setView(next);
          setMatchArea(areaToFetch(matchesArea, next, MATCHES_MIN_KM, MAX_RADIUS_KM));
          // Close in, arenas are loaded within the radius the API discovers new
          // ones for; zooming into a wider or capped load loads the view again.
          setVenueArea(
            areaToFetch(
              venuesArea,
              next,
              VENUES_MIN_KM,
              next.radiusKm <= VENUES_DISCOVERY_KM ? VENUES_DISCOVERY_KM : MAX_RADIUS_KM,
              (venuesQuery.data?.hasMore ?? false) || venuesArea.radiusKm > VENUES_DISCOVERY_KM,
            ),
          );
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
                  setSelectedVenueId(venue.placeId);
                }}
                testID={`map-venue-${venue.placeId}`}
                anchor={{ x: 0.5, y: 0.5 }}
                image={venuePinImage(venue, venue.matches.length)}
                zIndex={venue.placeId === selectedVenueId ? 2 : 0}
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
              anchor={MATCH_PIN_ANCHOR}
              centerOffset={MATCH_PIN_CENTER_OFFSET}
              image={matchPinImage(match.capacity - match.confirmed)}
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
            <View className="rounded-pill bg-white px-4 py-2 shadow-card">
              <Text numberOfLines={1} className="font-body-bold text-caption text-text-primary">
                {shownGames === 1 ? '1 partida por perto' : `${shownGames} partidas por perto`}
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
          {VENUE_KINDS.map(({ kind, label, emoji }) => (
            <FilterChip
              key={kind}
              label={`${emoji} ${label}`}
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
        {((shownGames === 0 && !nearby.isPending) || view?.tooWide) && (
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

      {/* Arena sheet — name from Google on tap, and today's games there to swipe */}
      {selectedVenue && (
        <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0">
          <View className="px-4 pb-4">
            <VenueSheet
              key={selectedVenue.placeId}
              venue={selectedVenue}
              title={venueDetails.isPending ? undefined : (venueDetails.data?.title ?? 'Arena')}
              address={venueDetails.data?.address}
              matchesById={new Map(matches.map((m) => [m.id, m]))}
              next={nextVenueWithGames(selectedVenue, shownVenues)}
              onOpenMatch={goMatch}
              onNextVenue={(next) => {
                setSelectedVenueId(next.placeId);
                mapRef.current?.animateCamera?.(
                  { center: { latitude: next.lat, longitude: next.lon } },
                  { duration: 450 },
                );
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
