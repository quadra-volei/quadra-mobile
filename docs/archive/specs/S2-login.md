# Screen Spec: S2 — Login

> ## Amendment — 2026-10-05: real login (supersedes the mock-first notes below)
>
> Johny approved wiring S2 to the real backend (own JWT; SMS via Twilio Verify; Google ID token validated by the backend — no Cognito). Where this amendment and the original text disagree, the amendment wins.
>
> - **`useRequestOtp` is real**: `POST /api/v1/auth/login/sms-otp` `{ step: "initiate", phoneNumber }`. It succeeds for any valid number (no separate signup; the account is created when the code is verified in S3). Failures reject with a pt-BR message the screen already renders through the `PhoneInput` `error` prop (429 → "Muitas tentativas…", 422 → "Este número não pode receber SMS.", no network → "Sem conexão…").
> - **`useGoogleSignIn` is real**: native Google Sign-In through `@react-native-google-signin/google-signin` (added to CLAUDE.md "Locked stack"; needs a Dev Client rebuild) yields a Google ID token, which is exchanged at `POST /api/v1/auth/login/google` for the Quadra session. Both tokens are saved to `expo-secure-store`. `hasProfile` is `false` for a new account, otherwise `onboardingCompleted` from the backend profile (`GET /api/v1/profiles/me`).
> - **New inline error (no toast)**: if Google sign-in fails, a `text-caption text-danger` line (`accessibilityLiveRegion="polite"`, `testID="google-error"`) appears under the Google button. Dismissing the Google account picker is **not** an error — nothing is shown.
> - Hook signatures, layout, navigation and every other acceptance criterion are unchanged.
> - Configuration: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Web OAuth client — the same value as the backend's `Auth:Google:ClientId`), `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (+ its reversed form as `iosUrlScheme` in `app.json`).

> ✅ **scope-guardian: APPROVED** (round 3 — mock-first auth; inline sheet; in-memory token; typed-route hrefs)

## Origin
- Screen from SCOPE: S2 — Login
- Layer: 1 (Match Core — entry/auth)
- Requested by: human (renanortega.dev@gmail.com)

## Reference assets read
- [x] `docs/references/screens/S2-login/login.png` (welcome/intro state)
- [x] `docs/references/screens/S2-login/login-acesse-sua-conta.png` (phone login bottom sheet — "ACESSE SUA CONTA")
- Both PNGs exist on disk and were read. No prototype source exists; the PNGs are the only layout reference.

## Mock-first auth note (read this first)
This iteration ships S2 with **fully mocked auth**. Per the human's decision, Google Sign-In **stays in scope** but **everything auth-related is FAKE/MOCKED** — no real network call, no real backend path asserted, no real Google SDK. The two TanStack Query mutations (`useRequestOtp`, `useGoogleSignIn`) wrap **deterministic, test-friendly fake async functions** that simulate latency and resolve success. The human will wire the real FA.3 OTP request, real FA.2 Google exchange, and the real Google native package **later**, replacing the mock internals behind the same hook signatures. Every mock is marked in code with `// MOCK:` and `// TODO(real-api):`. This dissolves the previous backend-dependency and npm-dependency blockers.

## Notable divergences from the prototype
- Sheet shows **"Esqueceu a senha?"** link — **NOT included**. Quadra is phone-first/passwordless; forgot-password is removed from scope (SCOPE S2 OUT).
- Prototype has no **"Entrar com Apple"** button and SCOPE defers it — **NOT included** (SCOPE S2 OUT; add iOS-only when design introduces it).
- No email/password form and no separate signup screen — **NOT included** (phone flow handles both; SCOPE S2 OUT).
- The intro state shows the headline as **"O JOGO COMEÇA AQUI."** (with trailing period, per `login.png`). This differs from the splash (S1), which uses the no-period form per `splash.png`. Each screen follows its own asset.

## Goal
Let a returning or new user authenticate into Quadra by entering their BR phone number to start the (mocked) SMS OTP flow, or by using (mocked) Google Sign-In — the passwordless entry point of the app.

## Route
`app/(auth)/login.tsx` — replaces the current placeholder (`<Text>Login</Text>`). Lives in the `(auth)` stack alongside `sms-otp.tsx` and `onboarding.tsx`.

## Backend dependencies
**NONE asserted this iteration — all auth is mocked.** No real endpoint path is referenced and no backend behavior is claimed to exist. The two auth mutations resolve locally:

- `src/features/auth/api/requestOtp.ts` — `useRequestOtp()` `useMutation`. Its `mutationFn` is a **FAKE async function** that simulates ~600ms latency (e.g. `await new Promise(r => setTimeout(r, 600))`) and resolves success **without any network call** — no `EXPO_PUBLIC_API_URL` fetch. Marked `// MOCK:` with a `// TODO(real-api):` note that the human replaces it with the real FA.3 OTP request later. Input: `{ phone: string }` (E.164). Output: `{ ok: true }`.
- `src/features/auth/api/googleSignIn.ts` — `useGoogleSignIn()` `useMutation`. Its `mutationFn` is a **FAKE async function** that simulates a successful Google sign-in (~600ms latency) and resolves a **stub session/user object** — no native SDK, no token exchange. Marked `// MOCK:` with `// TODO(real-api):` for the real FA.2 Google exchange. Output (stub): `{ session: { token: 'mock-google-session' }, user: { id: 'mock', name: 'Jogador', hasProfile: boolean } }`. The `hasProfile` flag is part of the stub (default `false`) and is what the success branch uses to decide Onboarding vs Home — **mocked**, not from a real profile lookup.

These mocks are **intentional for this iteration**, deterministic, and test-friendly (latency can be faked/zeroed under test). **No real backend path is asserted anywhere in this spec.**

## Existing components reused
The UI catalog (`COMPONENTS.md`) is currently empty — no `Button`, `GradientButton`, `Input`, or sheet primitive exists yet. So there is nothing to reuse beyond:
- `QuadraLogo` (`src/components/icons/QuadraLogo.tsx`) — the brand mark, rendered in the intro state and small atop the sheet's backdrop.

## New components proposed
S2 is the first screen to need form controls and a CTA. Per the COMPONENTS.md "extract when used in ≥2 screens OR encapsulates a design-system primitive" rule, the following are **design-system primitives** reused by many later screens (S3, S5, S10, S11…), so they are proposed as shared components — **not** inlined:

- `Button` — *why nothing fits*: catalog is empty; every screen needs the DESIGN_SYSTEM button variants.
  - Path: `src/components/ui/Button.tsx`
  - Props:
    ```ts
    type ButtonProps = {
      variant: 'grad' | 'primary' | 'outline' | 'outlineW' | 'ghost';
      onPress: () => void;
      children: React.ReactNode;
      disabled?: boolean;
      loading?: boolean;
      leftIcon?: React.ReactNode;
      testID?: string;
    };
    ```
  - The `grad`/`primary` variants wrap `expo-linear-gradient` (per DESIGN_SYSTEM "Buttons" + "Gradients"). Disabled `primary` renders the muted grey fill shown in `login-acesse-sua-conta.png`.
  - Will be added to COMPONENTS.md by the implementer.

- `PhoneInput` — *why nothing fits*: no input primitive exists; this is a specialized field (country selector pill + number field) used again in S10 edit-profile.
  - Path: `src/components/ui/PhoneInput.tsx`
  - Props:
    ```ts
    type PhoneInputProps = {
      value: string;           // national digits only
      onChangeText: (v: string) => void;
      country?: 'BR';          // BR only for MVP, default '+55'
      error?: string;
      testID?: string;
    };
    ```
  - MVP supports BR (+55) only; the country pill ("BR +55") is display-only (not a working multi-country selector) until SCOPE adds more countries.
  - **This is the only error-surfacing path on the screen** (see "Loading / error / empty states").

- Sheet (the "ACESSE SUA CONTA" modal panel) — **DIRECTIVE: inline it in `app/(auth)/login.tsx` this iteration. Do NOT extract a shared `BottomSheet` component yet.** S2 is the only consumer right now, so the COMPONENTS.md extraction rule (≥2 screens) is not met. Build the sheet inline using `react-native-gesture-handler` + `react-native-reanimated` (both locked), with `shadow-modal` and `rounded-card` top corners, a dimmed backdrop, tap-to-close and swipe-down-to-close, driven by the `sheetOpen` local state. Extract a reusable `src/components/ui/BottomSheet.tsx` to the catalog only when its second consumer (S11/S12) lands — not now.

- `GoogleMark` (icon) — Google "G" SVG mark for the "Entrar com Google" button's `leftIcon`.
  - Path: `src/components/icons/GoogleMark.tsx`
  - Brand SVG ported to `react-native-svg` (locked) per DESIGN_SYSTEM iconography — no inline PNG. Purely visual; does not pull in any Google SDK.

## Layout structure

The screen is **one route with two visual states**: (A) the intro/welcome view, and (B) the phone-login bottom sheet slid up over a dimmed intro backdrop. Tapping "Entrar e jogar" opens the sheet.

### State A — Intro (`login.png`)
```
<View className="flex-1 bg-surface-dark">                    {/* navy base */}
  <LinearGradient ...>                                       {/* navy→blue brand gradient (DESIGN_SYSTEM "Dark hero") */}
    <SafeAreaView className="flex-1 px-6">
      <View className="flex-1 justify-center">
        {/* brand lockup */}
        <View className="flex-row items-center">
          <QuadraLogo size={44} />
          <Text className="font-word text-text-on-dark text-4xl ml-3 lowercase">quadra</Text>
        </View>

        <Text className="font-display text-display text-text-on-dark uppercase mt-8">
          O JOGO{'\n'}COMEÇA{' '}
          <Text className="text-accent">AQUI.</Text>
        </Text>

        <Text className="font-body text-body text-text-muted mt-4">
          Encontre partidas de vôlei perto de você, monte seu time e suba no ranking.
        </Text>
      </View>

      {/* pinned CTA */}
      <View className="pb-6">
        <Button variant="grad" onPress={openSheet}>Entrar e jogar</Button>
      </View>
    </SafeAreaView>
  </LinearGradient>
</View>
```

### State B — Phone login sheet (`login-acesse-sua-conta.png`)
> The `<BottomSheet>` wrapper below is shown for readability only — implement it **inline** in the route (dimmed backdrop + animated panel via gesture-handler/reanimated driven by `sheetOpen`), not as an extracted component (see "New components proposed").
```
<BottomSheet visible={sheetOpen} onClose={closeSheet}>   {/* inline in login.tsx, not a shared component */}
  <View className="bg-white rounded-card px-6 pt-6 pb-8">
    <Text className="font-display text-h1 text-text-primary uppercase">ACESSE SUA CONTA</Text>
    <Text className="font-body text-body text-text-muted mt-1">Use seu telefone para entrar ou criar conta.</Text>

    <Text className="font-body text-eyebrow text-text-primary uppercase mt-6">Número de telefone</Text>
    <PhoneInput value={phone} onChangeText={...} country="BR" error={errors.phone?.message} />

    <Button variant="primary" onPress={onSubmit} disabled={!isValid} loading={isPending} className="mt-4">
      Entrar na Quadra
    </Button>

    {/* "ou" divider */}
    <View className="flex-row items-center my-6">
      <View className="flex-1 h-px bg-line" />
      <Text className="font-mono text-mono text-text-muted uppercase mx-3">ou</Text>
      <View className="flex-1 h-px bg-line" />
    </View>

    <Button variant="outline" onPress={onGoogle} leftIcon={<GoogleMark />}>Entrar com Google</Button>

    <Text className="font-body text-caption text-text-muted text-center mt-6">
      Ao continuar, você aceita os <Text className="text-body-bold">Termos</Text> e a{' '}
      <Text className="text-body-bold">Política de Privacidade</Text>.
    </Text>
  </View>
</BottomSheet>
```

NativeWind classes only. No `StyleSheet.create`. No hardcoded hex — gradient colors come from the `bg-gradient-cta` / `bg-gradient-primary` tokens via the `Button` variants; the navy hero gradient uses `surface-dark`→`primary` tokens (per DESIGN_SYSTEM "Dark hero areas"). The Google "G" mark is a brand SVG ported to `src/components/icons/` per DESIGN_SYSTEM iconography (no inline PNG).

## State

### Server state (TanStack Query hooks)
- `useRequestOtp()` — `src/features/auth/api/requestOtp.ts` — `useMutation` whose `mutationFn` is a **mock** (~600ms, resolves `{ ok: true }`, no network). On success, navigates to S3 with the phone number. `// TODO(real-api):` swap to FA.3 later.
- `useGoogleSignIn()` — `src/features/auth/api/googleSignIn.ts` — `useMutation` whose `mutationFn` is a **mock** (~600ms, resolves a stub `{ session, user: { hasProfile } }`, no native SDK / no exchange). On success, sets the auth store and routes to Onboarding/Home based on the stub `hasProfile`. `// TODO(real-api):` swap to FA.2 + real Google package later.

### Client state (Zustand)
- `useAuthStore` (`src/stores/auth.ts`, exists) — `setAuth(...)` is called on a successful (mocked) Google sign-in using the **stub** session/user. The SMS path does **not** set auth here — it completes in S3.
- **Token persistence constraint (non-negotiable):** the stub session token (`'mock-google-session'`) is held in the Zustand store **in-memory ONLY**. **NOTHING is written to AsyncStorage** — not even "temporarily". No persistence call is made on this screen this iteration. When the real flow lands, token persistence goes to `expo-secure-store` (keys per ARCHITECTURE, e.g. `quadra.accessToken` / `quadra.refreshToken`) — never AsyncStorage (CLAUDE.md rule 3).

### Local state
- `useState` minimal: `sheetOpen: boolean` (controls the bottom sheet). Nothing else — the phone field is owned by React Hook Form.

### Forms
- Form schema (Zod) — `loginPhoneSchema`:
  ```ts
  const loginPhoneSchema = z.object({
    phone: z.string().regex(/^\d{10,11}$/, 'Telefone inválido'), // BR national digits
  });
  ```
- React Hook Form: `useForm({ resolver: zodResolver(loginPhoneSchema), mode: 'onChange' })`. "Entrar na Quadra" is disabled until `formState.isValid`. The full E.164 value (`+55` + digits) is assembled on submit and passed to the mocked `useRequestOtp`.

## Navigation triggers
- "Entrar e jogar" (intro) → opens the bottom sheet (local state, no route change).
- Sheet backdrop tap / swipe-down → closes the sheet.
- "Entrar na Quadra" (valid phone, mocked OTP request resolves) → `router.push({ pathname: '/sms-otp', params: { phone } })` (S3).
- "Entrar com Google" (mocked success, stub `hasProfile === false`) → `router.replace('/onboarding')` (S4).
- "Entrar com Google" (mocked success, stub `hasProfile === true`) → `router.replace('/(tabs)')` (Home / S5, the tabs group root → `app/(tabs)/index.tsx`).
- Back gesture / chevron on the sheet backdrop (visible in `login-acesse-sua-conta.png`) → closes the sheet (returns to intro state A).

> **Typed-routes note:** `typedRoutes: true` is enabled (app.json). Use the typed href forms above — route groups `(auth)` are transparent in the typed href (so `/sms-otp`, `/onboarding`), and Home resolves to the `(tabs)` group root. The implementer MUST make all hrefs pass `npm run typecheck` (a PR gate); if the generated `.expo/types` union requires a slightly different form, follow the generated types — do not use legacy `navigation.navigate`.

## Permissions / external integrations
- **Google Sign-In** — **MOCKED this iteration. No native flow, no SDK, no permission prompt.** The "Entrar com Google" button stays in the UI and calls the mocked `useGoogleSignIn`. The real Google native package and OS consent flow are **deferred** to when the human wires the real FA.2 flow.
- No location/camera/contacts permissions on this screen.

## Real-time subscriptions (if any)
- None.

## Loading / error / empty states
- Loading: "Entrar na Quadra" shows the `Button` `loading` spinner while the mocked OTP mutation is in flight (button disabled). Same for "Entrar com Google" while the mocked Google mutation runs.
- Error: **all error display is constrained to the inline `PhoneInput` `error` prop path plus the disabled-button state.** Zod validation errors render via `errors.phone?.message` → `PhoneInput error` (danger token). If the mocked `useRequestOtp` is ever made to reject (e.g. to exercise the failure branch in tests), its message surfaces through the same `PhoneInput error` prop. **No toast primitive is introduced.**
- Google mutation: while mocked it always resolves, so no error UI is wired for it; if its mock is later made to reject, that is handled when the real flow lands — no toast here.
- Empty: N/A (no data list on this screen).

## Acceptance criteria
- [ ] Intro state renders the `quadra` lockup, the "O JOGO COMEÇA AQUI." display headline (with the lime "AQUI."), the subtitle, and a single "Entrar e jogar" gradient CTA over the navy→blue gradient.
- [ ] Tapping "Entrar e jogar" opens the "ACESSE SUA CONTA" bottom sheet over the dimmed intro.
- [ ] The phone field defaults to BR (+55) and accepts only digits; "Entrar na Quadra" is disabled until a valid phone is entered.
- [ ] Submitting a valid phone calls the **mocked** `useRequestOtp` mutation (no network) and, on its resolution, navigates to S3 (`sms-otp`) carrying the phone number.
- [ ] Tapping "Entrar com Google" calls the **mocked** `useGoogleSignIn` mutation (no network, no SDK); on its resolution the user lands on Onboarding (stub `hasProfile === false`) or Home (stub `hasProfile === true`).
- [ ] Invalid phone input surfaces its message via the `PhoneInput` `error` prop only — no toast is rendered anywhere.
- [ ] No "Esqueceu a senha?" link, no Apple button, and no email/password fields are rendered.
- [ ] The "ou" divider, Google button, and Terms/Privacy disclaimer are present in the sheet.
- [ ] All criteria are verifiable via RNTL against the mocked mutations (no MSW / no network) and mocked navigation.

## Out of scope (be explicit)
- Real auth backend wiring — both mutations are mocked this iteration; the human wires real FA.3 OTP and FA.2 Google exchange later (see "Mock-first auth note").
- Real Google native sign-in SDK/package — deferred to the real-flow iteration.
- "Esqueceu a senha?" link — Quadra is passwordless; removed (SCOPE S2 OUT).
- "Entrar com Apple" — deferred until design adds it; iOS-only when introduced (SCOPE S2 OUT).
- Email/password form (SCOPE S2 OUT).
- Separate signup screen — handled inline by the phone flow (SCOPE S2 OUT).
- Multi-country phone selector — BR (+55) only for MVP; the country pill is display-only.
- The actual SMS code entry/verification — that is S3.
- Onboarding form — that is S4.
- Toast / global notification primitive — not introduced; errors are inline only.

## Files to create
- `app/(auth)/login.tsx` — the screen (replaces placeholder).
- `src/components/ui/Button.tsx` — shared button (all DESIGN_SYSTEM variants).
- `src/components/ui/PhoneInput.tsx` — phone field with BR country pill (sole error surface).
- `src/components/icons/GoogleMark.tsx` — Google "G" SVG (visual only).
- (The login sheet is built **inline** in `login.tsx` — no `BottomSheet.tsx` file this iteration; extract on its 2nd consumer.)
- `src/features/auth/api/requestOtp.ts` — `useRequestOtp` mutation (**MOCK** `mutationFn`, `// TODO(real-api):` FA.3).
- `src/features/auth/api/googleSignIn.ts` — `useGoogleSignIn` mutation (**MOCK** `mutationFn` returning a stub session/user, `// TODO(real-api):` FA.2 + real Google package).

## Files to modify
- `docs/COMPONENTS.md` — add entries for `Button`, `PhoneInput` (and note the `GoogleMark` icon). Do **not** add `BottomSheet` yet — it stays inline until a 2nd consumer.
- `app/(auth)/_layout.tsx` — confirm `login` is the auth stack's initial route (no change if already correct).

## New npm dependencies
- **NONE — no stack change.** Google Sign-In is mocked, so **no Google native package is added**. There is **no CLAUDE.md stack-change flag** for this iteration. The real Google package is **deferred** to when the human wires the real flow (and only then would CLAUDE.md be updated).
- All other libraries used (`expo-linear-gradient`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-svg`, `react-hook-form`, `zod`, `@hookform/resolvers`, `@tanstack/react-query`) are already in the locked stack.

## Implementation notes
- Treat the screen as one route with `sheetOpen` local state — do **not** make the sheet a separate route (the back gesture should return to the intro, not pop the stack).
- The display headline must use `font-display` + `uppercase` (Climate Crisis is display-only/uppercase per CLAUDE.md). The lime "AQUI." is a nested `<Text className="text-accent">`.
- The `quadra` wordmark uses `font-word` (Baloo 2), lowercase only — never recase (DESIGN_SYSTEM).
- Phone formatting: store national digits in form state; assemble `+55` on submit; pass the same string to S3 so its subtitle can echo "+55 (XX) ...".
- **Mocks**: keep the mock `mutationFn` bodies trivial and deterministic (fixed latency, fixed resolved value, no randomness) so RNTL tests can assert navigation without flakiness; allow the latency to be reduced/zeroed under test. Do not import or reference `EXPO_PUBLIC_API_URL` in these mock files. Leave `// MOCK:` and `// TODO(real-api):` markers exactly where the real call will slot in, behind the unchanged hook signature.
- Accessibility: the sheet must trap focus and expose an accessible close action; the disabled CTA must be announced as disabled; the Terms/Privacy text should expose its links as separate accessible targets if they become tappable.
- Do not call any API from the screen — both auth actions go through the `src/features/auth/api/` hooks (CLAUDE.md rule 6), even while mocked.
