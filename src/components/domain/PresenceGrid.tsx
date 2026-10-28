import { ChevronRight, UserPlus } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { PositionTag } from '@/components/domain/PositionPicker';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import type { PresencePlayer } from '@/features/matches/types/matchDetail';
import { colors } from '@/theme/colors';

export type PresenceGridProps = {
  /** Confirmed/known players; listed in order. */
  players: PresencePlayer[];
  /** Total slots; the bar shows how many of them are taken. */
  capacity: number;
  /** Opens a player's profile (or the organizer's actions); guests only with `guestsPressable`. */
  onPressPlayer?: (player: PresencePlayer) => void;
  /** Guests (no account, no profile) are pressable too: the organizer can remove them. */
  guestsPressable?: boolean;
  /**
   * When set and a slot is open, an "Adicionar convidado" action closes the
   * list (organizer on S12). Omit to show only the open slots.
   */
  onAddGuest?: () => void;
  testID?: string;
};

/** "@renan.dias" for a player with an @, the name for a guest. */
function displayName(player: PresencePlayer): string {
  return player.handle ? `@${player.handle}` : player.name;
}

/**
 * Who is going (S12 Match Detail): a capacity bar (one segment per slot, lime
 * when taken), one row per player (avatar with the level dot, @, position tag;
 * a tap opens the profile) and, for the organizer, the add-guest action. Taken
 * slots, open slots and the action never look alike: rows are white cards, open
 * slots only live in the bar and its count, the action is a lime button.
 *
 * Presentational — receives plain data via props and never fetches.
 */
export function PresenceGrid({
  players,
  capacity,
  onPressPlayer,
  guestsPressable = false,
  onAddGuest,
  testID,
}: PresenceGridProps) {
  const openSlots = Math.max(0, capacity - players.length);

  return (
    <View testID={testID}>
      <View className="mb-3 flex-row gap-1" testID={testID ? `${testID}-bar` : undefined}>
        {Array.from({ length: Math.max(capacity, players.length) }, (_, i) => (
          <View
            key={i}
            className={`h-2 flex-1 rounded-full ${i < players.length ? 'bg-accent' : 'bg-primary/10'}`}
          />
        ))}
      </View>

      <View className="gap-2">
        {players.map((player) => {
          const pressable = Boolean(onPressPlayer) && (guestsPressable || !player.isGuest);
          return (
            <PressableScale
              key={player.id}
              disabled={!pressable}
              onPress={() => onPressPlayer?.(player)}
              accessibilityRole={pressable ? 'button' : undefined}
              accessibilityLabel={displayName(player)}
              accessibilityHint={pressable ? 'Abrir perfil' : undefined}
              testID={testID ? `${testID}-player-${player.id}` : undefined}
              className="flex-row items-center gap-3 rounded-card border border-line bg-white px-3 py-2.5"
            >
              <Avatar uri={player.avatarUrl} name={player.name} size="sm" level={player.level} />
              <View className="flex-1">
                <Text numberOfLines={1} className="font-body-bold text-body text-text-primary">
                  {displayName(player)}
                </Text>
                {player.isGuest ? (
                  <Text className="font-body-bold text-eyebrow text-text-muted uppercase">
                    Convidado
                  </Text>
                ) : null}
              </View>
              {player.position ? <PositionTag code={player.position} /> : null}
              {pressable ? <ChevronRight size={18} color={colors.textMuted} /> : null}
            </PressableScale>
          );
        })}
      </View>

      {onAddGuest && openSlots > 0 ? (
        <View className="mt-3">
          <Button
            variant="grad"
            onPress={onAddGuest}
            leftIcon={<UserPlus size={18} color={colors.surfaceDark} />}
            testID={testID ? `${testID}-add-guest` : undefined}
          >
            Adicionar convidado
          </Button>
        </View>
      ) : null}
    </View>
  );
}
