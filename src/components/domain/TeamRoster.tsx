import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { getTeamBgColor } from '@/features/matches/lib/teamColors';
import type { PresencePlayer } from '@/features/matches/types/matchDetail';

export type TeamRosterProps = {
  teamId: string;
  teamName?: string;
  players: PresencePlayer[];
  /** 0-based position of the team, which picks its color (teamColors). */
  colorIndex?: number;
  /** When set, each player row is a button (S13: move the player to another team). */
  onPlayerPress?: (player: PresencePlayer) => void;
  testID?: string;
};

/**
 * One team as a card: the team's color and name, how many play, and one row per
 * player (avatar, name, position).
 *
 * Presentational: receives plain data via props, never fetches. Used by S13
 * In-Game Teams, one card per team stacked down the screen.
 */
export function TeamRoster({
  teamId,
  teamName,
  players,
  colorIndex = 0,
  onPlayerPress,
  testID,
}: TeamRosterProps) {
  return (
    <View className="rounded-card border border-line bg-white p-4" testID={testID}>
      {/* ── Team header ── */}
      <View className="mb-3 flex-row items-center gap-2">
        <View className={`h-3 w-3 rounded-full ${getTeamBgColor(colorIndex)}`} />
        <Text className="flex-1 font-body-extrabold text-h3 text-text-primary">
          {teamName || `Time ${teamId}`}
        </Text>
        <Text className="font-body text-caption text-text-muted">
          {players.length} {players.length === 1 ? 'jogador' : 'jogadores'}
        </Text>
      </View>

      {/* ── One row per player ── */}
      <View className="gap-3">
        {players.map((player) => (
          <Pressable
            key={player.id}
            disabled={!onPlayerPress}
            onPress={() => onPlayerPress?.(player)}
            accessibilityRole={onPlayerPress ? 'button' : undefined}
            accessibilityHint={onPlayerPress ? 'Mover para outro time' : undefined}
            testID={`roster-player-${player.id}`}
            className="flex-row items-center gap-3"
          >
            <Avatar
              uri={player.avatarUrl}
              name={player.name}
              size="sm"
              testID={`avatar-${player.id}`}
            />
            <Text
              className="flex-1 font-body-medium text-body text-text-primary"
              numberOfLines={1}
            >
              {player.name}
            </Text>
            {player.position ? (
              <Text className="font-mono text-mono text-primary uppercase">
                {player.position}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
