import { Image } from 'expo-image';
import { Clock } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { CourtImage } from '@/components/ui/CourtImage';
import { Tag } from '@/components/ui/Tag';
import type { UpcomingMatch } from '@/features/matches/types/match';
import { colors } from '@/theme/colors';

export type MatchCardCompactProps = {
  match: UpcomingMatch;
  onPress: (id: string) => void;
  testID?: string;
};

const MAX_AVATARS = 3;

// pt-BR "Grátis" price → green; everything else navy (prototype).
const PRICE_FREE_COLOR = '#1F8A5B';

/**
 * Formats an ISO timestamp as "Hoje · 19h30" / "Amanhã · 20h00" / "20/06 · 19h30",
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

  if (dayDiff === 0) return `Hoje · ${time}`;
  if (dayDiff === 1) return `Amanhã · ${time}`;

  const dd = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mo} · ${time}`;
}

/**
 * Compact match card for the "PRÓXIMAS PARTIDAS" scroll (S5 Home). A `CourtImage`
 * cover tinted per match with a category tag, then a white content block: name,
 * datetime, and a footer with the confirmed-avatar stack and vagas/price badges.
 * Reused by S8 (recent matches strip). Receives plain data via props and never
 * fetches. Mirrors the prototype's upcoming card.
 */
export function MatchCardCompact({ match, onPress, testID }: MatchCardCompactProps) {
  const extra = match.avatarUrls.length - MAX_AVATARS;
  const visibleAvatars = match.avatarUrls.slice(0, MAX_AVATARS);
  const catBlue = (match.category ?? '').toUpperCase() === 'CASUAL';
  const isFree = match.priceLabel.toLowerCase() === 'grátis';

  return (
    <Pressable
      onPress={() => onPress(match.id)}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${match.name}, ${formatStartsAt(match.startsAt)}`}
      className="w-[262px] bg-white rounded-card shadow-card overflow-hidden"
    >
      {/* cover */}
      <View>
        <CourtImage tint={match.tint} height={124} radius={0} />
        {match.category ? (
          <View className="absolute top-[10px] left-[10px]">
            <Tag
              bg={catBlue ? colors.primary : colors.accent}
              color={catBlue ? colors.textOnDark : colors.surfaceDark}
              dot
            >
              {match.category}
            </Tag>
          </View>
        ) : null}
      </View>

      {/* content */}
      <View className="px-[14px] pt-[13px] pb-[14px]">
        <Text
          className="font-body-bold text-text-primary"
          style={{ fontSize: 16 }}
          numberOfLines={1}
        >
          {match.name}
        </Text>

        <View className="flex-row items-center mt-[6px]">
          <Clock size={14} color={colors.textMuted} />
          <Text
            className="font-body-semibold text-text-muted ml-[5px]"
            style={{ fontSize: 12.5 }}
          >
            {formatStartsAt(match.startsAt)}
          </Text>
        </View>

        {/* footer: avatar stack + vagas/price badges, above a hairline */}
        <View className="flex-row items-center justify-between mt-[13px] pt-[13px] border-t border-[rgba(10,10,60,0.06)]">
          <View className="flex-row items-center">
            {visibleAvatars.map((url, i) => (
              <Image
                key={url}
                source={{ uri: url }}
                className={`h-[26px] w-[26px] rounded-full border-2 border-white ${i > 0 ? '-ml-[9px]' : ''}`}
              />
            ))}
            {extra > 0 ? (
              <View className="h-[26px] w-[26px] rounded-full border-2 border-white bg-bg-light items-center justify-center -ml-[9px]">
                <Text
                  className="font-body-bold text-primary"
                  style={{ fontSize: 10 }}
                >
                  +{extra}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="flex-row items-center gap-[6px]">
            <View
              className="rounded-pill px-[10px] py-[5px]"
              style={{ backgroundColor: 'rgba(26,26,255,0.08)' }}
            >
              <Text
                className="font-body-bold text-primary"
                style={{ fontSize: 11.5 }}
              >
                {match.openSlots} vagas
              </Text>
            </View>

            <View className="rounded-pill px-[10px] py-[5px] bg-bg-light">
              <Text
                className="font-body-bold"
                style={{ fontSize: 11.5, color: isFree ? PRICE_FREE_COLOR : colors.surfaceDark }}
              >
                {match.priceLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
