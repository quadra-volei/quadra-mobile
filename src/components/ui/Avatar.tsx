import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { levelTier } from '@/theme/levelTier';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export type AvatarProps = {
  /** expo-image source; falls back to the initial when absent. */
  uri?: string;
  /** Used for the initial fallback + accessibility label. */
  name?: string;
  /** sm = ranking/header rows, md = header, lg = podium (S9), xl = player card. */
  size?: AvatarSize;
  /**
   * When set, renders a small tier-colored level badge ("bolinha") at the
   * bottom-right — matching the prototype's BadgeAvatar. Omit to render a plain
   * avatar (default; existing consumers are unaffected).
   */
  level?: number;
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

const INITIAL_CLASS: Record<AvatarSize, string> = {
  sm: 'text-body',
  md: 'text-h3',
  lg: 'text-h1',
  xl: 'text-display',
};

// Badge diameter (via defined spacing tokens) + number font size per avatar size.
const BADGE_CLASS: Record<AvatarSize, { box: string; font: number }> = {
  sm: { box: 'h-4 w-4', font: 9 },
  md: { box: 'h-4 w-4', font: 9 },
  lg: { box: 'h-6 w-6', font: 12 },
  xl: { box: 'h-12 w-12', font: 20 },
};

function initialOf(name?: string): string {
  const trimmed = name?.trim() ?? '';
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : '?';
}

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
 * Circular avatar with an initials fallback. Renders an `expo-image` (cached)
 * when `uri` is present, otherwise a `bg-bg-light-alt` circle with the name's
 * first letter. Receives plain data via props and never fetches.
 *
 * First needed by S8 (header + ranking rows); reused by S9/S10/S12/S15.
 */
export function Avatar({ uri, name, size = 'md', level, testID }: AvatarProps) {
  const sizeClass = SIZE_CLASS[size];
  const label = name ? `Avatar de ${name}` : 'Avatar';

  const circle = uri ? (
    <Image
      source={{ uri }}
      testID={testID}
      accessibilityLabel={label}
      className={`${sizeClass} rounded-full bg-bg-light-alt`}
    />
  ) : (
    <View
      testID={testID}
      accessibilityLabel={label}
      className={`${sizeClass} rounded-full bg-bg-light-alt items-center justify-center`}
    >
      <Text className={`font-num text-text-muted ${INITIAL_CLASS[size]}`}>
        {initialOf(name)}
      </Text>
    </View>
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
