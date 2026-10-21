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
| Play Store listing and data safety form (draft) | `docs/PLAY_STORE.md` |

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
EXPO_PUBLIC_API_URL=https://api-dev.quadra-volei.app
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY=
EXPO_PUBLIC_PHONE_AUTH=          # "firebase" = phone login through Firebase (DECISIONS #133); empty = API test code
```

The URL above is the hosted test API (`quadra-api-dev` on Render, branch `dev`; it sleeps when idle;
the first request can take up to a minute). Production is `https://api.quadra-volei.app`, set only in
the `production` profile of `eas.json`. For a local backend use an address the device reaches (`http://10.0.2.2:5075` on the
Android emulator, the machine's LAN IP on a phone). Log in with the test environment's SMS code.

## Branches

- Start every change from `dev` and merge it back into `dev`. Never commit straight to `dev`
  or `main`.
- Typecheck and tests must pass before merging; GitHub Actions (`.github/workflows/ci.yml`)
  runs them on every PR into `dev` or `main`.
- Commit messages in Portuguese, `tipo(area): resumo` (as in `git log`).

## Conventions

1. Styles through NativeWind `className`; no `StyleSheet.create` for what a class can do.
2. Colors, spacing and fonts only from the tokens in `docs/DESIGN_SYSTEM.md` and
   `tailwind.config.js`; no hardcoded hex, no inline `fontFamily`.
3. Fonts are loaded once in `app/_layout.tsx`. `font-display` (Climate Crisis) is always
   `uppercase`. The "quadra" lockup is an image (`QuadraWordmark`), never typed text.
4. API data through TanStack Query hooks in `src/features/<area>/api/`; screens never call the
   API directly and never keep API data in `useState`.
5. Forms through React Hook Form + Zod.
6. No `any`, no `// @ts-ignore`. Path alias `@/*` → `src/*`.
7. A new reusable component gets an entry in `docs/COMPONENTS.md`.
8. A behavior change gets a line in `docs/DECISIONS.md` and, if it changes what is done or
   pending, in `docs/SCOPE.md`.

## Security (every change)

The API is the only authority on who may see or change what; this app never enforces access by
hiding a button. Shared knowledge (threat model, endpoint matrix, findings) lives outside git in
the workspace folder `../security/`; the `security-audit` skill and the `security-auditor` agent
are in the workspace root `.claude/`, outside git (start Claude from the workspace root to use them).

- Tokens only in `expo-secure-store`; never in AsyncStorage, logs, URLs (except the SignalR
  `access_token` the library needs) or error reports.
- No `console.log` of tokens, phone numbers, codes or API responses with personal data.
- Everything shipped in the bundle is public: only `EXPO_PUBLIC_*` values that are safe to expose
  (the Maps key stays restricted to the package and SHA-1 in Google Cloud).
- Deep links (`quadra://`) only navigate; any action needs a tap and goes through the API.
- Only HTTPS API URLs outside local development.
- A new Android permission or native module is a security change: justify it in `docs/DECISIONS.md`.
- Never disable a check or test to make something pass; report which checks ran and what was not
  verified.

## Do NOT

- Do not write secrets or keys in any file. The Maps key comes from the
  `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY` build variable; `.env.local` stays out of git.
- Do not store tokens in AsyncStorage.
- Do not bring back mocked data, a mock auth shortcut, MSW or any Cognito variable.
- Do not show invented numbers: where the backend has no data, show the neutral placeholder
  listed in `docs/SCOPE.md`.
- Do not build screens or behaviors listed as out of the MVP without asking.
- When unsure about scope or stack, stop and ask instead of inventing a decision.
