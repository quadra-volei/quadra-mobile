import { useState } from 'react';
import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MatchCard } from '@/components/domain/MatchCard';
import type { MapArena } from '@/features/explore/api/mapItems';
import { VENUE_KINDS } from '@/features/explore/api/venues';
import { formatWhen } from '@/features/matches/lib/formatWhen';
import type { NearbyMatch } from '@/features/matches/types/match';

/*
 * The list under the map (DECISIONS #180, D8): what the map shows, as a list in a panel dragged
 * up from the bottom, like the references. Collapsed it only counts the area ("12 arenas · 7
 * jogos nesta área"); half and full open the list, closest first. Provisional layout until the
 * designer's (D8). Arena rows carry no name: a name is a paid Google lookup, made only when an
 * arena is opened.
 */

type Snap = 0 | 1 | 2;
const PEEK = 72;
/** Room left above the full panel for the map's top bar. */
const TOP_GAP = 150;

type Row = { type: 'arena'; arena: MapArena; km: number } | { type: 'game'; match: NearbyMatch; km: number };

/** "12 arenas · 7 jogos nesta área". */
export function areaCountLabel(arenas: number, games: number): string {
  const a = arenas === 1 ? '1 arena' : `${arenas} arenas`;
  const g = games === 1 ? '1 jogo' : `${games} jogos`;
  return `${a} · ${g} nesta área`;
}

/** Arenas and games of the area in one list, closest first. */
export function listRows(arenas: MapArena[], games: NearbyMatch[]): Row[] {
  return [
    ...arenas.map((arena) => ({ type: 'arena' as const, arena, km: arena.distanceKm })),
    ...games.map((match) => ({ type: 'game' as const, match, km: match.distanceKm })),
  ].sort((a, b) => a.km - b.km);
}

function ArenaRow({ arena, onPress }: { arena: MapArena; onPress: () => void }) {
  const kind = VENUE_KINDS.find((k) => k.kind === arena.kind);
  const next = arena.games[0];
  const games = arena.gamesCount === 1 ? '1 jogo esta semana' : `${arena.gamesCount} jogos esta semana`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${kind?.label ?? 'Arena'} a ${arena.distanceKm.toFixed(1).replace('.', ',')} km, ${games}`}
      testID={`map-list-arena-${arena.id}`}
      className="rounded-card border-2 border-surface-dark bg-white px-4 py-3"
    >
      <Text className="font-mono text-mono text-text-muted uppercase">
        {kind ? `${kind.emoji} ${kind.label}` : 'Arena'} · {arena.distanceKm.toFixed(1).replace('.', ',')} km
      </Text>
      <Text className="mt-1 font-body-bold text-body text-text-primary">
        {arena.gamesCount > 0 ? games : 'Nenhum jogo marcado nos próximos dias'}
      </Text>
      {next ? (
        <Text numberOfLines={1} className="mt-0.5 font-body text-caption text-text-muted">
          {next.live ? 'Ao vivo' : formatWhen(next.startsAt)} · {next.name}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function MapListSheet({
  arenas,
  games,
  arenaCount,
  gameCount,
  onOpenArena,
  onOpenMatch,
}: {
  arenas: MapArena[];
  games: NearbyMatch[];
  arenaCount: number;
  gameCount: number;
  onOpenArena: (arena: MapArena) => void;
  onOpenMatch: (id: string) => void;
}) {
  const { height } = useWindowDimensions();
  const full = Math.max(height - TOP_GAP, PEEK * 3);
  // How far down the panel sits for each snap: peek, half, full.
  const offsets = [full - PEEK, full - Math.round(height * 0.45), 0];
  const [snap, setSnap] = useState<Snap>(0);
  const y = useSharedValue(offsets[0]!);
  const start = useSharedValue(0);

  const go = (next: Snap) => {
    setSnap(next);
    y.value = withTiming(offsets[next]!, { duration: 220 });
  };

  const drag = Gesture.Pan()
    .onBegin(() => {
      start.value = y.value;
    })
    .onUpdate((e) => {
      y.value = Math.min(Math.max(start.value + e.translationY, 0), offsets[0]!);
    })
    .onEnd((e) => {
      // A flick goes one step its way; a slow drag settles on the closest snap.
      const projected = y.value + e.velocityY * 0.15;
      let next: Snap = 0;
      for (const s of [1, 2] as const) {
        if (Math.abs(offsets[s]! - projected) < Math.abs(offsets[next]! - projected)) next = s;
      }
      y.value = withTiming(offsets[next]!, { duration: 220 });
      runOnJS(setSnap)(next);
    });

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const rows = listRows(arenas, games);

  return (
    <Animated.View
      style={[{ height: full }, style]}
      className="absolute inset-x-0 bottom-0 rounded-t-card bg-bg-light shadow-modal"
      testID="map-list-sheet"
    >
      <GestureDetector gesture={drag}>
        <Pressable
          onPress={() => go(snap === 0 ? 1 : 0)}
          accessibilityRole="button"
          accessibilityLabel={snap === 0 ? 'Abrir a lista' : 'Fechar a lista'}
          testID="map-list-handle"
          className="items-center px-4 pt-2 pb-3"
        >
          <View className="h-1 w-10 rounded-pill bg-text-muted/40" />
          <Text className="mt-2 font-body-bold text-body text-text-primary" testID="map-list-count">
            {areaCountLabel(arenaCount, gameCount)}
          </Text>
        </Pressable>
      </GestureDetector>
      {snap > 0 ? (
        <FlatList<Row>
          data={rows}
          keyExtractor={(row) => (row.type === 'arena' ? `a:${row.arena.id}` : `g:${row.match.id}`)}
          contentContainerClassName="px-4 pb-8 gap-3"
          renderItem={({ item }) =>
            item.type === 'arena' ? (
              <ArenaRow arena={item.arena} onPress={() => onOpenArena(item.arena)} />
            ) : (
              <MatchCard match={item.match} onPress={onOpenMatch} testID={`map-list-game-${item.match.id}`} />
            )
          }
        />
      ) : null}
    </Animated.View>
  );
}
