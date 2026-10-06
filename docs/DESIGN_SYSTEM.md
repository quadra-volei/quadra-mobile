# DESIGN_SYSTEM.md — Quadra Visual Language

> The visual law of the land. Every color, spacing, typography, and radius the app uses lives here.
> Always reference these tokens. Hardcoded hex values are not allowed.

> Source: `Identidade Visual.html` (brand guide) + `data.js` (QUADRA palette object) from the Claude Design prototype.

---

## Color tokens

These map directly to `tailwind.config.js` and become NativeWind classes (e.g. `bg-primary`, `text-accent`).

### Brand priority palette

The brand defines a **fixed priority order** for accent colors. When a UI needs more than one accent (categories, tags, charts), use them in this order — never skip ahead.

| Token | Hex | Priority | Use |
| --- | --- | --- | --- |
| `primary` | `#1A1AFF` | 1st | Base color of the brand. CTAs, active states, links — the foundation of everything. |
| `primary-dark` | `#0D0D9E` | — | Pressed states, gradient end on dark surfaces |
| `accent` | `#AADD00` | 2nd | Energy accent. Success, highlights, secondary color. |
| `accent-light` | `#C6F135` | — | Highlights, badges, brighter lime variant |
| `tertiary` | `#FF6B00` | 3rd | Orange — only when 3+ categories need distinguishing |
| `quaternary` | `#6B1AFF` | 4th | Violet — **last resort only**. Never used as a standalone secondary accent. |

> ⚠️ **Priority rule**: blue → lime → orange → violet. The level-tier scale and position colors below are fixed exceptions and sit outside this rule.

### Surfaces

| Token | Hex | Use |
| --- | --- | --- |
| `bg-light` | `#EFF3FC` | Default screen background (light mode) |
| `bg-light-alt` | `#E8EEF8` | Alternate light surface (subtle cards) |
| `surface-dark` | `#0A0A3C` | Navy — dark cards, hero areas, ranking |
| `surface-dark-alt` | `#111145` | Mid Navy — bottom nav, secondary dark surfaces |
| `white` | `#FFFFFF` | Always available |

### Text

| Token | Hex | Use |
| --- | --- | --- |
| `text-primary` | `#1A1A2E` | Main copy on light surfaces |
| `text-on-dark` | `#FFFFFF` | Copy on dark surfaces |
| `text-muted` | `#7A7A9A` | Secondary metadata (timestamps, captions, hex labels) |
| `line` | `rgba(10,10,60,0.10)` | Hairline borders/dividers on light surfaces |

### Semantic (system states — not part of the brand palette)

| Token | Hex | Use |
| --- | --- | --- |
| `success` | `#16A34A` | Confirmation states |
| `warning` | `#F59E0B` | Attention without blocking |
| `danger` | `#DC2626` | Errors, destructive actions |
| `info` | `#3B82F6` | Informational badges |

### Player level scale (fixed — do not reuse for anything else)

The dot/badge color next to a player's level is determined by their tier. These pairs are fixed by the brand guide and sit **outside** the priority rule above.

| Tier | Range | Color |
| --- | --- | --- |
| `level-1` | 1–5 | `#00B4D8` (cyan) |
| `level-2` | 5–15 | `#FF6B00` (orange) |
| `level-3` | 15–30 | `#1A1AFF` (blue) |
| `level-4` | 30–50 | `#AADD00` (lime) |
| `level-5` | 50–75 | `#6B1AFF` (violet) |
| `level-elite` | 75+ | gradient `#AADD00 → #1A1AFF` (lime → blue) |

> `#00B4D8` (cyan) is **only** valid for `level-1`. Do not use it as a general UI accent.

### Position badges (PON, OPO, LEV, LIB, CEN, OUT)

Position abbreviations do **not** have individual fixed colors. The rule is contrast-based:

- On a **light surface** → abbreviation text/background uses `primary` (blue)
- On a **dark surface** → abbreviation text is `white`

---

## Gradients

Defined as utilities `bg-gradient-cta`, `bg-gradient-primary`, `bg-gradient-cta-pressed`:

- **`bg-gradient-cta`** — `linear-gradient(120deg, #1A1AFF, #AADD00)` (blue → lime). The **main CTA** of any screen: "Jogar", "Criar partida", "Ver a sua carta", "Começar partida". Shadow: `0 4px 16px rgba(170,221,0,.30)`.
- **`bg-gradient-primary`** — `linear-gradient(120deg, #0A0A3C, #1A1AFF)` (navy → blue). Affirmative action on a light background when the brand gradient doesn't fit: "Confirmar presença", "Entrar na Quadra". Shadow: `0 4px 16px rgba(26,26,255,.28)`.
- **`bg-gradient-cta-pressed`** — either gradient above, darkened ~10% for press feedback.

NativeWind 4 supports gradients via `expo-linear-gradient` wrapped in a custom `<GradientButton>` component. See `COMPONENTS.md`.

---

## Typography

Five font families, each with a distinct role. **This replaces the previous "system sans-serif" decision** — the brand identity is built around these specific faces.

| Family | Role | Notes |
| --- | --- | --- |
| **Climate Crisis** | Display — screen titles, hero headlines | **Always uppercase**, letter-spacing 0, weight 400. Loaded from local TTF (`ClimateCrisis-Regular-VariableFont_YEAR.ttf`). |
| **Russo One** | Numbers — scores, stats, levels, overall | weight 400. Google Font. |
| **DM Sans** | Interface — body, buttons, labels, all UI text | weights 400/500/600/700/800. Google Font. |
| **Baloo 2** | Wordmark — exclusive to the "quadra" logo lockup | weight 600. **Do not use for anything else.** Google Font. |
| **DM Mono** | Micro-labels — tags, captions, technical legends | weights 400/500. Google Font. |

### Font loading (implementation note)

These are **not** system fonts, so they must be bundled:

- `Climate Crisis`: local asset, load via `expo-font` (`useFonts`)
- `Russo One`, `DM Sans`, `Baloo 2`, `DM Mono`: via `@expo-google-fonts/*` packages

> ⚠️ This requires adding new dependencies to `CLAUDE.md`'s locked stack (`expo-font` + the relevant `@expo-google-fonts/*` packages + the Climate Crisis `.ttf` asset). Flag this to the human before the first screen spec that needs custom type — it's a stack change per `CLAUDE.md` rules.

> **DM Sans weights are per-face family tokens, not `fontWeight`.** In React
> Native a numeric `fontWeight` does **not** switch a named font face — you must
> reference the weight's own family. So DM Sans weights are exposed as distinct
> NativeWind font tokens; pick the className, never set `fontWeight`:
> `font-body` (400) · `font-body-medium` (500) · `font-body-semibold` (600) ·
> `font-body-bold` (700) · `font-body-extrabold` (800).

### Type scale (hierarchy)

| Token | Family | Size | Case | Weight | Use |
| --- | --- | --- | --- | --- | --- |
| `text-display` | Climate Crisis | 29–46px | UPPERCASE | 400 | Hero / splash headline |
| `text-h1` | Climate Crisis | 18px | UPPERCASE | 400 | **Screen header — top of screen only** (e.g. "INÍCIO", "CONFIGURAÇÕES") |
| `text-h2` | Climate Crisis | 14px | UPPERCASE | 400 | **In-screen section title** (e.g. "PRÓXIMAS PARTIDAS", "JOGOS PERTO DE VOCÊ") |
| `text-h3` | DM Sans | 16–18px | normal | 800 | Card title |

> **Heading hierarchy** (per the `Quadra.html` prototype). A screen has exactly
> **one** screen header — Climate Crisis **18px** (prototype `Header`). Every
> other Climate Crisis heading in the screen body (section titles such as
> "PRÓXIMAS PARTIDAS") is **14px** (prototype `SectionTitle`) — same display
> face, one step smaller — so the screen header stays dominant. Both are
> `font-display` + `uppercase`; only the size differs.
>
> **Rollout status:** S5 Home applies these sizes (18/14) inline. The global
> `text-h1` / `text-h2` tokens still resolve to the pre-prototype 21/16px and
> will be re-pointed to 18/14 once every screen header/section has been checked
> against the prototype — until then, don't assume the tokens match the table.
| `text-body` | DM Sans | 14–15px | normal | 400 | Default body |
| `text-body-bold` | DM Sans | 14–15px | normal | 600 | Emphasis in body |
| `text-eyebrow` | DM Sans | 11px | UPPERCASE | 700 | Eyebrow / overline label, letter-spacing 1.2 |
| `text-caption` | DM Sans | 11–12px | normal | 400 | Metadata, muted captions |
| `text-mono` | DM Mono | 10–11.5px | UPPERCASE (for tags) | 500/700 | Tags, pills, technical legends |
| `text-num` | Russo One | varies | normal | 400 | Scores, stats, level/overall numbers |

---

## Spacing scale

Tailwind's default scale (4px base), but **only these values are allowed**:

`0, 1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24` (mapped to `0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96 px`)

If a design needs `5` or `7`, snap to nearest. If genuinely needed, add to the token list with justification.

---

## Border radius

| Token | Value | Use |
| --- | --- | --- |
| `rounded-chip` | 14–18 | Chips, inputs, small fields |
| `rounded-card` | 20 | Cards (the brand default for cards) |
| `rounded-btn` | 18 | Buttons (all variants) |
| `rounded-pill` | 20+ | Pills, tags, badges |
| `rounded-full` | 9999 | Avatars, FAB, circular dots |

The Quadra style favors **generously rounded** elements — when in doubt, lean toward the larger radius.

---

## Shadows / elevation

| Token | Value | Use |
| --- | --- | --- |
| `shadow-card` | `0 2px 12px rgba(10,10,60,.06)` | Cards (subtle, blue-tinted) |
| `shadow-cta` | `0 4px 16px rgba(170,221,0,.30)` | Lime / gradient CTA buttons |
| `shadow-primary` | `0 4px 16px rgba(26,26,255,.28)` | Blue / navy→blue buttons |
| `shadow-fab` | `0 4px 16px rgba(26,26,255,.28)` | The central FAB on bottom nav |
| `shadow-modal` | tuned per `tailwind.config.js` | Bottom sheets and modals |

Implementation: NativeWind shadow utilities, tuned in `tailwind.config.js`. Don't write raw `boxShadow` strings.

---

## Buttons

Five variants, each with a distinct role. Corners `rounded-btn` (18px), weight 700, comfortable tap height (~48px).

| Variant | Style | Example | Role |
| --- | --- | --- | --- |
| `grad` | `bg-gradient-cta` (blue→lime), white text, `shadow-cta` | "Jogar" | Main CTA of the screen |
| `primary` | `bg-gradient-primary` (navy→blue), white text, `shadow-primary` | "Confirmar presença" | Affirmative action when the brand gradient doesn't fit |
| `outline` | transparent, `primary` border (2px) + text | "Procurar partidas" | Secondary action on light bg |
| `outlineW` | transparent, white border (2px) + text | "Voltar ao início" | Same as outline, but on navy/dark bg |
| `ghost` | transparent, `primary` text, 600 weight, no border | "Ver tudo" | Tertiary / low-emphasis links |

Icons are used **only** when they add meaning (share, sortear/shuffle). Direct-action CTAs stay icon-free.

---

## Tags & pills

- Font: DM Mono or DM Sans, weight 700, size 10px, letter-spacing 1, **uppercase**
- Radius: `rounded-pill` (20px+)
- Examples: "VOCÊ ORGANIZA", "CONFIRMADO", "4X4"

---

## Iconography

Hybrid approach:

- **General UI icons** (bell, search, chevrons, settings, etc.): `lucide-react-native`, default size 24, stroke 1.75, color via NativeWind token.
- **Brand-specific icons** (logo mark, bottom-nav icons, FAB "jogar" icon): custom SVGs from the prototype's `uploads/` folder (e.g. `Icone-quadra-logo.svg`, `Home.svg`, `Rede.svg`, `Perfil.svg`, `Explorar.svg`, `jogar.svg` + their `-selecionado`/`-active` states). Port these as SVG components into `src/components/icons/`.

Forbidden: importing PNG icons inline.

---

## Logo & wordmark

- Symbol: three overlapping rounded blocks in motion, blue + lime.
- Wordmark: "quadra", always **lowercase**, set in **Baloo 2** (weight 600).
- Never recolor, never recase the wordmark.

---

## Visual personality cues

For agents producing screen specs, the Quadra identity has these traits:

- **Organic shapes in backgrounds** — blue blobs and lime waves on splash/login screens. Treat them as decorative SVG/blur layers, not photographic.
- **Dark hero areas** with light copy — used for stats, ranking, and key data moments (navy gradient `linear-gradient(165deg, #0c0c52 0%, #0A0A3C 55%, #08083a 100%)`).
- **Pill-shaped badges** with strong color contrast for positions (PON, OPO, LEV, LIB, etc.) and tags (Pistache, Casual, Confirmado).
- **Strong CTAs** — gradient or solid lime — never subtle. Buttons in Quadra are confident.
- **Image-forward match cards** — every match card shows the venue photo with overlaid metadata.
- **Display type is always uppercase** — Climate Crisis never renders in mixed/lower case.

---

## What is NOT yet specified

These will be added when relevant. Until then, agents must ask:

- Dark mode tokens (the app currently designs light-first)
- Animation timing curves
- Skeleton/loading shapes
- Empty-state illustrations
- Pull-to-refresh styling
