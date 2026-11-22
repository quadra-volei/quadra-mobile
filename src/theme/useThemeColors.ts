import { useColorScheme } from 'nativewind';
import { createContext, useContext } from 'react';

import { PALETTES, type ColorSchemeName, type ThemePalette } from '@/theme/palette';

/**
 * Forces one scheme on a subtree (`ForceLightTheme`): the screens drawn on navy in
 * both themes (live score, MVP vote, summary, the card, the pass) keep the colors
 * they were designed with.
 */
export const ForcedSchemeContext = createContext<ColorSchemeName | null>(null);

export type ThemeColors = ThemePalette & {
  scheme: ColorSchemeName;
  /** The hard offset shadow of buttons and selection cards, as an inline style. */
  hardShadow: { boxShadow: string };
};

const BUILT: Record<ColorSchemeName, ThemeColors> = {
  light: build('light'),
  dark: build('dark'),
};

function build(scheme: ColorSchemeName): ThemeColors {
  const palette = PALETTES[scheme];
  return { ...palette, scheme, hardShadow: { boxShadow: `3px 3px 0 0 ${palette.shadow}` } };
}

/**
 * The theme colors for runtime props NativeWind cannot reach (icon `color`,
 * gradients, inline selected states). Re-renders when the scheme changes, the
 * same moment the classNames switch. Brand colors that never change stay in
 * `colors` (`@/theme/colors`).
 */
export function useThemeColors(): ThemeColors {
  const forced = useContext(ForcedSchemeContext);
  const { colorScheme } = useColorScheme();
  return BUILT[forced ?? (colorScheme === 'dark' ? 'dark' : 'light')];
}
