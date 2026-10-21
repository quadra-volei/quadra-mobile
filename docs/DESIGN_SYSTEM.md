# DESIGN_SYSTEM.md — Quadra Visual Language

> The visual law of the land. Every color, spacing, typography, and radius the app uses lives here.
> Always reference these tokens. Hardcoded hex values are not allowed.

> Source: the brand guide and palette of the original design prototype (removed from the repo on 2026-10-09; in git history under `docs/references/`). This file is now the reference.

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
| `text-muted` | `#62628A` | Secondary metadata (timestamps, captions, hex labels) |
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

### Match level badge (Iniciante, Intermediário, Avançado)

The level of a **match** is not the player level scale above. It has three values, so it takes
the first three colors of the priority rule, from the easiest level up, and the pair is the same
on every surface (`LEVEL_BADGE` in `src/features/matches/lib/levelBadge.ts`):

| Level | Fill | Label |
| --- | --- | --- |
| Iniciante | `accent` (lime) | navy |
| Intermediário | `primary` (blue) | white |
| Avançado | `tertiary` (orange) | navy |

On a cover the badge has a 1.5px white border, so it stands out from a cover of any tint, its own
blue included (DECISIONS #103). The
label is the level itself; a match has no "Casual" / "Competitivo" category.

### Position badges (PON, OPO, LEV, LIB, CEN, OUT)

Position abbreviations do **not** have individual fixed colors. The rule is contrast-based:

- On a **light surface** → abbreviation text/background uses `primary` (blue)
- On a **dark surface** → abbreviation text is `white`

---

## Gradients

Gradients are for **surfaces only** (hero areas, covers, the level-elite badge). **A button never
carries a gradient** (see "Buttons", DECISIONS #69).

- **Hero** — navy → blue (`HERO_GRADIENT` in `src/theme/colors.ts`).
- **Brand** — blue → lime (`CTA_GRADIENT`): progress accents, never a button fill.

---

## Typography

Four font families, each with a distinct role. **This replaces the previous "system sans-serif" decision** — the brand identity is built around these specific faces.

| Family | Role | Notes |
| --- | --- | --- |
| **Climate Crisis** | Display — screen titles, hero headlines | **Always uppercase**, letter-spacing 0, weight 400. Loaded from local TTF (`ClimateCrisis-Regular-VariableFont_YEAR.ttf`). |
| **Russo One** | Numbers — scores, stats, levels, overall | weight 400. Google Font. |
| **DM Sans** | Interface — body, buttons, labels, all UI text | weights 400/500/600/700/800. Google Font. |
| **DM Mono** | Micro-labels — tags, captions, technical legends | weights 400/500. Google Font. |

### Font loading (implementation note)

These are **not** system fonts, so they must be bundled:

- `Climate Crisis`: local asset, load via `expo-font` (`useFonts`)
- `Russo One`, `DM Sans`, `DM Mono`: via `@expo-google-fonts/*` packages

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
> **Rollout status:** done — `text-h1` / `text-h2` resolve to 18/14 on every
> screen (DECISIONS #47). Size tokens carry no `fontWeight`.
| `text-body` | DM Sans | 14–15px | normal | 400 | Default body |
| `text-body-bold` | DM Sans | 14–15px | normal | 600 | Emphasis in body |
| `text-eyebrow` | DM Sans | 11px | UPPERCASE | 700 | Eyebrow / overline label, letter-spacing 1.2 |
| `text-caption` | DM Sans | 11–12px | normal | 400 | Metadata, muted captions |
| `text-mono` | DM Mono | 10–11.5px | UPPERCASE (for tags) | 500/700 | Tags, pills, technical legends |
| `text-num` | Russo One | varies | normal | 400 | Scores, stats, level/overall numbers |
| `text-score` | Russo One | 96px | normal | 400 | The points on the live scoreboard only |

> **On navy surfaces** secondary text is `text-white/70`, never `text-text-muted` (about 3:1 on
> navy), and buttons are `outlineW` / `outlineLime`, never `outline` / `ghost` (DECISIONS #57).

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
| `HARD_SHADOW` | `3px 3px 0 0` navy (`surface-dark`), no blur | Buttons, round buttons and selection cards (see "Buttons") |
| `shadow-modal` | tuned per `tailwind.config.js` | Bottom sheets and modals |

Implementation: NativeWind shadow utilities, tuned in `tailwind.config.js`. Don't write raw `boxShadow` strings.
The one exception is `HARD_SHADOW` (`src/theme/colors.ts`), always applied as `style={HARD_SHADOW}`: a
NativeWind shadow class becomes Android elevation, which is blurred and cannot be offset.

---

## Buttons

**The rule (DECISIONS #69): every button is a flat fill + a thick navy border + a hard shadow.**

- **Fill**: one flat color. No gradient, ever.
- **Border**: 2px, navy (`border-2 border-surface-dark`).
- **Shadow**: `HARD_SHADOW`, navy, shifted down and to the right, no blur.
- **Label**: DM Sans 700 (`font-body-bold`), navy on lime/white, white on blue/red.
- Corners `rounded-btn` (18px), tap height ~48px. Disabled: grey fill (`line`), muted label, border kept, no shadow (DECISIONS #86); the transparent variants fade to 50% opacity instead.

| Variant | Style | Example | Role |
| --- | --- | --- | --- |
| `grad` | lime (`accent`) fill, navy label | "Jogar" | Main CTA of the screen (the name is historical: it was the gradient) |
| `primary` | blue (`primary`) fill, white label | "Confirmar presença" | Affirmative action next to a lime CTA |
| `outline` | white fill, navy label | "Buscar jogo", "Entrar com Google" | Secondary action on light bg |
| `outlineW` | transparent, white 2px border + label, no shadow | "Voltar ao início" | Secondary action on navy bg |
| `outlineLime` | transparent, lime 2px border + label, no shadow | — | Same, lime emphasis on navy bg |
| `ghost` | transparent, `primary` label, 600 weight, no border | "Ver tudo" | Tertiary text link (not a button shape, so outside the rule) |

The same rule covers everything that is pressed like a button:

- **Round buttons** (map recenter, stepper +/−): flat
  fill + 2px navy border; the hard shadow from 56px up (below that it only smudges).
- **Icon buttons in a box** (`IconButton`: the bell, settings and "+" of the tab headers): 40px
  white square, `rounded-chip`, 2px navy border + `HARD_SHADOW`, 20px icon. The back chevron of
  `BackHeader` stays a bare icon.
- **Selection cards** (onboarding level / modality): the **selected** card takes the
  2px navy border + `HARD_SHADOW` and a pale lime fill (`bg-accent/20`), with a lime check
  circle; unselected cards stay plain white with `shadow-card`.
- **Position cards** (onboarding step 1, DECISIONS #85): white, `rounded-btn`, 2px `line`
  border and a soft 4px hard shadow; the **selected** card takes a blue (`primary`) border and
  shadow, a pale blue fill (`bg-light-alt`), a blue icon box and a lime check in its radio.
- **Home hero** (empty Home only): a portrait 4:5 blue (`primary`) card filled by `HomeHeroArt`,
  a lime eyebrow on top, "BORA PRA QUADRA?" in display type (white + lime) and translucent white
  chips at the bottom; no buttons (DECISIONS #100, #102).
- **Cover filter**: a match cover photo always carries its level tint (55%) fading into navy
  (60%), `COVER_FILTER_ALPHA` in `src/theme/colors.ts` (DECISIONS #103).
- **Tab bar "+"** and **`CreateSheet`**: the lime round "+" and the sheet's two wide options
  ("Criar partida" lime, "Criar publicação" white) carry the border and shadow; the sheet card
  has the 2px navy border and the shadow too (DECISIONS #98).
- **Dialog** (`Dialog.tsx`): lime for the action, red (`danger`) for `destructive`, both with the
  border and shadow; `ghost` for `cancel`.
- **On navy** the navy border and shadow cannot be seen, so `outlineW` / `outlineLime` carry a
  light border and no shadow.
- A button written by hand (a `Pressable`) follows the same three parts; prefer `<Button>`.

Icons are used **only** when they add meaning (share, sortear/shuffle). Direct-action CTAs stay icon-free.

---

## Tags & pills

- Font: DM Mono or DM Sans, weight 700, size 10px, letter-spacing 1, **uppercase**
- Radius: `rounded-pill` (20px+)
- Examples: "VOCÊ ORGANIZA", "CONFIRMADO", "4X4"

### Selectable chips

A chip that is pressed to select (`FilterChip`, the weekday chips, the feedback tiles) is white
with dark text and turns **blue (`primary`) with a white label** when selected (about 8:1). The
selected colors are **inline styles from `src/theme/colors.ts`, never a className switched on
state**: a className changed after the first render is not applied reliably, and the dark label
stayed on the blue fill (DECISIONS #87).

---

## Iconography

Hybrid approach:

- **General UI icons** (bell, search, chevrons, settings, etc.): `lucide-react-native`, default size 24, stroke 1.75, color via NativeWind token.
- **Brand-specific icons** (logo mark, bottom-nav icons): SVG components in `src/components/icons/` (ported from the prototype's SVGs, which are no longer in the repo).

Forbidden: importing PNG icons inline.

---

## Logo & wordmark

- Symbol: three overlapping rounded blocks in motion, blue + lime (`QuadraLogo`, SVG, for the
  splash mark).
- Lockup (symbol + "quadra"): always the designer's official PNGs in `assets/logo/`, through
  `QuadraWordmark` (`blue`: blue + lime on dark/blue, login and SMS code; `light`: light blocks
  + lime on dark card finishes; `navy`: navy + lime on light surfaces). The wordmark is never
  typed in a font (Baloo 2 was removed, DECISIONS #146).
- Never recolor, never recase, never redraw the lockup: pick the variant made for the background.

---

## Visual personality cues

For agents producing screen specs, the Quadra identity has these traits:

- **Organic shapes in backgrounds** — blue blobs and lime waves on splash/login screens. Treat them as decorative SVG/blur layers, not photographic.
- **Dark hero areas** with light copy — used for stats, ranking, and key data moments (navy gradient `linear-gradient(165deg, #0c0c52 0%, #0A0A3C 55%, #08083a 100%)`).
- **Pill-shaped badges** with strong color contrast for positions (PON, OPO, LEV, LIB, etc.) and tags (Iniciante, 4X4, Confirmado).
- **Strong CTAs** — solid lime with a thick navy border and a hard shadow — never subtle. Buttons in Quadra are confident.
- **Image-forward match cards** — every match card shows the venue photo with overlaid metadata.
- **Display type is always uppercase** — Climate Crisis never renders in mixed/lower case.

---

## Chrome, states and touch

- **No glass.** Header and tab bar are solid surfaces with a hairline (`border-line`); no backdrop blur (DECISIONS #46). The only blur is the backdrop behind `CreateSheet` (DECISIONS #98).
- **Loading**: `SkeletonBlock`, sized to the content it replaces, slow opacity pulse.
- **Empty / error**: `StateMessage` — one body-size line and at most one action.
- **Press feedback**: `PressableScale` (a slight shrink to 0.97 and fade to 0.85, 120 ms), never Android's ripple. Underline tabs take no press feedback: the sliding underline is the feedback. Bare 24px icons take `hitSlop={ICON_HIT_SLOP}`.
- **Motion**: every duration and curve comes from `MOTION` in `src/theme/motion.ts` (ease-out cubic; press 120 ms, tab underline and label color 220 ms, content fade-in 180 ms). Stack screens slide in from the right (`ios_from_right`, `STACK_OPTIONS`); the splash / login / tabs swap and the navbar tabs fade. Reanimated animations follow the system "remove animations" setting (DECISIONS #109).

---

## What is NOT yet specified

These will be added when relevant. Until then, agents must ask:

- Dark mode tokens (the app currently designs light-first)
- Empty-state illustrations
- Pull-to-refresh styling
