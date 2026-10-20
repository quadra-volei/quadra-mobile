// Shared bits for the brand bottom-nav icons (TabHomeIcon, TabExploreIcon,
// TabNetworkIcon, TabProfileIcon). Active = flat brand blue (no gradient, DECISIONS #69); inactive =
// muted navy at 40% (matches the prototype SVGs in docs/uploads/*). Colors are
// fixed brand values and intentionally not themeable, like QuadraLogo/GoogleMark.

export type TabIconProps = {
  /** Active tab → flat brand blue; inactive → muted navy at 40%. */
  focused?: boolean;
  size?: number;
  testID?: string;
};

export const TAB_ACTIVE = '#1A1AFF'; // primary
export const TAB_MUTED = '#0E1935';
export const TAB_MUTED_OPACITY = 0.4;
