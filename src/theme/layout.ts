// Shared layout constants for the tab navigator chrome.

// Vertical space a scroll screen must reserve at its bottom so content ends
// ABOVE the floating glass tab bar (Instagram-style gap) instead of sliding
// under it. Measured from the top of the safe-area inset, it covers the pill's
// bottom margin (12), the pill height (64), the poking "Jogar" FAB (18 above
// the pill) and a breathing gap (~24). Add `insets.bottom` on top so the
// reserve is correct on both gesture- and button-navigation devices:
//
//   paddingBottom: insets.bottom + TAB_BAR_CLEARANCE
export const TAB_BAR_CLEARANCE = 118;
