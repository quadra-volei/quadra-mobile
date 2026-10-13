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

// Press feedback is Android's own ripple (the app targets Android), navy-tinted
// so it reads as part of the palette. `foreground` draws it over image covers.
// ponytail: iOS gets no press feedback; add a pressed-opacity style when iOS ships.
export const PRESS_RIPPLE = { color: 'rgba(10,10,60,0.10)', foreground: true } as const;
// Same, for surfaces that are already navy.
export const PRESS_RIPPLE_ON_DARK = { color: 'rgba(255,255,255,0.16)', foreground: true } as const;
// Round ripple for bare 24px icons (header actions, tab icons).
export const ICON_RIPPLE = { color: 'rgba(10,10,60,0.10)', borderless: true, radius: 22 } as const;
// Grows a bare 24px icon to Android's 48dp minimum touch target.
export const ICON_HIT_SLOP = 12;
