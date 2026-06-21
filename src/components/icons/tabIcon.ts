// Shared bits for the brand bottom-nav icons (TabHomeIcon, TabExploreIcon,
// TabNetworkIcon, TabProfileIcon). Active = blue→lime brand gradient; inactive =
// muted navy at 40% (matches the prototype SVGs in docs/uploads/*). Colors are
// fixed brand values and intentionally not themeable, like QuadraLogo/GoogleMark.

export type TabIconProps = {
  /** Active tab → blue→lime brand gradient; inactive → muted navy at 40%. */
  focused?: boolean;
  size?: number;
  testID?: string;
};

export const TAB_GRAD_START = '#0032D1';
export const TAB_GRAD_END = '#ACEA00';
export const TAB_MUTED = '#0E1935';
export const TAB_MUTED_OPACITY = 0.4;
