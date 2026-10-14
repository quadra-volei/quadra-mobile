// Shared layout constants for the tab navigator chrome and touch feedback.

// Vertical space a scroll screen must reserve at its bottom so content ends
// ABOVE the floating tab bar (Instagram-style gap) instead of sliding
// under it. Measured from the top of the safe-area inset, it covers the pill's
// bottom margin (12), the pill height (64) and a breathing gap (24). Add
// `insets.bottom` on top so the reserve is correct on both gesture- and
// button-navigation devices:
//
//   paddingBottom: insets.bottom + TAB_BAR_CLEARANCE
export const TAB_BAR_CLEARANCE = 100;

// Press feedback is PressableScale (a slight shrink + fade, src/theme/motion.ts),
// not Android's ripple, which flashed a grey background (DECISIONS #109).

// Grows a bare 24px icon to Android's 48dp minimum touch target.
export const ICON_HIT_SLOP = 12;
