import * as Location from 'expo-location';
import { router } from 'expo-router';
import { ChevronLeft, LocateFixed, Volleyball } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { MatchCard } from '@/components/domain/MatchCard';
import { useNearbyMatches } from '@/features/matches/api/getNearby';
import type { NearbyMatch } from '@/features/matches/types/match';
import { colors } from '@/theme/colors';

// Fallback map center (São Paulo) used only to seed the nearby query before the
// device location resolves.
const DEFAULT_CENTER = { latitude: -23.5605, longitude: -46.6433 };
const REGION_DELTA = { latitudeDelta: 0.05, longitudeDelta: 0.05 };
const NEARBY_RADIUS_KM = 5;

/**
 * Android draws the map with the Google Maps SDK, which throws natively (closing
 * the app) when the build has no key. A build without the key shows the nearby
 * matches as a list instead. iOS uses Apple Maps and needs no key.
 */
function isMapAvailable(): boolean {
  return (
    Platform.OS !== 'android' ||
    !!process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY
  );
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

  const nearby = useNearbyMatches({
    lat: (userLocation ?? DEFAULT_CENTER).latitude,
    lon: (userLocation ?? DEFAULT_CENTER).longitude,
    radiusKm: NEARBY_RADIUS_KM,
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
        <Text className="font-body text-body-bold text-text-primary text-center mb-6">
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
        {backButton('m-4 h-10 w-10 bg-white shadow-card')}
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
        region={{ ...center, ...REGION_DELTA }}
        onPress={() => setSelectedMatchId(null)}
      >
        {matches.map((match) => {
          const openSlots = match.capacity - match.confirmed;
          return (
            <Marker
              key={match.id}
              coordinate={{ latitude: match.lat, longitude: match.lon }}
              onPress={() => setSelectedMatchId(match.id)}
              testID={`map-pin-${match.id}`}
            >
              <View
                className={`rounded-full p-2 shadow-card ${pinToneFor(openSlots)}`}
              >
                <Volleyball size={16} color={colors.textOnDark} />
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
              <Text numberOfLines={1} className="font-body text-body-bold text-text-primary">
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
            className="h-14 w-14 rounded-full bg-white shadow-card items-center justify-center"
          >
            <LocateFixed size={22} color={colors.surfaceDark} />
          </Pressable>
        </View>

        {/* Empty notice — granted but no matches in radius */}
        {matches.length === 0 && (
          <View pointerEvents="none" className="items-center px-4 pt-3">
            <View className="bg-white rounded-pill px-6 py-3 shadow-card">
              <Text className="font-body text-body text-text-primary text-center">
                Nenhuma partida perto de você ainda
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
            <MatchCard
              match={selected}
              onPress={goMatch}
              testID="map-preview-card"
            />
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}
