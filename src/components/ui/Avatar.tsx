import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { levelTier } from '@/theme/levelTier';
import {
  type AvatarSource,
  defaultAvatarFor,
} from '@/theme/defaultAvatars';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export type AvatarProps = {
  /** expo-image source; falls back to a brand default illustration when absent. */
  uri?: string;
  /** Used to seed the default illustration + the accessibility label. */
  name?: string;
  /** sm = ranking/header rows, md = header, lg = podium (S9), xl = player card. */
  size?: AvatarSize;
  /**
   * When set, renders a small tier-colored level badge ("bolinha") at the
   * bottom-right — matching the prototype's BadgeAvatar. Omit to render a plain
   * avatar (default; existing consumers are unaffected).
   */
  level?: number;
  /**
   * Overrides the seeded default illustration used when there is no `uri`
   * (e.g. pin the current user to the prototype's `DEFAULT_AVATAR`). Ignored
   * when `uri` is present.
   */
  defaultSource?: AvatarSource;
  testID?: string;
};

// Pixel diameters per size token. Kept as a class map so NativeWind sizing stays
// stable (no inline style). `rounded-full` makes it circular.
const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-32 w-32',
};

// Badge diameter (via defined spacing tokens) + number font size per avatar size.
const BADGE_CLASS: Record<AvatarSize, { box: string; font: number }> = {
  sm: { box: 'h-4 w-4', font: 9 },
  md: { box: 'h-4 w-4', font: 9 },
  lg: { box: 'h-6 w-6', font: 12 },
  xl: { box: 'h-12 w-12', font: 20 },
};

/** Small tier-colored level badge overlaid at the avatar's bottom-right. */
function LevelBadge({ level, size }: { level: number; size: AvatarSize }) {
  const { color, textColor } = levelTier(level);
  const { box, font } = BADGE_CLASS[size];
  return (
    <View
      testID="avatar-level-badge"
      accessibilityLabel={`Nível ${level}`}
      className={`absolute -bottom-[2px] -right-[2px] ${box} rounded-full border-2 border-white items-center justify-center`}
      style={{ backgroundColor: color }}
    >
      <Text
        className="font-num"
        style={{ color: textColor, fontSize: font, lineHeight: font + 1 }}
      >
        {level}
      </Text>
    </View>
  );
}

/**
 * Circular avatar. Renders an `expo-image` (cached) of the player's photo when
 * `uri` is present, otherwise a brand default illustration — seeded by `name`
 * for variety, or pinned via `defaultSource`. Receives plain data via props and
 * never fetches.
 *
 * First needed by S8 (header + ranking rows); reused by S9/S10/S12/S15.
 */
export function Avatar({
  uri,
  name,
  size = 'md',
  level,
  defaultSource,
  testID,
}: AvatarProps) {
  const sizeClass = SIZE_CLASS[size];
  const label = name ? `Avatar de ${name}` : 'Avatar';
  const source = uri ? { uri } : (defaultSource ?? defaultAvatarFor(name));

  const circle = (
    <Image
      source={source}
      contentFit="cover"
      testID={testID}
      accessibilityLabel={label}
      className={`${sizeClass} rounded-full bg-bg-light-alt`}
    />
  );

  // No badge → return the plain circle (existing consumers unchanged).
  if (level == null) {
    return circle;
  }

  return (
    <View className="relative">
      {circle}
      <LevelBadge level={level} size={size} />
    </View>
  );
}
