// Mirrors tailwind.config.js theme.extend.colors — one source of truth for
// color values needed at runtime by non-NativeWind props (lucide `color`,
// LinearGradient `colors`). Screens NEVER inline hex; they import from here.
export const colors = {
  surfaceDark: '#0A0A3C', // surface-dark
  primary: '#1A1AFF', // primary
  accent: '#AADD00', // accent (lime)
  textOnDark: '#FFFFFF', // text-on-dark / white (icon on dark)
  textMuted: '#7A7A9A', // text-muted (muted lucide icons: clock, users)
  danger: '#DC2626', // danger
} as const;

// Navy → blue brand hero gradient, derived from the tokens above.
export const HERO_GRADIENT = [colors.surfaceDark, colors.primary] as const;

// Blue → lime brand CTA gradient (bg-gradient-cta), derived from the tokens.
export const CTA_GRADIENT = [colors.primary, colors.accent] as const;
