import { Easing } from 'react-native-reanimated';

import type { ThemeColors } from '@/theme/useThemeColors';

// One set of durations and curves for the whole app, so every tap, tab switch
// and sheet moves at the same pace (DECISIONS #109). Reanimated animations
// default to `ReduceMotion.System`: with the system "remove animations" setting
// on they jump straight to their end.
const EASE_OUT = Easing.out(Easing.cubic);

export const MOTION = {
  // Press feedback of every tappable surface (PressableScale).
  press: { duration: 120, easing: EASE_OUT },
  pressScale: 0.97,
  pressOpacity: 0.85,
  // Underline sliding to the new tab and the label color following it.
  tab: { duration: 220, easing: EASE_OUT },
  // Content that comes in after a tab switch or a sheet opening.
  fadeIn: 180,
} as const;

// Every Stack (`stackOptions(useThemeColors())`): pushed screens slide in from the right with the previous one
// easing back (Android's iOS-like transition), over the app background so no
// white or black frame shows between screens.
export function stackOptions(theme: Pick<ThemeColors, 'bg'>) {
  return {
    headerShown: false,
    animation: 'ios_from_right',
    contentStyle: { backgroundColor: theme.bg },
  } as const;
}
