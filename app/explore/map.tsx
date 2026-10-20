import * as Location from 'expo-location';
import { router } from 'expo-router';
import { ChevronLeft, Clock, LocateFixed, MapPin, Users, Volleyball } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { CourtImage } from '@/components/ui/CourtImage';
import { Tag } from '@/components/ui/Tag';
import { MatchCard } from '@/components/domain/MatchCard';
import { useNearbyMatches } from '@/features/matches/api/getNearby';
import { distanceKm } from '@/features/matches/lib/distanceKm';
import { formatWhen } from '@/features/matches/lib/formatWhen';
import { LEVEL_BADGE } from '@/features/matches/lib/levelBadge';
import { isMapAvailable } from '@/features/matches/lib/isMapAvailable';
import type { NearbyMatch } from '@/features/matches/types/match';
import { HARD_SHADOW, colors } from '@/theme/colors';

// Fallback map center (São Paulo) used only to seed the nearby query before the
// device location resolves.
const DEFAULT_CENTER = { latitude: -23.5605, longitude: -46.6433 };
const REGION_DELTA = { latitudeDelta: 0.05, longitudeDelta: 0.05 };
const NEARBY_RADIUS_KM = 5;
// The backend refuses a larger radius.
// ponytail: zoomed out past ~100 km across, the user is asked to zoom in; raise
// the backend cap (or cluster server-side) if country-wide browsing matters.
const MAX_RADIUS_KM = 50;
const KM_PER_DEGREE = 111;

type SearchArea = { lat: number; lon: number; radiusKm: number; tooWide: boolean };

/**
 * The search that covers what the map is showing: its centre and the radius to
 * its farthest edge. Rounded (centre ~1 km, radius whole km) so small pans
 * reuse the same query.
 */
export function searchAreaFor(region: Region): SearchArea {
  const halfHeightKm = (region.latitudeDelta / 2) * KM_PER_DEGREE;
  const halfWidthKm =
    (region.longitudeDelta / 2) *
    KM_PER_DEGREE *
    Math.cos((region.latitude * Math.PI) / 180);
  const needed = Math.ceil(Math.max(halfHeightKm, halfWidthKm));
  return {
    lat: Math.round(region.latitude * 100) / 100,
    lon: Math.round(region.longitude * 100) / 100,
    radiusKm: Math.min(Math.max(needed, NEARBY_RADIUS_KM), MAX_RADIUS_KM),
    tooWide: needed > MAX_RADIUS_KM,
  };
}

type PermissionState = 'undetermined' | 'granted' | 'denied';

/** NativeWind class for the marker wrapper, color-coded by slot availability. */
export type PinTone = 'bg-accent' | 'bg-warning' | 'bg-text-muted';

/**
 * Maps a match's open-slot count to its pin color token (the only encoding SCOPE
 * S17 allows). Exported as a pure helper so it can be unit-tested without the
 * native map. `openSlots = capacity - confirmed`.
 * - `>= 2` → lime (vagas abertas)
 * - `=== 1` → amber (última vaga)
 * - `<= 0` → grey (lotada)
 */
export function pinToneFor(openSlots: number): PinTone {
  if (openSlots <= 0) return 'bg-text-muted';
  if (openSlots === 1) return 'bg-warning';
  return 'bg-accent';
}

// The pin is a square with three round corners turned 45°, so the sharp corner
// points down. Head and shadow share the shape; the shadow is a navy copy
// shifted like HARD_SHADOW (a boxShadow would turn with the shape and is cut
// off when Android draws the marker as an image).
const PIN_SHAPE = 'absolute h-8 w-8 rotate-45 rounded-full rounded-br-none';
const PIN_HEAD = 32; // h-8
const PIN_SHADOW = 3;
// How far down the turned corner reaches: half the side plus half the diagonal.
const PIN_TIP_Y = PIN_HEAD / 2 + PIN_HEAD * Math.SQRT1_2;
const PIN_WIDTH = PIN_HEAD + PIN_SHADOW;
const PIN_HEIGHT = Math.ceil(PIN_TIP_Y) + PIN_SHADOW;
/** Puts the tip, not the middle of the view, on the coordinate. */
export const PIN_ANCHOR = {
  x: PIN_HEAD / 2 / PIN_WIDTH,
  y: PIN_TIP_Y / PIN_HEIGHT,
};
// Apple Maps ignores `anchor`: it shifts the view from its centre instead.
const PIN_CENTER_OFFSET = {
  x: PIN_WIDTH / 2 - PIN_HEAD / 2,
  y: PIN_HEIGHT / 2 - PIN_TIP_Y,
};

/** Normalizes an expo-location permission status into the screen's state union. */
function toPermissionState(status: Location.PermissionStatus): PermissionState {
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  if (status === Location.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

/** Full-screen centered container for the permission / loading / error states. */
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
  const mapRef = useRef<MapView>(null);

  // Set once the user moves the map: the search then follows what is on screen
  // (a match in another city shows up when the map is taken there).
  const [searchArea, setSearchArea] = useState<SearchArea | null>(null);

  const nearby = useNearbyMatches({
    lat: searchArea?.lat ?? (userLocation ?? DEFAULT_CENTER).latitude,
    lon: searchArea?.lon ?? (userLocation ?? DEFAULT_CENTER).longitude,
    radiusKm: searchArea?.radiusKm ?? NEARBY_RADIUS_KM,
  });

  async function resolveLocation() {
    setResolvingLocation(true);
    try {
      const position = await Location.getCurrentPositionAsync();
      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
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

  if (checkingPermission) {
    return (
      <StateContainer>
        <ActivityIndicator color={colors.primary} />
      </StateContainer>
    );
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

  if (resolvingLocation || nearby.isPending) {
    return (
      <StateContainer>
        <ActivityIndicator color={colors.primary} />
      </StateContainer>
    );
  }

  if (nearby.isError) {
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

  const matches: NearbyMatch[] = nearby.data;
  const selected = matches.find((m) => m.id === selectedMatchId) ?? null;
  const center = userLocation ?? DEFAULT_CENTER;

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
        // initialRegion, not region: a controlled region snaps the map back to
        // the centre on every re-render (e.g. when a pin is selected).
        initialRegion={{ ...center, ...REGION_DELTA }}
        onRegionChangeComplete={(region) => {
          const next = searchAreaFor(region);
          setSearchArea((prev) =>
            prev?.lat === next.lat &&
            prev.lon === next.lon &&
            prev.radiusKm === next.radiusKm &&
            prev.tooWide === next.tooWide
              ? prev
              : next,
          );
        }}
        // The native toolbar (Android) would sit over the summary card.
        toolbarEnabled={false}
        // A pin tap also reaches the map's onPress on some platforms; only a tap
        // on the map itself closes the card.
        onPress={(e) => {
          if (e.nativeEvent.action !== 'marker-press') setSelectedMatchId(null);
        }}
      >
        {matches.map((match) => {
          const openSlots = match.capacity - match.confirmed;
          return (
            <Marker
              key={match.id}
              coordinate={{ latitude: match.lat, longitude: match.lon }}
              onPress={() => setSelectedMatchId(match.id)}
              testID={`map-pin-${match.id}`}
              anchor={PIN_ANCHOR}
              centerOffset={PIN_CENTER_OFFSET}
            >
              <View style={{ width: PIN_WIDTH, height: PIN_HEIGHT }}>
                <View
                  className={`${PIN_SHAPE} left-[3px] top-[3px] bg-surface-dark`}
                />
                <View
                  className={`${PIN_SHAPE} items-center justify-center border-2 border-surface-dark ${pinToneFor(openSlots)}`}
                >
                  <View className="-rotate-45">
                    <Volleyball size={16} color={colors.surfaceDark} />
                  </View>
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Floating top bar: back + title/count pill, and the recenter button.
          Laid out in flow inside the safe area so nothing sits under the status bar. */}
      <SafeAreaView
        edges={['top']}
        pointerEvents="box-none"
        className="absolute top-0 left-0 right-0"
      >
        <View pointerEvents="box-none" className="flex-row items-center gap-3 px-4 pt-2">
          <View className="flex-1 flex-row items-center h-14 pl-1 pr-5 bg-white rounded-pill shadow-card">
            {backButton('h-12 w-12')}
            <View className="flex-1">
              <Text numberOfLines={1} className="font-body-semibold text-body-bold text-text-primary">
                Perto de você
              </Text>
              <Text numberOfLines={1} className="font-body text-caption text-text-muted">
                {matches.length === 1
                  ? '1 partida por perto'
                  : `${matches.length} partidas por perto`}
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
            className="h-14 w-14 rounded-full border-2 border-surface-dark bg-white items-center justify-center"
            style={HARD_SHADOW}
          >
            <LocateFixed size={22} color={colors.surfaceDark} />
          </Pressable>
        </View>

        {/* Empty notice — granted but no matches in radius */}
        {(matches.length === 0 || searchArea?.tooWide) && (
          <View pointerEvents="none" className="items-center px-4 pt-3">
            <View className="bg-white rounded-pill px-6 py-3 shadow-card">
              <Text className="font-body text-body text-text-primary text-center">
                {searchArea?.tooWide
                  ? 'Aproxime o mapa para ver as partidas desta área'
                  : searchArea
                    ? 'Nenhuma partida nesta área'
                    : 'Nenhuma partida perto de você ainda'}
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>

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
                    {selected.venue}
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
