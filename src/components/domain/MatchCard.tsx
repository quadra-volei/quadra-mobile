import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Users } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { NearbyMatch } from '@/features/matches/types/match';
import { colors, HERO_GRADIENT } from '@/theme/colors';

export type MatchCardProps = {
  match: NearbyMatch;
  onPress: (id: string) => void;
  testID?: string;
};

/** Formats km with a comma decimal separator (pt-BR): 1.2 → "1,2 km". */
function formatDistance(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/**
 * Dark, image-forward match card for the "JOGOS PERTO DE VOCÊ" grid (S5 Home).
 * Navy `HERO_GRADIENT` cover with `text-on-dark` copy: a format mono pill and a
 * lime level pill on top, venue name, distance, confirmed/capacity, and a lime
 * price label. Reused by S6 Explore grid and S17 map bottom sheet. Receives
 * plain data via props and never fetches.
 */
export function MatchCard({ match, onPress, testID }: MatchCardProps) {
  return (
    <Pressable
      onPress={() => onPress(match.id)}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${match.name}, ${formatDistance(match.distanceKm)}`}
      className="rounded-card overflow-hidden"
    >
      <LinearGradient
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 20 }}
      >
        <View className="p-4">
          {/* top pills — stacked: format on top, level badge on its own line
              below it (each self-sized + left-aligned via items-start). */}
          <View className="items-start gap-2">
            <View className="bg-white rounded-pill px-3 py-1">
              <Text className="font-mono text-mono text-text-primary uppercase">
                {match.format}
              </Text>
            </View>
            <View className="bg-accent rounded-pill px-3 py-1">
              <Text className="font-mono text-mono text-text-primary uppercase">
                {match.level}
              </Text>
            </View>
          </View>

          {/* distance — extra top gap gives the card the taller, roomier
              proportions of the S5 reference. */}
          <View className="flex-row items-center mt-10">
            <MapPin size={14} color={colors.accent} />
            <Text className="font-body text-caption text-accent ml-1">
              {formatDistance(match.distanceKm)}
            </Text>
          </View>

          {/* venue name */}
          <Text
            className="font-body text-h3 text-text-on-dark mt-1"
            numberOfLines={1}
          >
            {match.name}
          </Text>

          {/* footer: players + price */}
          <View className="flex-row items-center justify-between mt-3">
            <View className="flex-row items-center">
              <Users size={14} color={colors.textOnDark} />
              <Text className="font-num text-text-on-dark text-[13px] ml-1">
                {match.confirmed}/{match.capacity}
              </Text>
            </View>
            <Text className="font-num text-accent text-[15px]">
              {match.priceLabel}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
