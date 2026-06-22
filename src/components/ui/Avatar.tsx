import { Image } from 'expo-image';
import { Text, View } from 'react-native';

export type AvatarSize = 'sm' | 'md' | 'lg';

export type AvatarProps = {
  /** expo-image source; falls back to the initial when absent. */
  uri?: string;
  /** Used for the initial fallback + accessibility label. */
  name?: string;
  /** sm = ranking/header rows, md = header, lg = podium (S9). */
  size?: AvatarSize;
  testID?: string;
};

// Pixel diameters per size token. Kept as a class map so NativeWind sizing stays
// stable (no inline style). `rounded-full` makes it circular.
const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

const INITIAL_CLASS: Record<AvatarSize, string> = {
  sm: 'text-body',
  md: 'text-h3',
  lg: 'text-h1',
};

function initialOf(name?: string): string {
  const trimmed = name?.trim() ?? '';
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : '?';
}

/**
 * Circular avatar with an initials fallback. Renders an `expo-image` (cached)
 * when `uri` is present, otherwise a `bg-bg-light-alt` circle with the name's
 * first letter. Receives plain data via props and never fetches.
 *
 * First needed by S8 (header + ranking rows); reused by S9/S10/S12/S15.
 */
export function Avatar({ uri, name, size = 'md', testID }: AvatarProps) {
  const sizeClass = SIZE_CLASS[size];
  const label = name ? `Avatar de ${name}` : 'Avatar';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        testID={testID}
        accessibilityLabel={label}
        className={`${sizeClass} rounded-full bg-bg-light-alt`}
      />
    );
  }

  return (
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
}
