// Light and dark values of the colors that change with the theme (DECISIONS #203,
// DESIGN_SYSTEM "Dark theme"). `global.css` repeats them as CSS variables for the
// NativeWind classes (`bg-card`, `text-text-primary`, …); `tests/theme/palette.test.ts`
// fails if the two drift apart. Brand colors that never change (blue, lime, orange,
// purple, white, the navy of text on lime) stay in `colors.ts`.
//
// Dark is not an inverted light theme: it is the brand's navy at night. The
// background is a deep navy, cards and panels are lighter navies (elevation by
// lightness, since a shadow cannot be seen on dark), copy is a blue-tinted white,
// blue text is lifted to a periwinkle that reads on navy, and lime stays lime.

export type ColorSchemeName = 'light' | 'dark';

export type ThemePalette = {
  /** App background (`bg-light`). */
  bg: string;
  /** Skeletons, input fills, pale selected fills (`bg-light-alt`). */
  bgAlt: string;
  /** Cards, sheets, inputs, the tab bar (`bg-card`; was `bg-white`). */
  card: string;
  /** Navy hero panels: ranking, collection strip, stats (`bg-surface-dark`). */
  surface: string;
  /** Secondary navy panels and skeletons on navy (`bg-surface-dark-alt`). */
  surfaceAlt: string;
  /** Main copy (`text-text-primary`). */
  text: string;
  /** Secondary copy and muted icons (`text-text-muted`). */
  muted: string;
  /** Navy-as-foreground: titles and icons on cards (`text-ink`). */
  ink: string;
  /** Blue as text, link, icon or selected border (`text-primary-fg`). */
  primaryFg: string;
  /** Red as text or icon (`text-danger-fg`). The red fill stays `danger`. */
  dangerFg: string;
  /** Green as text or icon (`text-success-fg`). */
  successFg: string;
  /** The 2px border of buttons and selection cards (`border-edge`). */
  edge: string;
  /** The hard offset shadow (`useThemeColors().hardShadow`). */
  shadow: string;
  /** Hairlines and the disabled-button fill (`line`). */
  line: string;
};

export const PALETTES: Record<ColorSchemeName, ThemePalette> = {
  light: {
    bg: '#EFF3FC',
    bgAlt: '#E8EEF8',
    card: '#FFFFFF',
    surface: '#0A0A3C',
    surfaceAlt: '#111145',
    text: '#1A1A2E',
    muted: '#62628A',
    ink: '#0A0A3C',
    primaryFg: '#1A1AFF',
    dangerFg: '#DC2626',
    successFg: '#16A34A',
    edge: '#0A0A3C',
    shadow: '#0A0A3C',
    line: 'rgba(10,10,60,0.10)',
  },
  dark: {
    bg: '#08081F',
    bgAlt: '#1F1F58',
    card: '#17174A',
    surface: '#1C1C6E',
    surfaceAlt: '#25257E',
    text: '#EEF0FF',
    muted: '#A3A5CC',
    ink: '#EEF0FF',
    primaryFg: '#9494FF',
    dangerFg: '#F87171',
    successFg: '#4ADE80',
    edge: '#03030F',
    shadow: '#1A1AFF',
    line: 'rgba(255,255,255,0.12)',
  },
};

/** CSS variable name of each palette key, as written in `global.css`. */
export const CSS_VARIABLES: Record<keyof ThemePalette, string> = {
  bg: '--color-bg',
  bgAlt: '--color-bg-alt',
  card: '--color-card',
  surface: '--color-surface',
  surfaceAlt: '--color-surface-alt',
  text: '--color-text',
  muted: '--color-muted',
  ink: '--color-ink',
  primaryFg: '--color-primary-fg',
  dangerFg: '--color-danger-fg',
  successFg: '--color-success-fg',
  edge: '--color-edge',
  shadow: '--color-shadow',
  line: '--color-line',
};

/** '#RRGGBB' → 'R G B', the form the Tailwind colors read (`rgb(var(--x) / <alpha>)`). */
export function toRgbChannels(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** The CSS variables of one palette, in the form `global.css` writes them. */
export function paletteVariables(palette: ThemePalette): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(CSS_VARIABLES) as (keyof ThemePalette)[]) {
    const value = palette[key];
    out[CSS_VARIABLES[key]] = value.startsWith('#') ? toRgbChannels(value) : value;
  }
  return out;
}
