# Screen Spec: S1 — Splash

> ✅ **scope-guardian: APPROVED** — all 11 checklist items pass (court-line overlay cut per audit). Cleared for implementation.
>
> **Round 2 (2026-07-15) — entrance animations.** The prototype's `.q-splash-*` animations were ported to the shipped screen, changing three things this spec asserted: (1) the progress bar is **determinate** (fills 0→100%), not the indeterminate sweep originally specced; (2) the brand lockup **rises in** on a staggered timeline via the new `useRiseIn` hook — which **is** extracted and catalogued, so the old "NONE extracted" claim no longer holds; (3) the splash is held for a **minimum** 1800ms so the animation cannot be flashed away by an instantly-resolving bootstrap. The SCOPE 2s ceiling is unchanged and still respected — the hold runs *in parallel* with the (2s-capped) bootstrap, so it adds a floor, never raises the ceiling.

## Origin
- Screen from SCOPE: S1 — Splash
- Layer: 1 (Match Core — entry/auth bootstrap)
- Requested by: human (renanortega.dev@gmail.com)

## Reference assets read
- [x] `docs/references/screens/S1-splash/splash.png` (brand mockup only — single state)
- [x] `Quadra 08-07-26/Quadra.html` — the `.q-splash-*` / `.q-rise` keyframes (round 2)

Round 1 was written when no prototype source was available, so `splash.png` — a single static frame — was the only reference, and the screen's motion was invented. The prototype source has since landed; it is the authority on **motion** (the entrance timeline below), while `splash.png` remains the authority on the static composition. They do not conflict: the PNG is what the prototype's animation settles into.

## Notable divergences from the prototype
- Prototype tagline renders as "O JOGO COMEÇA AQUI" (no trailing period). SCOPE S2 uses "O JOGO COMEÇA AQUI." with a period for the Login headline; the **splash uses the no-period form shown in `splash.png`**.
- The blue-blob / lime-wave decorative shapes are **NOT included** — removed per SCOPE OUT and confirmed absent from the final `splash.png`.

## Goal
On app launch, the user sees the Quadra brand animate in while the app silently validates any stored session, and is auto-redirected (within 2s max, after a ~1.8s minimum hold) to Login, Onboarding, or Home — with no interaction required.

## Route
`app/index.tsx` — root route, performs the auth-bootstrap redirect (per ARCHITECTURE "Auth flow" diagram). Replaces the current placeholder that hard-redirects to `/(auth)/login`.

## Backend dependencies
- `GET /api/v1/auth/me` (FA.2) — token validation + profile-existence check. Already wrapped by `src/lib/auth/verifySession.ts` (returns `{ userId, hasProfile }`).
- No new endpoint needed.

## Existing components reused
- `QuadraLogo` (`src/components/icons/QuadraLogo.tsx`) — the brand mark (three blocks). Already exists; render at the centered logo size.

## New components proposed

The screen is a one-off brand/bootstrap screen, so its visual pieces stay **inlined in the route** per the COMPONENTS.md "extract only when reused" rule:

- `quadra` wordmark — inline `<Animated.Text className="font-word ...">quadra</Animated.Text>` (Baloo 2, lowercase, lime/white per mockup). Not a component; trivial single-class text. Will be promoted to a shared `Wordmark` only if S2 reuses identical markup (decide in S2 spec).
- Progress bar — inline `<View>` track + `<Animated.View>` fill (reanimated). One-off; not extracted.
- Logo-mark pop — inline `useAnimatedStyle` on the `QuadraLogo` wrapper. One-off (only the splash pops its mark); not extracted.

**One hook IS extracted** (round 2), because the entrance is reused across screens rather than being a one-off:

- `useRiseIn` — path `src/hooks/useRiseIn.ts`. Signature:
  ```ts
  useRiseIn(options?: {
    delay?: number;     // ms before rising; stagger siblings by increasing it
    distance?: number;  // px below its final position that it starts from
    duration?: number;
    easing?: WithTimingConfig['easing'];
  }): AnimatedStyle
  ```
  *Why it earns extraction*: the "fade up into place" entrance (the prototype's `.q-rise`) is used by **S1** (wordmark, tagline, loader block) **and S2 Login** (lockup, headline, subtitle, CTA) — reuse has already happened, which is exactly the catalog's bar. Defaults are `.q-rise`'s (16px / 450ms / `cubic-bezier(.2,.7,.2,1)`); S1 overrides them with the softer, slower `qSplashUp` values. Returns a style for `<Animated.View>` / `<Animated.Text>`; owns no layout and renders nothing.

**COMPONENTS.md gains a `Hooks (src/hooks/)` section with the `useRiseIn` entry.**

## Layout structure

```
<View className="flex-1 bg-surface-dark">           {/* navy base */}
  <LinearGradient ...>                              {/* navy→blue brand gradient, expo-linear-gradient */}
    <SafeAreaView className="flex-1 items-center justify-center px-6">
      {/* centered brand lockup — each piece rises in on its own delay */}
      <View className="items-center">
        <Animated.View style={markStyle}>          {/* pop: scale .55→1, rotate -12°→0 */}
          <QuadraLogo size={120} />
        </Animated.View>
        <Animated.Text className="font-word text-text-on-dark text-5xl mt-4 lowercase"
                       style={wordStyle}>quadra</Animated.Text>
        <Animated.Text className="font-body text-accent uppercase mt-3 tracking-[1.2px]"
                       style={tagStyle}>
          O JOGO COMEÇA AQUI
        </Animated.Text>
      </View>
    </SafeAreaView>

    {/* bottom loading affordance — rises in last */}
    <Animated.View className="absolute bottom-16 inset-x-0 items-center" style={loadStyle}>
      <View className="h-1 rounded-pill bg-white/15 overflow-hidden" style={{ width: 160 }}>
        {/* Full-width fill scaled from the left edge: same visual as the prototype's
            `width: 0% → 100%`, but it stays on the UI thread instead of relaying out. */}
        <Animated.View style={[{ width: '100%', height: '100%', transformOrigin: 'left' }, fillStyle]}>
          <LinearGradient colors={BAR_GRADIENT} ... />   {/* blue→lime */}
        </Animated.View>
      </View>
      <Animated.Text className="font-mono text-text-muted uppercase mt-4"
                     style={pulseStyle}                  {/* breathes 50%↔100% opacity */}
                     accessibilityRole="text" accessibilityLiveRegion="polite"
                     accessibilityLabel="Carregando">
        CARREGANDO
      </Animated.Text>
    </Animated.View>
  </LinearGradient>
</View>
```

Gradient colors come from DESIGN_SYSTEM tokens (`surface-dark` → `primary`, the navy→blue brand gradient). The progress fill is the blue→lime brand CTA gradient, matching the lime-tipped bar in the mockup. NativeWind classes only; no `StyleSheet.create`. No hardcoded hex.

### Entrance timeline (round 2)
Ports the prototype's `.q-splash-*` keyframes (`Quadra.html`). All of it finishes inside the minimum hold, so the user sees the whole thing:

| Element | Delay | Duration | Curve |
| --- | --- | --- | --- |
| Logo mark (pop) | 0 | 700ms | `cubic-bezier(.34,1.56,.64,1)` — back-out overshoot; scale `.55→1`, rotate `-12°→0`. The fade completes early in the pop (the prototype's 0/60/100 keyframes). |
| "quadra" wordmark | 350ms | 500ms | `Easing.out(ease)` (`qSplashUp`) |
| Tagline | 520ms | 500ms | `Easing.out(ease)` |
| Loader block | 700ms | 500ms | `Easing.out(ease)` |
| Bar fill | 350ms | **1400ms** (prototype: 2100ms — see below) | `cubic-bezier(.5,0,.2,1)` — fast start, slow settle |
| "CARREGANDO" pulse | — | 700ms half-cycle, repeats | `Easing.inOut(ease)`, 50%↔100% opacity, until redirect |

> **Deliberate deviation — do not "fix" the bar back to 2.1s.** The prototype's `.q-splash-bar` runs `2.1s` after a `.35s` delay, ending at 2450ms. On the web that is harmless; here it would outlive the SCOPE 2s ceiling, so the bar would still be filling when the redirect fires and the user would never see it complete. Shortened to 1400ms, which lands the fill at 1750ms — inside both the 1800ms hold and the 2s ceiling. Everything else matches the prototype's keyframes exactly.

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

**Two gates, run in parallel** (`Promise.all`), both of which must clear before the redirect fires:

1. **The auth bootstrap**, capped at 2s: if the check is still pending at 2s, proceed using the best-known state (default to login on timeout) — SCOPE caps the splash at 2s.
2. **A minimum hold** of `MIN_SPLASH_MS` (1800ms): a cached-session launch resolves the bootstrap almost instantly, which would flash the brand animation away before it played. The hold is what makes the splash worth having.

Because they race in parallel rather than in sequence, total splash time is `max(bootstrap ≤ 2s, 1.8s)` = **at most 2s** — the hold sets a floor, never raises the SCOPE ceiling. Keep them parallel: chaining them (`await bootstrap; await hold`) would sum to 3.8s and break SCOPE.

## Permissions / external integrations
- NONE. (No location/camera here.)

## Real-time subscriptions (if any)
- None.

## Loading / error / empty states
- Loading IS the screen — the splash itself is the loading state (determinate progress bar + pulsing "CARREGANDO"). The bar's fill is a **brand animation on a fixed timeline, not real progress**: it does not track the bootstrap. That is deliberate and safe here, because the minimum hold means the bar always completes its run before the screen leaves.
- Error (network failure / 401 on `auth/me`) → treated as unauthenticated → redirect to Login. No visible error UI on splash (SCOPE: no interaction; failures fall through to Login).
- Empty: N/A.

## Acceptance criteria
- [ ] On launch, the navy→blue gradient background, centered `QuadraLogo`, "quadra" wordmark, and "O JOGO COMEÇA AQUI" tagline render.
- [ ] The brand lockup animates in on the "Entrance timeline" above: the mark pops (overshoot), and the wordmark / tagline / loader block rise in staggered via `useRiseIn`.
- [ ] A **determinate** progress bar fills 0→100% and a pulsing "CARREGANDO" label is shown while the auth check runs.
- [ ] The splash is held for `MIN_SPLASH_MS` even when the bootstrap settles instantly: with the bootstrap resolved but the hold not yet elapsed, no redirect has fired and the splash is still on screen.
- [ ] With a valid token and existing profile, the app redirects to Home `/(tabs)` without user interaction.
- [ ] With a valid token and no profile (`hasProfile === false`), redirects to `/(auth)/onboarding`.
- [ ] With no token or a failed `GET /api/v1/auth/me`, redirects to `/(auth)/login`.
- [ ] The splash never stays visible longer than 2 seconds before redirecting.
- [ ] No tappable/interactive elements exist on the screen.
- [ ] No blue-blob / lime-wave decorative shapes are rendered (removed per brand mockup).

## Out of scope (be explicit)
- Blue blob / lime wave decorative shapes — removed per SCOPE OUT and absent from `splash.png`.
- Court-line / any decorative texture overlay on the gradient — not in SCOPE S1 IN; background is the navy→blue gradient only.
- Any animation longer than 2 seconds — SCOPE OUT (the 2s cap is a hard ceiling). The entrance timeline's longest run ends at 1750ms (bar fill: 350ms delay + 1400ms), inside both the hold and the ceiling. The "CARREGANDO" pulse repeats indefinitely, but it is a loading affordance rather than an entrance, and the redirect ends it.
- Any user interaction (buttons, skip, tap-to-continue) — SCOPE OUT.
- Onboarding tutorial / first-run carousel — not part of splash.

## Files to create
- `src/hooks/useRiseIn.ts` — the shared `.q-rise` entrance hook (round 2; also consumed by S2 Login).

## Files to modify
- `app/index.tsx` — replace the placeholder `<Redirect href="/(auth)/login" />` with the splash UI + auth-bootstrap redirect logic described above.
- `docs/COMPONENTS.md` — add the `Hooks (src/hooks/)` section with the `useRiseIn` entry (round 2).
- `app/_layout.tsx` — ensure the auth bootstrap (calling `getAccessToken` → `verifySession` → `setAuth`/`clearAuth`) runs here per ARCHITECTURE "Providers (root layout) → Auth bootstrap", so `app/index.tsx` can redirect off resolved store state. (Confirm/extend; do not duplicate the check in two places.)

## New npm dependencies
- NONE. `expo-linear-gradient`, `react-native-svg`, and `react-native-reanimated` are all in the locked stack.

## Implementation notes
- The redirect must be idempotent and run after fonts are loaded (`app/_layout.tsx` already gates rendering on `useFonts`). Do not flash the splash, then unmount and remount.
- Prefer `router.replace` (not `push`) so the splash is not in the back stack.
- The 2s cap: implement a `Promise.race([verifySession(...), timeout(2000)])`-style guard; on timeout default to the unauthenticated path (Login) to avoid hanging on a slow/offline network.
- **The minimum hold must be `Promise.all`'d with the bootstrap, never awaited after it** — see "Navigation triggers". Sequencing them would sum to 3.8s and blow the SCOPE ceiling. Clear the hold's timer on unmount.
- **Animate transforms, not layout**: the bar fill is a full-width view scaled with `scaleX` from `transformOrigin: 'left'`, not an animated `width`. Same visual as the prototype's CSS `width: 0% → 100%`, but it runs on the UI thread and triggers no relayout per frame.
- **Testing the animations**: stub `react-native-reanimated` so every `with*` helper resolves to its **end value** (`withTiming: (to) => to`, `withDelay: (_d, anim) => anim`, `withRepeat: (anim) => anim`) and `useAnimatedStyle: (cb) => cb()`. Assertions then see the settled frame instead of racing the animation. The stub needs `Animated.Text` (not just `Animated.View`) and an `Easing` with `bezier`. Drive the minimum hold with `jest.useFakeTimers()` + `jest.advanceTimersByTime` inside `act`.
- The `apiClient` currently has no 401-refresh retry (see `src/lib/api/client.ts`); for splash this is fine — any non-OK response throws and is treated as unauthenticated.
- Accessibility: mark the gradient as non-accessible (`accessible={false}` / `importantForAccessibility="no"`). Expose the "CARREGANDO" text to screen readers as a status (`accessibilityRole`/live region) so the loading state is announced.
- Brand colors on `QuadraLogo` are fixed and must not be themed; do not pass color props.
