# Screen Spec: S1 — Splash

> ✅ **scope-guardian: APPROVED** — all 11 checklist items pass (court-line overlay cut per audit). Cleared for implementation.

## Origin
- Screen from SCOPE: S1 — Splash
- Layer: 1 (Match Core — entry/auth bootstrap)
- Requested by: human (renanortega.dev@gmail.com)

## Reference assets read
- [x] `docs/references/screens/S1-splash/splash.png` (brand mockup only — single state)
- No prototype source exists; per the request and SCOPE, `splash.png` is the only reference asset.

## Notable divergences from the prototype
- Prototype tagline renders as "O JOGO COMEÇA AQUI" (no trailing period). SCOPE S2 uses "O JOGO COMEÇA AQUI." with a period for the Login headline; the **splash uses the no-period form shown in `splash.png`**.
- The blue-blob / lime-wave decorative shapes are **NOT included** — removed per SCOPE OUT and confirmed absent from the final `splash.png`.

## Goal
On app launch, the user sees the Quadra brand while the app silently validates any stored session and is auto-redirected (within 2s max) to Login, Onboarding, or Home — with no interaction required.

## Route
`app/index.tsx` — root route, performs the auth-bootstrap redirect (per ARCHITECTURE "Auth flow" diagram). Replaces the current placeholder that hard-redirects to `/(auth)/login`.

## Backend dependencies
- `GET /api/v1/auth/me` (FA.2) — token validation + profile-existence check. Already wrapped by `src/lib/auth/verifySession.ts` (returns `{ userId, hasProfile }`).
- No new endpoint needed.

## Existing components reused
- `QuadraLogo` (`src/components/icons/QuadraLogo.tsx`) — the brand mark (three blocks). Already exists; render at the centered logo size.

## New components proposed

The screen is a one-off brand/bootstrap screen. Two small pieces are candidates, but per the COMPONENTS.md "extract only when reused" rule, both are **inlined in the route**, not extracted (each is used on exactly one screen):

- `quadra` wordmark — inline `<Text className="font-word ...">quadra</Text>` (Baloo 2, lowercase, lime/white per mockup). Not a component; trivial single-class text. Will be promoted to a shared `Wordmark` only if S2 reuses identical markup (decide in S2 spec).
- Indeterminate progress bar — inline `<View>` track + animated `<View>` fill (reanimated). One-off; not extracted.

**NONE** extracted to the catalog for this screen. No COMPONENTS.md change required.

## Layout structure

```
<View className="flex-1 bg-surface-dark">           {/* navy base */}
  <LinearGradient ...>                              {/* navy→blue brand gradient, expo-linear-gradient */}
    <SafeAreaView className="flex-1 items-center justify-center px-6">
      {/* centered brand lockup */}
      <View className="items-center">
        <QuadraLogo size={96} />
        <Text className="font-word text-text-on-dark text-5xl mt-4 lowercase">quadra</Text>
        <Text className="font-body text-eyebrow text-accent uppercase mt-3 tracking-[1.2px]">
          O JOGO COMEÇA AQUI
        </Text>
      </View>
    </SafeAreaView>

    {/* bottom loading affordance */}
    <View className="absolute bottom-16 inset-x-0 items-center">
      <View className="h-1 w-40 rounded-pill bg-white/15 overflow-hidden">
        <Animated.View className="h-full w-1/3 rounded-pill bg-gradient-cta" style={animatedStyle} />
      </View>
      <Text className="font-mono text-mono text-text-muted uppercase mt-4">CARREGANDO</Text>
    </View>
  </LinearGradient>
</View>
```

Gradient colors come from DESIGN_SYSTEM tokens (`surface-dark` → `primary`, the navy→blue brand gradient). The progress fill uses the `bg-gradient-cta` utility (blue→lime), matching the lime-tipped bar in the mockup. NativeWind classes only; no `StyleSheet.create`. No hardcoded hex.

## State

### Server state (TanStack Query hooks)
- None via TanStack here. The auth bootstrap is a one-shot imperative check, not a cached query. The `verifySession` call runs once in an effect (or in the root layout's bootstrap), not through `useQuery`. (Rationale: this is app-init control flow, not screen data; ARCHITECTURE places token-check in the splash/bootstrap, not in a Query cache.)

### Client state (Zustand)
- `useAuthStore` (`src/stores/auth.ts`, exists) — `setAuth({ userId, accessToken, hasProfile })` on success; `clearAuth()` on failure. Drives the redirect target.

### Local state
- `useState` minimal: none required for redirect logic if bootstrap lives in root layout. If implemented in-route: a single `ready` boolean is acceptable, but prefer driving the redirect off `useAuthStore` + a resolved flag.

### Forms (if any)
- None. SCOPE: "any user interaction" is OUT.

## Navigation triggers
Auto-redirect only (no taps). After the auth check resolves (or fails), `<Redirect>` / `router.replace` to:
- No stored token OR `verifySession` throws → `router.replace('/(auth)/login')`
- Token valid + `hasProfile === false` → `router.replace('/(auth)/onboarding')`
- Token valid + `hasProfile === true` → `router.replace('/(tabs)')` (Home)

A 2s maximum cap: if the check is still pending at 2s, proceed using the best-known state (default to login on timeout) — SCOPE caps the splash at 2s.

## Permissions / external integrations
- NONE. (No location/camera here.)

## Real-time subscriptions (if any)
- None.

## Loading / error / empty states
- Loading IS the screen — the splash itself is the loading state (progress bar + "CARREGANDO").
- Error (network failure / 401 on `auth/me`) → treated as unauthenticated → redirect to Login. No visible error UI on splash (SCOPE: no interaction; failures fall through to Login).
- Empty: N/A.

## Acceptance criteria
- [ ] On launch, the navy→blue gradient background, centered `QuadraLogo`, "quadra" wordmark, and "O JOGO COMEÇA AQUI" tagline render.
- [ ] An indeterminate progress bar and "CARREGANDO" label are shown while the auth check runs.
- [ ] With a valid token and existing profile, the app redirects to Home `/(tabs)` without user interaction.
- [ ] With a valid token and no profile (`hasProfile === false`), redirects to `/(auth)/onboarding`.
- [ ] With no token or a failed `GET /api/v1/auth/me`, redirects to `/(auth)/login`.
- [ ] The splash never stays visible longer than 2 seconds before redirecting.
- [ ] No tappable/interactive elements exist on the screen.
- [ ] No blue-blob / lime-wave decorative shapes are rendered (removed per brand mockup).

## Out of scope (be explicit)
- Blue blob / lime wave decorative shapes — removed per SCOPE OUT and absent from `splash.png`.
- Court-line / any decorative texture overlay on the gradient — not in SCOPE S1 IN; background is the navy→blue gradient only.
- Any animation longer than 2 seconds — SCOPE OUT (the 2s cap is a hard ceiling).
- Any user interaction (buttons, skip, tap-to-continue) — SCOPE OUT.
- Onboarding tutorial / first-run carousel — not part of splash.

## Files to create
- (none new besides editing the route)

## Files to modify
- `app/index.tsx` — replace the placeholder `<Redirect href="/(auth)/login" />` with the splash UI + auth-bootstrap redirect logic described above.
- `app/_layout.tsx` — ensure the auth bootstrap (calling `getAccessToken` → `verifySession` → `setAuth`/`clearAuth`) runs here per ARCHITECTURE "Providers (root layout) → Auth bootstrap", so `app/index.tsx` can redirect off resolved store state. (Confirm/extend; do not duplicate the check in two places.)

## New npm dependencies
- NONE. `expo-linear-gradient`, `react-native-svg`, and `react-native-reanimated` are all in the locked stack.

## Implementation notes
- The redirect must be idempotent and run after fonts are loaded (`app/_layout.tsx` already gates rendering on `useFonts`). Do not flash the splash, then unmount and remount.
- Prefer `router.replace` (not `push`) so the splash is not in the back stack.
- The 2s cap: implement a `Promise.race([verifySession(...), timeout(2000)])`-style guard; on timeout default to the unauthenticated path (Login) to avoid hanging on a slow/offline network.
- The `apiClient` currently has no 401-refresh retry (see `src/lib/api/client.ts`); for splash this is fine — any non-OK response throws and is treated as unauthenticated.
- Accessibility: mark the gradient as non-accessible (`accessible={false}` / `importantForAccessibility="no"`). Expose the "CARREGANDO" text to screen readers as a status (`accessibilityRole`/live region) so the loading state is announced.
- Brand colors on `QuadraLogo` are fixed and must not be themed; do not pass color props.
