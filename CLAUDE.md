# CLAUDE.md — Quadra Mobile

> Inviolable rules for every agent working in this repo.
> Read this before writing a single line of code.

---

## Locked stack

| Category | Package | Version |
|---|---|---|
| Runtime | expo | ~56.0.9 |
| Runtime | react | 19.2.3 |
| Runtime | react-native | 0.85.3 |
| Routing | expo-router | ~56.2.9 |
| Styling | nativewind | ^4.2.5 |
| Styling | tailwindcss | ^3.4.19 |
| Server state | @tanstack/react-query | ^5.101.0 |
| Client state | zustand | ^5.0.14 |
| Auth storage | expo-secure-store | ~56.0.4 |
| Realtime | @microsoft/signalr | ^8.0.17 |
| Gestures | react-native-gesture-handler | ~2.31.1 |
| Animation | react-native-reanimated | 4.3.1 |
| Worklets | react-native-worklets | ~0.9.2 |
| Safe area | react-native-safe-area-context | ~5.7.0 |
| Screens | react-native-screens | 4.25.2 |
| Maps | react-native-maps | 1.27.2 |
| SVG | react-native-svg | 15.15.4 |
| Images | expo-image | ~56.0.10 |
| Gradients | expo-linear-gradient | ~56.0.4 |
| Icons | lucide-react-native | ^0.475.0 |
| Forms | react-hook-form | ^7.78.0 |
| Validation | zod | ^3.25.76 |
| Form resolvers | @hookform/resolvers | ^3.10.0 |
| Fonts (local) | expo-font | ~56.0.x |
| Fonts (Google — UI/body) | @expo-google-fonts/dm-sans | latest |
| Fonts (Google — mono/labels) | @expo-google-fonts/dm-mono | latest |
| Fonts (Google — numbers) | @expo-google-fonts/russo-one | latest |
| Fonts (Google — wordmark only) | @expo-google-fonts/baloo-2 | latest |

**Do not add packages not in this list without updating CLAUDE.md first.**

> Added per `docs/DESIGN_SYSTEM.md` — Quadra's brand typography (Climate Crisis, Russo One, DM Sans, Baloo 2, DM Mono) replaces the previous system-font default. See "Custom fonts" below.

---
## Package management rules

- The project root has `.npmrc` with `legacy-peer-deps=true`. This is intentional and required for EAS Build compatibility with React 19 + Expo SDK 56+.
- For native deps, always use `npx expo install <package>` (resolves Expo-compatible version).
- For pure JS deps (Zod, date-fns, etc.), `npm install <package>` is fine.
- Do NOT delete `.npmrc` or change `legacy-peer-deps` — it WILL break EAS Build.

--- 

## Custom fonts (brand typography)

Quadra's identity uses 5 font families — **not** the system default. See `docs/DESIGN_SYSTEM.md` for the role of each.

| Family | Source | Loaded via |
| --- | --- | --- |
| Climate Crisis | Local TTF asset | `expo-font` (`useFonts` with local `require()`) |
| Russo One | Google Font | `@expo-google-fonts/russo-one` |
| DM Sans | Google Font | `@expo-google-fonts/dm-sans` |
| Baloo 2 | Google Font | `@expo-google-fonts/baloo-2` |
| DM Mono | Google Font | `@expo-google-fonts/dm-mono` |

### Asset location

- Climate Crisis TTF: `assets/fonts/ClimateCrisis-Regular-VariableFont_YEAR.ttf` (copy from the Claude Design prototype's `uploads/` folder)

### Loading pattern

All fonts are loaded once in `app/_layout.tsx`, before rendering any screen (alongside the existing providers):

```tsx
import { useFonts } from 'expo-font';
import { DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold, DMSans_800ExtraBold } from '@expo-google-fonts/dm-sans';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { RussoOne_400Regular } from '@expo-google-fonts/russo-one';
import { Baloo2_600SemiBold } from '@expo-google-fonts/baloo-2';

const [fontsLoaded] = useFonts({
  'ClimateCrisis-Regular': require('@/assets/fonts/ClimateCrisis-Regular-VariableFont_YEAR.ttf'),
  DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold, DMSans_800ExtraBold,
  DMMono_400Regular, DMMono_500Medium,
  RussoOne_400Regular,
  Baloo2_600SemiBold,
});
```

### Tailwind mapping

Font families are exposed as NativeWind font tokens in `tailwind.config.js` (`font-display`, `font-num`, `font-body`, `font-word`, `font-mono`) per `docs/DESIGN_SYSTEM.md`. Screens reference these tokens — never inline `fontFamily` strings.

> `Climate Crisis` is **display-only and always uppercase** — apply the `uppercase` className wherever `font-display` is used. `Baloo 2` is reserved for the "quadra" wordmark only — never for general UI text.

---

## Architecture references

- **Routing**: `docs/ARCHITECTURE.md` — file-based Expo Router
- **State**: `docs/ARCHITECTURE.md` — TanStack Query (server) + Zustand (client)
- **Design tokens**: `docs/DESIGN_SYSTEM.md` — all colors, spacing, typography
- **Components catalog**: `docs/COMPONENTS.md` — reuse before recreating
- **Screen catalog**: `docs/SCOPE.md` — MVP screens only

---

## Non-negotiable rules

1. **All styles via NativeWind** — no `StyleSheet.create` for anything achievable with className
2. **All design tokens from DESIGN_SYSTEM.md** — no hardcoded hex colors
3. **Tokens stored in expo-secure-store** — never AsyncStorage
4. **Server state via TanStack Query** — no raw `useState` for API data
5. **Forms via React Hook Form + Zod** — no uncontrolled inputs
6. **API calls in `src/features/<area>/api/`** — screens never call the API directly
7. **TypeScript strict** — no `any`, no `// @ts-ignore`
8. **Path alias `@/*`** maps to `src/*`

---

## Key scripts

```bash
npm run typecheck   # tsc --noEmit — must pass before any PR
npm run start       # expo start (requires Dev Client)
```

---

## Environment variables (`.env.local`, gitignored)

```
EXPO_PUBLIC_API_URL=https://api.quadra.dev
EXPO_PUBLIC_COGNITO_REGION=us-east-1
EXPO_PUBLIC_COGNITO_USER_POOL_ID=
EXPO_PUBLIC_COGNITO_APP_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```
