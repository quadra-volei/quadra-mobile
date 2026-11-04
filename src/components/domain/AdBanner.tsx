import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { IconDivulgar } from '@/components/icons/quadra';
import { Tag } from '@/components/ui/Tag';
import { openAd, recordAdView, type ServedAd } from '@/features/ads/api/ads';
import { colors } from '@/theme/colors';

export type AdBannerProps = {
  ad: ServedAd;
  /** `card` on Home and in the opening card; `compact` in the corner of the map. */
  size?: 'card' | 'compact';
  /** A preview in the ad form: counts nothing and does not open the link. */
  preview?: boolean;
  testID?: string;
};

/**
 * An ad from the self-service (DECISIONS #200): photo, title, short text and the "Patrocinado" tag,
 * always marked as an ad. Showing it counts a view (once per player and day on the server); a tap
 * counts a tap and opens the advertiser's link.
 */
export function AdBanner({ ad, size = 'card', preview = false, testID }: AdBannerProps) {
  useEffect(() => {
    if (!preview) void recordAdView(ad.id, 'Impression');
  }, [ad.id, preview]);

  const compact = size === 'compact';
  const photo = compact ? 56 : 88;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Patrocinado: ${ad.title}${ad.body ? `. ${ad.body}` : ''}`}
      onPress={preview ? undefined : () => openAd(ad)}
      disabled={preview}
      testID={testID}
      className={`flex-row overflow-hidden rounded-card bg-white shadow-card ${compact ? 'w-64' : ''}`}
    >
      {ad.photoUrl ? (
        <Image source={{ uri: ad.photoUrl }} style={{ width: photo, height: photo }} contentFit="cover" />
      ) : (
        <View style={{ width: photo, height: photo }} className="items-center justify-center bg-surface-dark">
          <IconDivulgar size={compact ? 22 : 28} color={colors.accent} />
        </View>
      )}
      <View className="flex-1 justify-center px-3 py-2">
        <View className="flex-row">
          <Tag bg={colors.bgLightAlt} color={colors.textMuted}>
            Patrocinado
          </Tag>
        </View>
        <Text numberOfLines={1} className="mt-1 font-body-extrabold text-h3 text-text-primary">
          {ad.title}
        </Text>
        {ad.body && !compact ? (
          <Text numberOfLines={2} className="font-body text-caption text-text-muted">
            {ad.body}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
