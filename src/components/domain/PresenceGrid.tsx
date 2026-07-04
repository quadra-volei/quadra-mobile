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
  testID?: string;
};

/**
 * Capacity-aware confirmed-players grid (S12 Match Detail; reused by S13 team
 * rosters). Renders an `Avatar` + name cell per player, then dashed `border-line`
 * "vaga" placeholders for the remaining `capacity - players.length` open slots.
 *
 * Presentational — receives plain data via props and never fetches. No OVR
 * number is rendered anywhere (Layer-3 cut, per SCOPE S12).
 */
export function PresenceGrid({
  players,
  capacity,
  onPressEmpty,
  testID,
}: PresenceGridProps) {
  const emptyCount = Math.max(0, capacity - players.length);
  const emptySlots = Array.from({ length: emptyCount }, (_, i) => i);

  return (
    <View testID={testID} className="mt-3 flex-row flex-wrap">
      {players.map((player) => (
        <View key={player.id} className="w-1/4 items-center mb-4 px-1">
          <Avatar uri={player.avatarUrl} name={player.name} size="md" />
          <Text
            numberOfLines={1}
            className="mt-1 font-body text-caption text-text-primary"
          >
            {player.name}
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
