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
| Google Sign-In (native) | @react-native-google-signin/google-signin | ^16.1.5 |
| Local prefs storage | @react-native-async-storage/async-storage | 2.2.0 |
| Image picker | expo-image-picker | ~56.0.18 |
| Location | expo-location | ~56.0.19 |
| Date/time picker | @react-native-community/datetimepicker | 9.1.0 |
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
| Blur (glass chrome) | expo-blur | ~56.0.3 |
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

> `@react-native-async-storage/async-storage` is for **non-secret UI preferences only** (e.g. appearance theme). Auth tokens stay in `expo-secure-store` — rule #3 below is unchanged. `expo-image-picker` was added for S10's "Trocar foto" (avatar selection). `@react-native-community/datetimepicker` was added for S11's create-match date/time selection — the `DateTimePickerField` (`src/components/ui/DateTimePickerField.tsx`) opens the native OS picker widget on tap (Android dialog via `DateTimePickerAndroid.open`; iOS spinner in a bottom-sheet Modal). It is bundled in Expo Go but needs a Dev Client rebuild for standalone/dev-client builds; install via `npx expo install @react-native-community/datetimepicker`. Birth-date fields (S4/S10) keep the typed `DateField` — a picker suits future dates the user selects, not a far-past DOB. `expo-location` was added for S17's map (foreground device location to center the map and supply `lat`/`lon` to F1.7); install via `npx expo install expo-location` to pin the SDK-56-compatible version. `expo-blur` was added for the translucent glass app header (`src/components/ui/GlassHeader.tsx`), matching the prototype's `backdrop-filter` chrome — RN has no `backdrop-filter`, so real backdrop blur needs the native `BlurView`. It requires a Dev Client rebuild. On Android the blur uses `blurMethod="dimezisBlurView"`, which needs an explicit backdrop: each nav screen wraps its scroll content in `<BlurTargetView ref={blurTarget}>` and passes that ref to `GlassHeader` (→ `BlurView`'s `blurTarget`). Without it Android silently falls back to no blur. iOS blurs natively and ignores both props.

> `@react-native-google-signin/google-signin` was added for S2's "Entrar com Google" (real login). It is the native Google Sign-In SDK wrapper Expo's own docs recommend for SDK 50+ (`expo-auth-session`'s Google provider is browser-based and no longer recommended); it supports the New Architecture and ships an Expo config plugin (registered in `app.json`). It is **not** in Expo Go — it needs a Dev Client rebuild (`npx expo prebuild` / EAS build). The app only obtains a Google **ID token** with it (`src/features/auth/api/googleSignIn.ts`) and sends that token to the backend (`POST /api/v1/auth/login/google`), which validates it and issues the Quadra session — no Firebase, no Cognito. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` must be the **Web** OAuth client ID (the same value the backend has in `Auth:Google:ClientId`); Android additionally needs an Android OAuth client (package `com.quadra.app` + the signing SHA-1) registered in the same Google Cloud project, and iOS needs `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` plus its reversed form as the plugin's `iosUrlScheme` in `app.json`.

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
  DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold, DMSans_800ExtraBold,
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
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

> Auth is handled by the Quadra backend (own JWT; SMS OTP + Google) — there are no Cognito variables. For a local backend, point `EXPO_PUBLIC_API_URL` at an address the device can reach (e.g. `http://10.0.2.2:5075` on the Android emulator, or the machine's LAN IP on a physical phone) — `localhost` is the phone itself. Optional, dev builds only: `EXPO_PUBLIC_DEV_MOCK_AUTH=true` skips login and signs in as the organizer of the mocked matches (`app/_layout.tsx`), for working on the still-mocked screens without a backend; it is ignored in release builds.
