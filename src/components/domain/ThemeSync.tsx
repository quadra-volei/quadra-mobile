import { colorScheme } from 'nativewind';
import { useEffect } from 'react';

import { useThemeStore } from '@/stores/theme';

/**
 * Applies the "Aparência" preference: `light` / `dark` pin the scheme, `system`
 * follows the phone. Runs again when the stored preference is read back at
 * start-up (AsyncStorage answers after the first render) and on every change in
 * Configurações. Renders nothing.
 */
export function ThemeSync() {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    colorScheme.set(theme);
  }, [theme]);
  return null;
}
