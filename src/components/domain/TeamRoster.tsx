import { View, Text } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import type { PresencePlayer } from '@/features/matches/types/matchDetail';

export type TeamRosterProps = {
  teamId: string;
  teamName?: string;
  players: PresencePlayer[];
  testID?: string;
};

/**
 * A vertical team roster column — renders a team header and a vertical stack of
 * player avatars with optional position badges.
 *
 * Presentational: receives plain data via props, never fetches. Used by S13
 * In-Game Teams to display N columns (2, 3, or 4 teams) side-by-side.
 */
export function TeamRoster({
  teamId,
  teamName,
  players,
  testID,
}: TeamRosterProps) {
  return (
    <View className="flex-1" testID={testID}>
      {/* ── Team header ── */}
      <Text className="font-body text-eyebrow text-text-primary uppercase mb-3">
        {teamName || `Time ${teamId}`}
      </Text>

      {/* ── Vertical stack of player avatars + position badges ── */}
      <View className="gap-3">
        {players.map((player) => (
          <View key={player.id} className="items-center">
            <Avatar
              uri={player.avatarUrl}
              name={player.name}
              size="md"
              testID={`avatar-${player.id}`}
            />
            {player.position ? (
              <View className="mt-1 bg-primary rounded-pill px-2 py-1">
                <Text className="font-mono text-mono text-text-primary uppercase text-xs">
                  {player.position}
                </Text>
              </View>
            ) : null}
            <Text className="mt-1 font-body text-caption text-text-primary text-center">
              {player.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
