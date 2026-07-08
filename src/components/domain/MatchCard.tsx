import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Users } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { CourtImage } from '@/components/ui/CourtImage';
import { Tag } from '@/components/ui/Tag';
import type { NearbyMatch } from '@/features/matches/types/match';
import { colors } from '@/theme/colors';

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
 * Image-forward match card for the "JOGOS PERTO DE VOCÊ" grid (S5 Home), also
 * reused by the S6 Explore grid. A `CourtImage` cover tinted per match, with a
 * format + level tag stack top-left and venue name, distance, confirmed/capacity
 * and price overlaid over a dark bottom scrim. Receives plain data via props and
 * never fetches. Mirrors the prototype's `NearbyCard`.
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
      <CourtImage tint={match.tint} height={172} radius={16}>
        {/* dark bottom scrim so the overlaid copy stays legible */}
        <LinearGradient
          colors={['rgba(10,10,60,0.05)', 'rgba(10,10,60,0.82)']}
          locations={[0.35, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />

        {/* format + level tags, stacked top-left */}
        <View className="absolute top-[10px] left-[10px] items-start gap-[5px]">
          <Tag bg="rgba(255,255,255,0.92)" color={colors.surfaceDark}>
            {match.format}
          </Tag>
          <Tag bg={colors.accent} color={colors.surfaceDark}>
            {match.level}
          </Tag>
        </View>

        {/* bottom info block */}
        <View className="absolute left-[11px] right-[11px] bottom-[10px]">
          <View className="flex-row items-center gap-1 mb-[3px]">
            <MapPin size={11} color={colors.accentLight} />
            <Text
              className="font-mono text-accent-light"
              style={{ fontSize: 9.5, letterSpacing: 0.5 }}
            >
              {formatDistance(match.distanceKm)}
            </Text>
          </View>
          <Text
            className="font-body-bold text-text-on-dark"
            style={{ fontSize: 14, lineHeight: 16 }}
            numberOfLines={1}
          >
            {match.name}
          </Text>
          <View className="flex-row items-center justify-between mt-[6px]">
            <View className="flex-row items-center gap-1">
              <Users size={13} color="rgba(255,255,255,0.8)" />
              <Text
                className="font-body"
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}
              >
                {match.confirmed}/{match.capacity}
              </Text>
            </View>
            <Text
              className="font-num text-accent-light"
              style={{ fontSize: 16, letterSpacing: 0.5 }}
            >
              {match.priceLabel}
            </Text>
          </View>
        </View>
      </CourtImage>
    </Pressable>
  );
}
