// Mirrors tailwind.config.js theme.extend.colors — one source of truth for
// color values needed at runtime by non-NativeWind props (lucide `color`,
// LinearGradient `colors`). Screens NEVER inline hex; they import from here.
export const colors = {
  surfaceDark: '#0A0A3C', // surface-dark / navy (court-image gradient end)
  surfaceDarkAlt: '#111145', // surface-dark-alt (skeleton fill on navy)
  bgLightAlt: '#E8EEF8', // bg-light-alt (skeleton fill on light)
  primary: '#1A1AFF', // primary
  accent: '#AADD00', // accent (lime)
  accentLight: '#C6F135', // accent-light / brightLime (nearby distance + price)
  tertiary: '#FF6B00', // tertiary / orange (advanced-level badge)
  textOnDark: '#FFFFFF', // text-on-dark / white (icon on dark)
  textMuted: '#62628A', // text-muted (muted lucide icons: clock, users)
  success: '#16A34A', // success (trend-up arrow)
  danger: '#DC2626', // danger (trend-down arrow)
} as const;

// The hard offset shadow of buttons and selection cards (DESIGN_SYSTEM
// "Buttons"): navy, no blur. Always an inline style: NativeWind turns a shadow
// class into Android elevation, which is blurred and cannot be offset.
export const HARD_SHADOW = { boxShadow: `3px 3px 0 0 ${colors.surfaceDark}` } as const;

// Navy → blue brand hero gradient, derived from the tokens above.
export const HERO_GRADIENT = [colors.surfaceDark, colors.primary] as const;

// Blue → lime brand gradient, derived from the tokens. Never a button fill.
export const CTA_GRADIENT = [colors.primary, colors.accent] as const;

// S12 match-detail cover scrim. Darkens the top of the court image (so the
// status bar + back/share icons stay legible) and its bottom (so the tags,
// title and venue line stay legible) over any `tint`. surface-dark at varying
// alpha — the prototype's cover overlay, expressed over the token.
export const COVER_SCRIM = [
  'rgba(10,10,60,0.35)',
  'rgba(10,10,60,0)',
  'rgba(10,10,60,0.55)',
] as const;
export const COVER_SCRIM_LOCATIONS = [0, 0.3, 1] as const;
