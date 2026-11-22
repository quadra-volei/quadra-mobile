import { CSS_VARIABLES, PALETTES, paletteVariables, type ThemePalette } from '@/theme/palette';

// global.css repeats src/theme/palette.ts as CSS variables (DECISIONS #203): the
// classNames read the CSS, the runtime props (icons, gradients) read the TS. This
// test keeps the two from drifting apart.

// Node's fs through jest's require (the app's tsconfig has no Node types).
declare const require: (id: 'fs') => { readFileSync(path: string, encoding: 'utf8'): string };
declare const __dirname: string;
const css = require('fs').readFileSync(`${__dirname}/../../global.css`, 'utf8');

function block(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [, name, value] of source.matchAll(/(--color-[a-z-]+):\s*([^;]+);/g)) {
    if (name && value) out[name] = value.trim();
  }
  return out;
}

const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
const lightCss = block(css.slice(0, darkStart));
const darkCss = block(css.slice(darkStart));

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

function contrast(a: string, b: string): number {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
}

describe('theme palette', () => {
  it('global.css :root matches the light palette', () => {
    expect(lightCss).toEqual(paletteVariables(PALETTES.light));
  });

  it('global.css dark block matches the dark palette', () => {
    expect(darkCss).toEqual(paletteVariables(PALETTES.dark));
  });

  it('defines every palette key in both themes', () => {
    for (const key of Object.keys(CSS_VARIABLES) as (keyof ThemePalette)[]) {
      expect(PALETTES.light[key]).toBeTruthy();
      expect(PALETTES.dark[key]).toBeTruthy();
    }
  });

  // WCAG 2.1 AA: 4.5:1 for body copy on the surfaces it sits on, in both themes.
  it.each(['light', 'dark'] as const)('keeps copy at AA contrast in %s', (scheme) => {
    const p = PALETTES[scheme];
    for (const surface of [p.bg, p.card, p.bgAlt]) {
      expect(contrast(p.text, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.muted, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.ink, surface)).toBeGreaterThanOrEqual(4.5);
    }
    for (const surface of [p.bg, p.card]) {
      expect(contrast(p.primaryFg, surface)).toBeGreaterThanOrEqual(4.5);
    }
    // Red copy sits on cards (errors, "Excluir conta"); on the light background it is
    // 4.35:1, as before this change.
    expect(contrast(p.dangerFg, p.card)).toBeGreaterThanOrEqual(4.5);
  });
});
