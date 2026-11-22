import { useThemeColors } from '@/theme/useThemeColors';

import type { QuadraIcon } from './quadra';

// Shared bits for the bottom-nav icons (TabHomeIcon, TabExploreIcon, TabNetworkIcon,
// TabProfileIcon). Active = flat brand blue (no gradient, DECISIONS #69); inactive = muted navy
// at 40%. In the dark theme the blue is lifted (`primaryFg`) and the inactive icon is the light
// copy at 45%, so both read on the dark pill (DECISIONS #203).

export type TabIconProps = {
  /** Active tab → flat brand blue; inactive → muted navy at 40%. */
  focused?: boolean;
  size?: number;
  testID?: string;
};

const TAB_MUTED_LIGHT = '#0E193566'; // navy at 40% alpha
const TAB_MUTED_DARK = 'rgba(238,240,255,0.45)'; // dark-theme copy at 45%

export const tabIcon = (Icon: QuadraIcon) =>
  function TabIcon({ focused, size = 26, testID }: TabIconProps) {
    const theme = useThemeColors();
    const muted = theme.scheme === 'dark' ? TAB_MUTED_DARK : TAB_MUTED_LIGHT;
    return <Icon testID={testID} size={size} color={focused ? theme.primaryFg : muted} />;
  };
