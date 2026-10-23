import { ExternalLink, X } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Linking, Pressable, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VENUE_HALO, venuePinImage } from '@/components/domain/MapPins';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { dialog } from '@/components/ui/Dialog';
import { FilterChip } from '@/components/ui/FilterChip';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import {
  googleMapsUrl,
  useCandidates,
  useDecide,
  useDiscover,
  useUndoDecision,
  type Candidate,
  type CuratedArena,
  type Decision,
} from '@/features/curation/api/curation';
import { boxToFetch, initialMapBox, type MapBox } from '@/features/explore/api/mapItems';
import { VENUE_KINDS, useVenueDetails, type VenueKind } from '@/features/explore/api/venues';
import { distanceKm } from '@/features/matches/lib/distanceKm';
import { useDeviceLocation } from '@/features/matches/lib/useDeviceCoords';
import { ApiError } from '@/lib/api/client';
import { colors } from '@/theme/colors';
import { MAP_STYLE } from '@/theme/mapStyle';

/*
 * Arena curation for the team (DECISIONS #181, API DECISIONS #94): the Google places of the area
 * nobody decided on yet, as a list (games nearby first) or on the map. Each one is approved as an
 * arena (its pin can be dragged to the right spot), rejected, or linked to an approved arena it is
 * an entrance or duplicate of. The API lets only the team's accounts in.
 */

const DEFAULT_CENTER = { latitude: -23.5605, longitude: -46.6433 };
/** An approved arena this close to a candidate can be "the same arena". */
const SAME_ARENA_KM = 0.15;
const kindOf = (kind: VenueKind) => VENUE_KINDS.find((k) => k.kind === kind)!;
const meters = (km: number) => `${Math.round(km * 1000)} m`;

function boxOf(region: Region): MapBox {
  return {
    south: region.latitude - region.latitudeDelta / 2,
    west: region.longitude - region.longitudeDelta / 2,
    north: region.latitude + region.latitudeDelta / 2,
    east: region.longitude + region.longitudeDelta / 2,
  };
}

/** What went wrong with a decision, in words. */
function failure(error: Error): string {
  if (error instanceof ApiError && error.status === 409) return 'Esse lugar já foi decidido. Atualize a lista.';
  if (error instanceof ApiError && error.status === 404) return 'Esse lugar ou essa arena não está mais disponível.';
  if (error instanceof ApiError && error.status === 403) return 'Sua conta não faz parte da equipe.';
  return 'Não deu certo. Tente de novo.';
}

function CandidateRow({ candidate, onPress }: { candidate: Candidate; onPress: () => void }) {
  const kind = kindOf(candidate.kind);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${kind.label} a ${candidate.distanceKm.toFixed(1)} km`}
      testID={`curation-row-${candidate.placeId}`}
      className="rounded-card border-2 border-surface-dark bg-white px-4 py-3"
    >
      <Text className="font-mono text-mono text-text-muted uppercase">
        {kind.emoji} {kind.label} · {candidate.distanceKm.toFixed(1).replace('.', ',')} km
      </Text>
      <Text className="mt-1 font-body-bold text-body text-text-primary">
        {candidate.gamesNearby > 0
          ? candidate.gamesNearby === 1
            ? '1 jogo marcado perto'
            : `${candidate.gamesNearby} jogos marcados perto`
          : 'Nenhum jogo perto'}
      </Text>
      {candidate.neighbors.length > 0 ? (
        <Text className="mt-0.5 font-body text-caption text-warning">
          {candidate.neighbors.length === 1
            ? 'Outro lugar a menos de 100 m: provável duplicata'
            : `${candidate.neighbors.length} lugares a menos de 100 m: prováveis duplicatas`}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** The selected place: its name from Google (shown, never saved), the kind and the three decisions. */
function CandidateCard({
  candidate,
  arenas,
  pinMoved,
  busy,
  onDecide,
  onClose,
}: {
  candidate: Candidate;
  arenas: CuratedArena[];
  pinMoved: boolean;
  busy: boolean;
  onDecide: (decision: 'Approve' | 'Reject' | { arenaId: string }, kind: VenueKind) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<VenueKind>(candidate.kind);
  const details = useVenueDetails(candidate.placeId);
  const here = { latitude: candidate.lat, longitude: candidate.lon };
  const close = arenas
    .map((arena) => ({ arena, km: distanceKm(here, { latitude: arena.lat, longitude: arena.lon }) }))
    .filter((a) => a.km <= SAME_ARENA_KM)
    .sort((a, b) => a.km - b.km)
    .slice(0, 3);

  const askSameArena = () =>
    dialog.alert('É a mesma arena que…', 'Uma entrada ou duplicata de uma arena já aprovada.', [
      ...close.map(({ arena, km }) => ({
        text: `${kindOf(arena.kind).emoji} ${kindOf(arena.kind).label} a ${meters(km)}`,
        onPress: () => onDecide({ arenaId: arena.id }, kind),
      })),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);

  return (
    <View className="rounded-card border-2 border-surface-dark bg-white p-4 shadow-card" testID="curation-card">
      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          {details.isPending ? (
            <View className="gap-1 py-1">
              <SkeletonBlock className="h-5 w-44" />
              <SkeletonBlock className="h-3 w-56" />
            </View>
          ) : (
            <>
              <Text numberOfLines={1} className="font-body-bold text-h3 text-text-primary" testID="curation-title">
                {details.data?.title ?? 'Lugar sem nome'}
              </Text>
              {details.data?.address ? (
                <Text numberOfLines={1} className="font-body text-caption text-text-muted">
                  {details.data.address}
                </Text>
              ) : null}
            </>
          )}
        </View>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" testID="curation-close">
          <X size={22} color={colors.surfaceDark} />
        </Pressable>
      </View>

      <Pressable
        onPress={() => void Linking.openURL(googleMapsUrl(candidate))}
        accessibilityRole="link"
        className="mt-2 flex-row items-center gap-1"
        testID="curation-open-maps"
      >
        <ExternalLink size={16} color={colors.primary} />
        <Text className="font-body-bold text-caption text-primary">Abrir no Google Maps</Text>
      </Pressable>

      <View className="mt-3 flex-row gap-2">
        {VENUE_KINDS.map((k) => (
          <FilterChip
            key={k.kind}
            label={`${k.emoji} ${k.label}`}
            selected={kind === k.kind}
            onPress={() => setKind(k.kind)}
            testID={`curation-kind-${k.kind}`}
          />
        ))}
      </View>
      {pinMoved ? (
        <Text className="mt-2 font-body text-caption text-text-muted">Ponto ajustado no mapa.</Text>
      ) : null}

      <View className="mt-4 gap-2">
        <Button variant="primary" onPress={() => onDecide('Approve', kind)} loading={busy} testID="curation-approve">
          Aprovar como arena
        </Button>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              variant="outline"
              onPress={askSameArena}
              disabled={busy || close.length === 0}
              testID="curation-link"
            >
              Mesma arena que…
            </Button>
          </View>
          <View className="flex-1">
            <Button variant="outline" onPress={() => onDecide('Reject', kind)} disabled={busy} testID="curation-reject">
              Rejeitar
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CurationScreen() {
  const { coords, resolved } = useDeviceLocation();
  const center = coords ?? DEFAULT_CENTER;
  const [headerHeight, setHeaderHeight] = useState(0);
  const [mode, setMode] = useState<'list' | 'map'>('list');
  const [box, setBox] = useState<MapBox | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Where the reviewer dragged the selected place's pin, if they did.
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(null);

  const loadedBox = box ?? initialMapBox(center);
  const candidates = useCandidates({ ...loadedBox, lat: center.latitude, lon: center.longitude }, resolved);
  const decide = useDecide();
  const undo = useUndoDecision();
  const discover = useDiscover();

  const list = candidates.data?.candidates ?? [];
  const arenas = candidates.data?.arenas ?? [];
  const selected = list.find((c) => c.placeId === selectedId) ?? null;

  const select = (placeId: string | null) => {
    setSelectedId(placeId);
    setPin(null);
  };

  const onDecide = (choice: 'Approve' | 'Reject' | { arenaId: string }, kind: VenueKind) => {
    if (!selected) return;
    const placeId = selected.placeId;
    const decision: Decision =
      choice === 'Approve'
        ? {
            action: 'Approve',
            placeId,
            kind,
            latitude: pin?.lat ?? selected.lat,
            longitude: pin?.lon ?? selected.lon,
            pinMoved: pin !== null,
          }
        : choice === 'Reject'
          ? { action: 'Reject', placeId }
          : { action: 'Link', placeId, arenaId: choice.arenaId };
    decide.mutate(decision, {
      onSuccess: () => {
        select(null);
        const done =
          decision.action === 'Approve' ? 'Arena aprovada' : decision.action === 'Reject' ? 'Lugar rejeitado' : 'Ligado à arena';
        dialog.alert(done, 'Mudou de ideia? Dá para desfazer agora.', [
          { text: 'Desfazer', onPress: () => undo.mutate(placeId) },
          { text: 'OK', style: 'cancel' },
        ]);
      },
      onError: (error) => dialog.alert('Não foi possível salvar', failure(error)),
    });
  };

  // Searches Google for what the view shows (paid, and only when the team asks).
  const onDiscover = () => {
    const view = region ?? { ...center, latitudeDelta: 0.1, longitudeDelta: 0.1 };
    const radiusKm = Math.min(10, Math.max(1, Math.round((view.latitudeDelta / 2) * 111)));
    discover.mutate(
      { lat: view.latitude, lon: view.longitude, radiusKm },
      {
        onSuccess: (cells) =>
          dialog.alert(
            cells > 0 ? 'Busca feita' : 'Nada novo aqui',
            cells > 0
              ? 'Os lugares novos já estão na lista. Busque de novo para continuar pela área.'
              : 'Esta área já foi buscada nos últimos dias.',
          ),
        onError: (error) => dialog.alert('Não foi possível buscar', failure(error)),
      },
    );
  };

  const pending = candidates.data?.pendingCount ?? 0;

  return (
    <View className="flex-1 bg-bg-light">
      <View style={{ flex: 1, paddingTop: headerHeight }}>
        <View className="px-4 pt-2 gap-3">
          <Text className="font-body-bold text-body text-text-primary" testID="curation-count">
            {candidates.isPending
              ? 'Carregando…'
              : pending === 1
                ? '1 lugar para revisar nesta área'
                : `${pending} lugares para revisar nesta área`}
          </Text>
          <View className="flex-row gap-2">
            <FilterChip label="Lista" selected={mode === 'list'} onPress={() => setMode('list')} testID="curation-mode-list" />
            <FilterChip label="Mapa" selected={mode === 'map'} onPress={() => setMode('map')} testID="curation-mode-map" />
          </View>
          <Button variant="outline" onPress={onDiscover} loading={discover.isPending} testID="curation-discover">
            Buscar lugares no Google nesta área
          </Button>
        </View>

        {mode === 'list' ? (
          <FlatList
            data={list}
            keyExtractor={(c) => c.placeId}
            contentContainerClassName="p-4 gap-3 pb-80"
            ListEmptyComponent={
              candidates.isPending ? null : (
                <Text className="font-body text-body text-text-muted text-center mt-6">
                  Nada para revisar aqui. Busque lugares no Google ou mova o mapa.
                </Text>
              )
            }
            renderItem={({ item }) => <CandidateRow candidate={item} onPress={() => select(item.placeId)} />}
          />
        ) : (
          <MapView
            style={{ flex: 1, marginTop: 12 }}
            customMapStyle={MAP_STYLE}
            initialRegion={{ ...center, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
            onRegionChangeComplete={(shown) => {
              setRegion(shown);
              setBox(boxToFetch(loadedBox, boxOf(shown), candidates.data?.truncated ?? false));
            }}
            toolbarEnabled={false}
            testID="curation-map"
          >
            {arenas.map((arena) => [
              <Marker
                key={`halo-${arena.id}`}
                coordinate={{ latitude: arena.lat, longitude: arena.lon }}
                anchor={{ x: 0.5, y: 0.5 }}
                image={VENUE_HALO}
              />,
              <Marker
                key={`arena-${arena.id}`}
                coordinate={{ latitude: arena.lat, longitude: arena.lon }}
                anchor={{ x: 0.5, y: 0.5 }}
                image={venuePinImage({ kind: arena.kind, gamesCount: 0, live: false })}
                testID={`curation-arena-${arena.id}`}
              />,
            ])}
            {list.map((candidate) => {
              const isSelected = candidate.placeId === selectedId;
              const at = isSelected && pin ? pin : { lat: candidate.lat, lon: candidate.lon };
              return (
                <Marker
                  key={candidate.placeId}
                  coordinate={{ latitude: at.lat, longitude: at.lon }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  image={venuePinImage({ kind: candidate.kind, gamesCount: 0, live: false })}
                  // Drag the selected place's pin to where the court really is.
                  draggable={isSelected}
                  onDragEnd={(e) =>
                    setPin({ lat: e.nativeEvent.coordinate.latitude, lon: e.nativeEvent.coordinate.longitude })
                  }
                  onPress={() => select(candidate.placeId)}
                  zIndex={isSelected ? 2 : 0}
                  testID={`curation-pin-${candidate.placeId}`}
                />
              );
            })}
          </MapView>
        )}
      </View>

      {selected ? (
        <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0">
          <View className="px-4 pb-4">
            <CandidateCard
              key={selected.placeId}
              candidate={selected}
              arenas={arenas}
              pinMoved={pin !== null}
              busy={decide.isPending}
              onDecide={onDecide}
              onClose={() => select(null)}
            />
          </View>
        </SafeAreaView>
      ) : null}

      <BackHeader title="Curadoria" onHeight={setHeaderHeight} />
    </View>
  );
}
