import { Image } from 'expo-image';
import { Clock } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { UpcomingMatch } from '@/features/matches/types/match';
import { colors } from '@/theme/colors';

export type MatchCardCompactProps = {
  match: UpcomingMatch;
  onPress: (id: string) => void;
  testID?: string;
};

const MAX_AVATARS = 3;

/**
 * Formats an ISO timestamp as "Hoje 19h30" / "Amanhã 20h00" / "20/06 19h30",
 * relative to the current day. Pure, no external date lib.
 */
function formatStartsAt(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round(
    (startOfDay(date) - startOfDay(now)) / (1000 * 60 * 60 * 24),
  );

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const time = `${hh}h${mm}`;

  if (dayDiff === 0) return `Hoje ${time}`;
  if (dayDiff === 1) return `Amanhã ${time}`;

  const dd = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mo} ${time}`;
}

/**
 * Compact horizontal match card for the "PRÓXIMAS PARTIDAS" scroll (S5 Home).
 * Light `bg-white rounded-card shadow-card` with a small navy cover strip,
 * name, datetime, a small confirmed-avatar stack, a "N vagas" label, and a
 * price pill. Reused by S8 (recent matches strip). Receives plain data via
 * props and never fetches.
 */
export function MatchCardCompact({ match, onPress, testID }: MatchCardCompactProps) {
  const extra = match.avatarUrls.length - MAX_AVATARS;
  const visibleAvatars = match.avatarUrls.slice(0, MAX_AVATARS);

  return (
    <Pressable
      onPress={() => onPress(match.id)}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${match.name}, ${formatStartsAt(match.startsAt)}`}
      className="w-64 bg-white rounded-card shadow-card overflow-hidden"
    >
      {/* cover strip */}
      <View className="h-20 bg-surface-dark items-start justify-start p-3">
        {match.category ? (
          <View className="bg-accent rounded-pill px-3 py-1">
            <Text className="font-mono text-mono text-text-primary uppercase">
              {match.category}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="p-3">
        <Text className="font-body text-h3 text-text-primary" numberOfLines={1}>
          {match.name}
        </Text>

        <View className="flex-row items-center mt-1">
          <Clock size={14} color={colors.textMuted} />
          <Text className="font-body text-caption text-text-muted ml-1">
            {formatStartsAt(match.startsAt)}
          </Text>
        </View>

        {/* hairline divider between datetime and the vagas/price footer */}
        <View className="h-px bg-line mt-3" />

        <View className="flex-row items-center justify-between mt-3">
          {/* avatar stack */}
          <View className="flex-row items-center">
            {visibleAvatars.map((url, i) => (
              <Image
                key={url}
                source={{ uri: url }}
                className={`h-6 w-6 rounded-full border border-white ${i > 0 ? '-ml-2' : ''}`}
              />
            ))}
            {extra > 0 ? (
              <View className="h-6 w-6 rounded-full border border-white bg-bg-light-alt items-center justify-center -ml-2">
                <Text className="font-num text-text-primary text-[9px]">+{extra}</Text>
              </View>
            ) : null}
          </View>

          {/* badges grouped to the right, matched in size */}
          <View className="flex-row items-center gap-2">
            <View className="bg-bg-light-alt rounded-pill px-3 py-1">
              <Text className="font-body text-body-bold text-primary text-[12px]">
                {match.openSlots} vagas
              </Text>
            </View>

            <View className="bg-bg-light-alt rounded-pill px-3 py-1">
              <Text className="font-num text-text-primary text-[12px]">
                {match.priceLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
