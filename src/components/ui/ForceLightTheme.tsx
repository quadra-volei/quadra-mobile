import { vars } from 'nativewind';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { PALETTES, paletteVariables } from '@/theme/palette';
import { ForcedSchemeContext } from '@/theme/useThemeColors';

const LIGHT_VARIABLES = vars(paletteVariables(PALETTES.light));

/**
 * Keeps a screen in its light-theme colors whatever the app's theme. For the
 * screens already designed on navy (live score, MVP vote, summary, the card, the
 * pass, the collection): they are dark in both themes, and their white chips and
 * navy labels must not turn into the dark theme's cards (DECISIONS #203).
 */
export function ForceLightTheme({ children }: { children: ReactNode }) {
  return (
    <ForcedSchemeContext.Provider value="light">
      <View style={[{ flex: 1 }, LIGHT_VARIABLES]}>{children}</View>
    </ForcedSchemeContext.Provider>
  );
}
