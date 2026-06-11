# DESIGN_SYSTEM.md — Quadra Visual Language

> The visual law of the land. Every color, spacing, typography, and radius the app uses lives here.
> Agents MUST reference these tokens. Hardcoded hex values are REJECTED by the scope-guardian.

> Source: extracted from product mockups (Splash, Login, Home, Explore, Profile) and `Detalhes_do_app`.

---

## Color tokens

These map directly to `tailwind.config.js` and become NativeWind classes (e.g. `bg-primary`, `text-accent`).

### Primary palette

| Token | Hex | Use |
| --- | --- | --- |
| `primary` | `#1A1AFF` | Main royal blue — primary CTAs, brand |
| `primary-dark` | `#0D0D9E` | Pressed states, gradients |
| `accent` | `#AADD00` | Lime green — secondary CTAs, success accents |
| `accent-light` | `#C6F135` | Highlights, badges |

### Surfaces

| Token | Hex | Use |
| --- | --- | --- |
| `bg-light` | `#EFF3FC` | Default screen background (light mode) |
| `bg-light-alt` | `#E8EEF8` | Alternate light surface (subtle cards) |
| `surface-dark` | `#0A0A3C` | Dark cards (Home FAB area, ranking) |
| `surface-dark-alt` | `#111145` | Bottom nav, secondary dark surfaces |
| `white` | `#FFFFFF` | Always available |

### Text

| Token | Hex | Use |
| --- | --- | --- |
| `text-primary` | `#1A1A2E` | Main copy on light surfaces |
| `text-on-dark` | `#FFFFFF` | Copy on dark surfaces |
| `text-muted` | `#6B7280` | Secondary metadata (timestamps, captions) |

### Semantic

| Token | Hex | Use |
| --- | --- | --- |
| `success` | `#16A34A` | Confirmation states |
| `warning` | `#F59E0B` | Attention without blocking |
| `danger` | `#DC2626` | Errors, destructive actions |
| `info` | `#3B82F6` | Informational badges |

---

## Gradients

Defined as utilities `bg-gradient-cta` and `bg-gradient-cta-pressed`:

- **`bg-gradient-cta`**: linear, from `primary` → `accent` (used on the "Criar partida" / "Entrar na Quadra" button)
- **`bg-gradient-cta-pressed`**: same, but darker by ~10% — used on press feedback

NativeWind 4 supports gradients via `expo-linear-gradient` wrapped in a custom `<GradientButton>` component. See `COMPONENTS.md`.

---

## Typography

Font family: **System sans-serif** (San Francisco on iOS, Roboto on Android). Modern, bold for headings.

| Token | Size | Line height | Weight | Use |
| --- | --- | --- | --- | --- |
| `text-display` | 32 | 40 | 700 | Splash, large hero numbers |
| `text-h1` | 24 | 32 | 700 | Screen title |
| `text-h2` | 20 | 28 | 700 | Section title (e.g. "Próximas partidas") |
| `text-h3` | 18 | 24 | 600 | Card title |
| `text-body` | 16 | 24 | 400 | Default body |
| `text-body-bold` | 16 | 24 | 600 | Emphasis in body |
| `text-caption` | 13 | 18 | 400 | Metadata, distance, time |
| `text-mini` | 11 | 14 | 500 | Tags, badge labels |

---

## Spacing scale

Tailwind's default scale (4px base), but **only these values are allowed**:

`0, 1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24` (mapped to `0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96 px`)

If a design needs `5` or `7`, snap to nearest. If genuinely needed, add to the token list with justification.

---

## Border radius

| Token | Value | Use |
| --- | --- | --- |
| `rounded-sm` | 6 | Small badges |
| `rounded-md` | 12 | Inputs, small buttons |
| `rounded-lg` | 16 | Cards |
| `rounded-xl` | 24 | Large CTAs, modal sheets |
| `rounded-full` | 9999 | Pills, avatars, FAB |

The Quadra style favors **generously rounded** elements — when in doubt, lean toward the larger radius.

---

## Shadows / elevation

| Token | Use |
| --- | --- |
| `shadow-card` | Cards (subtle, blue-tinted) |
| `shadow-fab` | The central FAB on bottom nav (more pronounced) |
| `shadow-modal` | Bottom sheets and modals |

Implementation: NativeWind shadow utilities, tuned in `tailwind.config.js`. Don't write raw `boxShadow` strings.

---

## Iconography

- Library: `lucide-react-native`
- Default size: 24
- Default stroke: 1.75
- Color: matches surrounding text color via `color={...}` prop bound to NativeWind token

Forbidden: importing PNG icons inline. If a custom icon is needed, add it to `src/components/icons/` as an SVG component.

---

## Visual personality cues

For agents producing screen specs, the Quadra identity has these traits:

- **Organic shapes in backgrounds** — blue blobs and lime waves on splash/login screens. Treat them as decorative SVG layers, not photographic.
- **Dark hero areas** with light copy — used for stats, ranking, and key data moments.
- **Pill-shaped badges** with strong color contrast for positions (PON, OPO, LEV, LIB, etc.) and tags (Pistache, Casual).
- **Strong CTAs** — gradient or solid lime — never subtle. Buttons in Quadra are confident.
- **Image-forward match cards** — every match card shows the venue photo with overlaid metadata.

---

## What is NOT yet specified

These will be added when relevant. Until then, agents must ask:

- Dark mode tokens (the app currently designs light-first)
- Animation timing curves
- Skeleton/loading shapes
- Empty-state illustrations
- Pull-to-refresh styling
