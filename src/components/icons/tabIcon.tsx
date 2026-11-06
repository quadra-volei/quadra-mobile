import type { QuadraIcon } from './quadra';

// Shared bits for the bottom-nav icons (TabHomeIcon, TabExploreIcon, TabNetworkIcon,
// TabProfileIcon). Active = flat brand blue (no gradient, DECISIONS #69); inactive = muted navy
// at 40%. Colors are fixed brand values and intentionally not themeable, like QuadraLogo/GoogleMark.

export type TabIconProps = {
  /** Active tab → flat brand blue; inactive → muted navy at 40%. */
  focused?: boolean;
  size?: number;
  testID?: string;
};

const TAB_ACTIVE = '#1A1AFF'; // primary
const TAB_MUTED = '#0E193566'; // 40% alpha

export const tabIcon =
  (Icon: QuadraIcon) =>
  ({ focused, size = 26, testID }: TabIconProps) => (
    <Icon testID={testID} size={size} color={focused ? TAB_ACTIVE : TAB_MUTED} />
  );
