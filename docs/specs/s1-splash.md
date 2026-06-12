# Screen Spec: S1 — Splash

## Origin
- Screen from SCOPE: S1 — Splash
- Layer: 1
- Requested by: Renan (human)

## Reference assets read
- [x] `docs/references/screens/S1-splash/splash.png` (single state — the only asset for this screen)
- No prototype `.jsx` source exists for S1 per SCOPE line 34 ("no prototype source — splash not implemented in the React Web prototype; brand mockup only"). Nothing missing.
- **Confirm**: There is no shared `.jsx` for this screen, so there are no sibling components to ignore. ✅

## Notable divergences from the prototype
The reference PNG is a **brand welcome mockup**, not a true splash. It shows a tappable "Entrar e jogar" CTA, a hero headline ("O JOGO COMEÇA AQUI."), and body copy ("Encontre partidas de vôlei perto de você, monte seu time e suba no ranking."). SCOPE.md is the source of truth for **behavior**, and SCOPE defines S1 as a **non-interactive, auto-redirecting splash (2s max, no user interaction)**. Per the source-of-truth hierarchy (SCOPE wins on behavior), this spec resolves the conflict as follows:

- Prototype shows an **"Entrar e jogar" CTA button** — **NOT included**. SCOPE line 41 explicitly lists "any user interaction" as OUT. The splash auto-redirects; there is no button. (The "enter the app" intent is served by S2 — Login.)
- Prototype's hero headline + body copy — **retained as static brand visual only** (no interaction), consistent with SCOPE line 37 ("brand visual ... centered logo"). They render as decorative display type during the ≤2s window. If the human prefers a logo-only splash, that is also SCOPE-compliant — flagged below under Implementation notes.
- Navy gradient background + blue blob / lime wave — **included** per SCOPE line 37 and DESIGN_SYSTEM "Visual personality cues".

## Goal
Show the Quadra brand for up to 2 seconds while the app checks the stored auth session, then automatically route the user to the correct next screen — no interaction required.

## Route
`app/index.tsx` (root) — Expo Router root index acting as the splash + redirect gate. Already scaffolded as a placeholder `<Redirect>`; this spec replaces it with the auth-check splash.

## Backend dependencies
- `GET /api/v1/auth/me` (backend Auth module) — used to verify the stored token is still valid and to determine whether a Player Profile exists (drives the Onboarding-vs-Home branch per `ARCHITECTURE.md` "Auth flow").
- No new endpoint introduced. If `GET /api/v1/auth/me` is not yet defined in the backend SCOPE, STOP and align backend first.
- SCOPE line 36 says "Backend deps: none" for the *rendering* of the splash. The redirect logic consumes the existing Auth `me` endpoint already mandated by `ARCHITECTURE.md`; this is not a new dependency for the project, only for this screen's branch logic.

## Existing components reused
- `Screen` (layout) — base safe-area wrapper. NOTE: catalog is currently empty, so this does not yet exist (see New components). If S1 is implemented before any layout primitive lands, the wrapper is inlined here.
- Logo mark + "quadra" wordmark — brand SVG (`Icone-quadra-logo.svg`) + Baloo 2 wordmark per DESIGN_SYSTEM "Logo & wordmark" / "Iconography". These are brand assets to port into `src/components/icons/`, not catalog components.

## New components proposed
- `<BrandBackdrop>` — *why an existing one doesn't fit*: the catalog is empty and no decorative background layer (navy gradient + blue blob + lime wave) exists. This visual is reused on S2 (Login) per DESIGN_SYSTEM "organic shapes in backgrounds (splash/login)", so it meets the "≥ 2 screens" extraction rule.
  - Path: `src/components/layout/BrandBackdrop.tsx`
  - Props: `{ children: React.ReactNode }`
  - Renders an `expo-linear-gradient` navy backdrop (`linear-gradient(165deg, #0c0c52 0%, #0A0A3C 55%, #08083a 100%)` → exposed as a design-system gradient util, not raw hex) with absolutely-positioned decorative blob/wave SVG layers behind `children`.
  - Will be added to COMPONENTS.md by the implementer.
- `<Wordmark>` — *why an existing one doesn't fit*: the "quadra" lockup (logo mark + Baloo-2 wordmark) is reused on Splash and Login, and the casing/color rules are strict (lowercase, never recolored). Encapsulating prevents misuse.
  - Path: `src/components/ui/Wordmark.tsx`
  - Props: `{ size?: 'sm' | 'md' | 'lg'; tone?: 'onDark' | 'onLight' }`
  - Will be added to COMPONENTS.md by the implementer.

> If the implementer prefers to inline these for S1 and extract on S2, that is acceptable per the catalog "extract only when reuse happens" rule — but both screens are in-scope, so proposing them now is justified.

## Layout structure

```
<BrandBackdrop>                      // surface-dark navy gradient + blob/wave layers, full screen
  <SafeAreaView className="flex-1 px-6">
    <View className="flex-1 justify-center">
      <Wordmark tone="onDark" size="lg" />        // logo mark + "quadra" (Baloo 2, lowercase)
      <Text className="font-display uppercase text-display text-text-on-dark mt-6">
        O jogo começa aqui.
      </Text>
      <Text className="font-body text-body text-text-on-dark/80 mt-4">
        Encontre partidas de vôlei perto de você, monte seu time e suba no ranking.
      </Text>
    </View>
    // NO CTA button — auto-redirect per SCOPE (no user interaction)
  </SafeAreaView>
</BrandBackdrop>
```

- `font-display` is **always uppercase** (DESIGN_SYSTEM) — applied via `uppercase`.
- All colors via tokens: `text-text-on-dark`, navy gradient util on `BrandBackdrop`. No raw hex.
- No `StyleSheet.create`; NativeWind classes only.

## State

### Server state (TanStack Query hooks)
- `useAuthMe()` — `src/features/auth/api/getMe.ts`. `useQuery` wrapping `GET /api/v1/auth/me`. Drives the branch: valid session + profile → Home; valid session, no profile → Onboarding; invalid/absent → Login. (If this hook does not yet exist, it is created here; it is also consumed by the app's auth bootstrap.)

### Client state (Zustand)
- `useAuthStore` (`src/stores/auth.ts`) — reads/sets `isAuthenticated` / current user after the token check. Created if it does not exist yet (it is foundational for the whole app).

### Local state
- `useState` only for: a minimum-display guard so the brand shows for a perceptible-but-bounded time. A single `minTimeElapsed: boolean` flag flipped by a `setTimeout` (≤ 2000ms, SCOPE cap). The redirect fires only after both the token check resolves AND `minTimeElapsed` is true (whichever is later, capped at 2s).

### Forms (if any)
- None. This screen has no inputs.

## Navigation triggers
All triggers are **automatic** (no taps):
- Valid token + profile exists → `router.replace('/(tabs)')` (Home, S5)
- Valid token + no profile → `router.replace('/(auth)/onboarding')` (S4)
- No/invalid token → `router.replace('/(auth)/login')` (S2)
- Use `router.replace` (not `push`) so the splash is removed from the back stack.

## Permissions / external integrations
- NONE. Location, notifications, camera permissions are requested lazily by their own screens, never here.

## Real-time subscriptions (if any)
- None.

## Loading / error / empty states
- **Loading**: the splash *is* the loading state. The brand visual renders while `useAuthMe()` is in-flight.
- **Error / network failure** (cannot reach `auth/me`): treat a hard failure as "not authenticated" and `router.replace('/(auth)/login')` after the 2s cap, rather than blocking the user on the splash indefinitely. (A 401/invalid token also routes to Login.) Do not show a visible error toast on the splash — fail forward to Login.
- **Empty**: N/A.
- Timeout: if `auth/me` has not resolved within the 2s cap, proceed as "not authenticated" → Login, and let the next screen reconcile.

## Acceptance criteria
- [ ] On cold start, the navy brand splash (logo + wordmark + hero copy) is visible.
- [ ] The splash auto-redirects with **no user interaction** (SCOPE line 41).
- [ ] Total splash display never exceeds 2000ms (SCOPE line 39 / line 40 — no animation longer than 2s).
- [ ] When a valid token + existing profile is present, the user lands on Home (S5).
- [ ] When a valid token but no profile is present, the user lands on Onboarding (S4).
- [ ] When no/invalid token is present (or `auth/me` fails), the user lands on Login (S2).
- [ ] The splash uses `router.replace`, so pressing back from the destination does not return to the splash.
- [ ] No CTA button or tappable element is rendered (verifiable: no `Pressable`/`button` role in the tree).
- [ ] All colors/typography come from DESIGN_SYSTEM tokens (no raw hex in the screen).

## Out of scope (be explicit)
- "Entrar e jogar" CTA from the mockup — OUT (SCOPE: no user interaction; entering the app is S2's job).
- Any animation longer than 2 seconds (SCOPE line 40).
- Onboarding tutorial / carousel (SCOPE "What is NOT in MVP").
- Token refresh logic UI — the silent refresh single-flight lives in `lib/auth`, not on this screen.
- Light/dark mode toggle — app is light-first; the splash is intentionally dark (brand hero), not a theme.

## Files to create
- `app/index.tsx` — the splash + redirect gate (replaces current placeholder `<Redirect>`).
- `src/features/auth/api/getMe.ts` — `getMe` + `useAuthMe()` query hook (if not exists).
- `src/stores/auth.ts` — `useAuthStore` (if not exists).
- `src/components/layout/BrandBackdrop.tsx` — new component (if proposed/approved).
- `src/components/ui/Wordmark.tsx` — new component (if proposed/approved).
- `src/components/icons/QuadraLogo.tsx` — ported brand SVG mark (from prototype `uploads/Icone-quadra-logo.svg`).

## Files to modify
- `docs/COMPONENTS.md` — add entries for `BrandBackdrop`, `Wordmark` (and the logo icon if treated as catalog).
- `tailwind.config.js` — confirm the navy hero gradient util and `font-display`/`font-word` tokens exist (per DESIGN_SYSTEM); add if missing.
- `app/_layout.tsx` — ensure brand fonts (Climate Crisis, Baloo 2, DM Sans) are loaded before the splash renders, per CLAUDE.md font-loading pattern. (The splash needs `font-display` + `font-word`.)

## New npm dependencies
- NONE beyond the locked stack. Uses `expo-linear-gradient`, `react-native-svg`, `expo-font` + `@expo-google-fonts/*`, `expo-secure-store` — all already in CLAUDE.md.

## Implementation notes
- **2s cap is a hard ceiling, not a fixed delay.** If `auth/me` resolves in 300ms, redirect as soon as the min-display flag (kept short, e.g. 600–800ms) allows — do not wait the full 2s. The 2s is the maximum, per SCOPE.
- **Fail forward.** Never trap the user on the splash. Any unresolved/errored auth check after the cap → Login.
- **Native splash vs. JS splash.** Expo's `expo-splash-screen` shows the static OS splash before JS mounts. This screen is the *JS-rendered* brand splash that runs the redirect logic; keep them visually consistent (same navy) to avoid a flash. Call `SplashScreen.hideAsync()` once fonts are loaded and this screen is ready.
- **Fonts must be loaded first** (CLAUDE.md). If fonts are still loading, keep the native splash up rather than rendering fallback system fonts for `font-display`.
- **Accessibility**: the hero copy should be exposed to screen readers (`accessibilityRole="header"` on the headline). Because there is no interaction and the screen is transient, avoid auto-stealing focus; announce the brand name once.
- **Headline-vs-logo-only decision**: this spec keeps the mockup's hero copy as static brand visual. If the human/PM prefers a minimal logo-only splash (closer to a classic splash), drop the two `<Text>` blocks — both variants are SCOPE-compliant. Flag for confirmation before implementation.
