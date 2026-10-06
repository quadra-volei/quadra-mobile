# CLAUDE.md — Quadra Mobile

React Native app of **Quadra**, a volleyball app (match organization, live game, ranking).
Every screen reads the real API (sibling repo `quadra-api`); there is no mock mode.

## Where things are

| Need | Read |
| --- | --- |
| Which screens are done, pending, out of the MVP | `docs/SCOPE.md` |
| Why something is the way it is | `docs/DECISIONS.md` (source of truth; backend side in `quadra-api/docs/DECISIONS.md`) |
| Routing, state, auth, real-time | `docs/ARCHITECTURE.md` |
| Colors, spacing, typography | `docs/DESIGN_SYSTEM.md` |
| Existing components (reuse before creating) | `docs/COMPONENTS.md` |
| Layout of each screen | PNGs in `docs/references/screens/<id>/` |

`docs/archive/` is history only (old screen specs from the mocked phase, the four-agent
workflow) — never treat it as current and do not read it by default.

## Stack (do not change without asking)

`package.json` is the source of truth for versions. Do not add a package without asking.

- Expo SDK 56, React Native 0.85, React 19, TypeScript strict
- Expo Router (file-based, `app/`), NativeWind 4 + Tailwind 3
- TanStack Query for server state, Zustand for client state
- React Hook Form + Zod for forms
- `expo-secure-store` for tokens; AsyncStorage only for non-secret preferences (theme)
- `@microsoft/signalr` for the live scoreboard, `react-native-maps` + `expo-location` for maps
- Native Google Sign-In (`@react-native-google-signin/google-signin`); the app only gets a
  Google ID token and sends it to the backend
- `expo-file-system/legacy` `uploadAsync` for the profile photo (React Native `fetch` cannot
  send a local file as a raw body on Android)
- Tests: Jest (`jest-expo`) + React Native Testing Library, in `tests/`

Native modules (Google Sign-In, date picker, blur, file system, maps key) need a Dev Client or
APK build; Expo Go is not enough. Install native deps with `npx expo install <package>`.
Keep `.npmrc` (`legacy-peer-deps=true`): EAS Build breaks without it.

## Commands

```bash
npm run typecheck      # must pass before merging
npm test
npm run start          # Metro, for a Dev Client
npx expo start -c      # after changing .env.local
```

Test APK: see `docs/DECISIONS.md` #36 to #38 (EAS `preview` profile, project owner account;
never run `eas init`).

## Environment (`.env.local`, gitignored)

```
EXPO_PUBLIC_API_URL=https://quadra-api-xj6e.onrender.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

The URL above is the hosted test API (it sleeps when idle; the first request can take up to a
minute). For a local backend use an address the device reaches (`http://10.0.2.2:5075` on the
Android emulator, the machine's LAN IP on a phone). Log in with the test environment's SMS code.

## Branches

- Start every change from `dev` and merge it back into `dev`. Never commit straight to `dev`
  or `main`.
- Typecheck and tests must pass before merging.
- Commit messages in Portuguese, `tipo(area): resumo` (as in `git log`).

## Conventions

1. Styles through NativeWind `className`; no `StyleSheet.create` for what a class can do.
2. Colors, spacing and fonts only from the tokens in `docs/DESIGN_SYSTEM.md` and
   `tailwind.config.js`; no hardcoded hex, no inline `fontFamily`.
3. Fonts are loaded once in `app/_layout.tsx`. `font-display` (Climate Crisis) is always
   `uppercase`; `font-word` (Baloo 2) is only for the "quadra" wordmark.
4. API data through TanStack Query hooks in `src/features/<area>/api/`; screens never call the
   API directly and never keep API data in `useState`.
5. Forms through React Hook Form + Zod.
6. No `any`, no `// @ts-ignore`. Path alias `@/*` → `src/*`.
7. A new reusable component gets an entry in `docs/COMPONENTS.md`.
8. A behavior change gets a line in `docs/DECISIONS.md` and, if it changes what is done or
   pending, in `docs/SCOPE.md`.

## Do NOT

- Do not write secrets or keys in any file. The Maps key comes from the
  `GOOGLE_MAPS_ANDROID_API_KEY` build variable; `.env.local` stays out of git.
- Do not store tokens in AsyncStorage.
- Do not bring back mocked data, a mock auth shortcut, MSW or any Cognito variable.
- Do not show invented numbers: where the backend has no data, show the neutral placeholder
  listed in `docs/SCOPE.md`.
- Do not build screens or behaviors listed as out of the MVP without asking.
- When unsure about scope or stack, stop and ask instead of inventing a decision.
