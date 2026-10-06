# ARCHITECTURE.md — Quadra Mobile

How the app is built. The earlier version of this file, with long code samples from before the
API integration, is in `docs/archive/ARCHITECTURE-2026-10-06-com-exemplos.md`.

## Shape

Expo (Dev Client) + Expo Router. Screens in `app/` use hooks from `src/features/<area>/api/`,
which call the Quadra API through `src/lib/api/`. Nothing is mocked at runtime.

```
app/                      routes (file-based)
src/components/           reusable UI (catalog in docs/COMPONENTS.md)
src/features/<area>/      api/ (query + mutation hooks), schema/ (Zod), types/, lib/, realtime/
src/lib/api/              client.ts, authorizedClient.ts
src/lib/auth/             token storage, refresh, session check, logout
src/lib/realtime/         SignalR connection
src/stores/               Zustand stores (auth, theme, notificationPrefs, navBlurTarget)
src/theme/                tokens used outside className
tests/                    Jest + RNTL
```

Areas: `auth`, `matches`, `explore`, `profile`, `ranking`.

## Routes

```
app/index.tsx                         splash + redirect
app/(auth)/login · sms-otp · onboarding
app/(tabs)/index · explore · network · profile
app/matches/create
app/matches/[id]                      detail (single scroll, no tabs)
app/matches/[id]/teams · scoreboard · mvp-vote · summary
app/explore/map
app/profile/card · ranking · settings · edit · notifications · feedback
```

## State

- **Server state → TanStack Query.** Every API call is a hook in `src/features/<area>/api/`;
  mutations invalidate the queries they affect. Query keys are arrays
  (`['matches', 'upcoming']`).
- **Client state → Zustand**, one store per concern. No global "app store".
- **Local UI state → `useState`.** Form inputs go through React Hook Form + Zod.
- The translation between API shapes and screen models lives in one place per area (for
  matches: `src/features/matches/api/matchesApi.ts`).

## Auth

1. Splash reads the tokens from `expo-secure-store`.
2. No token → login. Otherwise `GET /api/v1/profiles/me` verifies the session.
3. `onboardingCompleted` false → onboarding; true → home.

- Tokens are the backend's own: JWT access token (about 15 min) and opaque refresh token
  (30 days). Login is SMS code or Google; the first login creates the account.
- Authenticated calls go through `src/lib/api/authorizedClient.ts`: it attaches the access
  token and, on 401, refreshes once and retries.
- The backend rotates the refresh token on every use, so refresh is single-flight
  (`src/lib/auth/refreshSession.ts`): concurrent requests share one refresh.
- Logout revokes the refresh token on the backend (best effort), clears the stored tokens,
  resets the stores and clears the query cache.

## Real-time

`src/lib/realtime/connection.ts` keeps one SignalR connection to `/hubs/match`. The
scoreboard joins the match room and, on `ScoreboardUpdated`, **invalidates the live-game query
and re-reads over REST** (`src/features/matches/realtime/useScoreSubscription.ts`). The hub
message is only a signal; if the hub is unreachable the screen still works without refreshing
by itself.

## Environment

`EXPO_PUBLIC_*` values are bundled into the app, so they are never secrets. `.env.local` is
gitignored. The EAS `preview` profile sets `EXPO_PUBLIC_API_URL` for the test APK. Real keys
(the Android Maps key) come from build variables read in `app.config.js`.

## Performance defaults

- `FlatList` for lists longer than about 10 items
- `memo` only when profiling shows the need
- Images through `expo-image`

## Tests

Jest (`jest-expo`) + React Native Testing Library, under `tests/`. Tests stub the hooks or
`fetch` and never touch the network; native modules are mocked in `tests/__mocks__/`. No E2E
in the MVP.
