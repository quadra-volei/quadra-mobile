import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import type { PresencePlayer } from '@/features/matches/types/matchDetail';

export type PresenceGridProps = {
  /** Confirmed/known players; rendered first, in order. */
  players: PresencePlayer[];
  /** Total slots; empties beyond `players.length` render as dashed "vaga". */
  capacity: number;
  /**
   * When set, each empty "vaga" slot becomes a button that calls this (organizer
   * "add guest" affordance on S12). Omit to render inert placeholders.
   */
  onPressEmpty?: () => void;
  /**
   * Caps how many "vaga" placeholders render, so a nearly-empty high-capacity
   * match shows a hint of open slots instead of a wall of dashed circles (the
   * prototype shows at most 3). Omit to render every open slot.
   */
  maxEmptySlots?: number;
  testID?: string;
};

/** "Renan Dias" → "Renan"; the grid cell only has room for a first name. */
function firstName(name: string): string {
  return name.trim().split(' ')[0] ?? name;
}

/**
 * Capacity-aware confirmed-players grid (S12 Match Detail; reused by S13 team
 * rosters). Renders an `Avatar` + first-name cell per player — with the
 * tier-colored level "bolinha" when the player has a level — then dashed
 * `border-line` "vaga" placeholders for the remaining open slots (up to
 * `maxEmptySlots`).
 *
 * Presentational — receives plain data via props and never fetches. No OVR
 * number is rendered anywhere (Layer-3 cut, per SCOPE S12).
 */
export function PresenceGrid({
  players,
  capacity,
  onPressEmpty,
  maxEmptySlots,
  testID,
}: PresenceGridProps) {
  const openCount = Math.max(0, capacity - players.length);
  const emptyCount =
    maxEmptySlots == null ? openCount : Math.min(openCount, maxEmptySlots);
  const emptySlots = Array.from({ length: emptyCount }, (_, i) => i);

  return (
    <View testID={testID} className="mt-3 flex-row flex-wrap">
      {players.map((player) => (
        <View key={player.id} className="w-1/4 items-center mb-4 px-1">
          <Avatar
            uri={player.avatarUrl}
            name={player.name}
            size="md"
            level={player.level}
          />
          <Text
            numberOfLines={1}
            className="mt-2 font-body-semibold text-caption text-text-primary"
          >
            {firstName(player.name)}
          </Text>
          {player.isGuest ? (
            <Text className="font-body text-eyebrow text-text-muted uppercase">
              Convidado
            </Text>
          ) : null}
        </View>
      ))}

      {emptySlots.map((slot) => {
        const emptyTestID = testID ? `${testID}-empty` : undefined;
        const inner = (
          <>
            <View className="h-12 w-12 items-center justify-center rounded-full border border-dashed border-line">
              <Text className="font-num text-h3 text-text-muted">+</Text>
            </View>
            <Text className="mt-1 font-body text-caption text-text-muted">
              vaga
            </Text>
          </>
        );

        return onPressEmpty ? (
          <Pressable
            key={`vaga-${slot}`}
            testID={emptyTestID}
            onPress={onPressEmpty}
            accessibilityRole="button"
            accessibilityLabel="Adicionar convidado nesta vaga"
            className="w-1/4 items-center mb-4 px-1"
          >
            {inner}
          </Pressable>
        ) : (
          <View
            key={`vaga-${slot}`}
            testID={emptyTestID}
            className="w-1/4 items-center mb-4 px-1"
          >
            {inner}
          </View>
        );
      })}
    </View>
  );
}
