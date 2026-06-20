# Screen Spec: S3 — SMS Verification

> ✅ **scope-guardian: APPROVED** (round 3) — all 11 checklist items pass. Prior rejections (raw hex literals → shared `src/theme/colors.ts` token module; `h-14 w-14` spacing → `h-16 w-16`) resolved.

## Origin
- Screen from SCOPE: S3 — SMS Verification
- Layer: 1 (Match Core — entry/auth)
- Requested by: human (renanortega.dev@gmail.com)

## Reference assets read
- [x] `docs/references/screens/S3-sms-otp/sms-otp.png` (empty / initial state — disabled "Verificar", "Reenviar em 0:26" countdown)
- [x] `docs/references/screens/S3-sms-otp/sms-otp-preenchido.png` (filled state — 4 digits entered, gradient "Verificar" enabled, active "Reenviar código" link)
- Both PNGs exist on disk and were read. No prototype source exists; the PNGs are the only layout reference.

## Mock-first auth note (read this first)
S3 continues the **fully mocked auth** flow established in S2. Per the human's decision, **everything auth-related is FAKE/MOCKED** this iteration — no real network call, no real backend path asserted, no Cognito. The two TanStack Query mutations introduced here (`useVerifyOtp`, `useResendOtp`) wrap **deterministic, test-friendly fake async functions** that simulate latency and resolve success. The human wires the real FA.3 verify/resend calls **later**, replacing the mock internals behind the same hook signatures. Every mock is marked in code with `// MOCK:` and `// TODO(real-api):` — exactly matching the convention already used in `src/features/auth/api/requestOtp.ts` and `googleSignIn.ts`.

To keep the screen exercisable without a backend, the mock `useVerifyOtp`:
- resolves success for a **fixed canonical code** `"1234"` (so the happy path is deterministic in tests and demos), and
- **rejects** for any other 4-digit code (so the error state — shake + red border — is reachable).
This is intentional for this iteration and is the only "validation" logic; it is replaced by the real FA.3 verify call later behind the unchanged hook signature.

## Notable divergences from the prototype
- The prototype's chat-bubble glyph in the dark strip above the sheet is a generic **message icon**, not the Quadra brand mark — rendered with a `lucide-react-native` icon (`MessageSquare`) per DESIGN_SYSTEM iconography (general UI icons come from Lucide). It is **not** `QuadraLogo`.
- The prototype uses a **persistent card pulled up over a navy strip** (same visual language as the S2 sheet), but S3 is a **full route, not a swipe-dismissible bottom sheet** — there is no swipe-to-close and no backdrop tap-to-close. Dismissal is via the back chevron / "Usar outro número" only (SCOPE: "Usar outro número" → back to S2). This matches the fact that S3 is its own route (`app/(auth)/sms-otp.tsx`) in ARCHITECTURE.
- The prototype shows exactly **4 digit boxes** — kept at 4 (SCOPE: "codes longer than 4 digits" are OUT, locked by Cognito config).
- The error state (shake + red border for a wrong code) has **no mockup reference**; per SCOPE it follows the DESIGN_SYSTEM `danger` token. Documented here, not invented beyond the token system.

## Goal
Let a user who just requested an SMS code confirm their phone number by entering the 4-digit OTP, then proceed into the app (Onboarding for new users, Home for returning users) — with the ability to resend the code after a countdown or go back to change the number.

## Route
`app/(auth)/sms-otp.tsx` — replaces the current placeholder (`<Text>Verificar SMS</Text>`). Lives in the `(auth)` stack (`headerShown: false`), reached from S2 via `router.push({ pathname: '/sms-otp', params: { phone } })`. Reads `phone` (E.164, e.g. `+5531999999999`) from route params via `useLocalSearchParams`.

## Backend dependencies
**NONE asserted this iteration — all auth is mocked.** No real endpoint path is referenced and no backend behavior is claimed to exist. Two auth mutations resolve locally:

- `src/features/auth/api/verifyOtp.ts` — `useVerifyOtp()` `useMutation`. Its `mutationFn` is a **FAKE async function** (~600ms latency, no network). Resolves a **stub session/user** `{ session: { token: 'mock-otp-session' }, user: { id: 'mock', name: 'Jogador', hasProfile: false } }` **only when** `code === '1234'`; otherwise it **rejects** with `new Error('Código inválido')`. Marked `// MOCK:` with `// TODO(real-api):` for the real FA.3 verify call. Input: `{ phone: string; code: string }`. The stub mirrors the shape returned by the existing mocked `googleSignIn` so the success branch reuses the same `setAuth` + Onboarding/Home routing.
- `src/features/auth/api/resendOtp.ts` — `useResendOtp()` `useMutation`. A **FAKE async function** (~600ms latency, no network) resolving `{ ok: true }`. Marked `// MOCK:` / `// TODO(real-api):` FA.3 resend. Input: `{ phone: string }`. (Could alias `requestOtp`, but is kept as its own hook so the real resend endpoint can differ from the initial request later.)

These mocks are **intentional, deterministic, and test-friendly** (latency can be zeroed under test). **No real backend path is asserted anywhere in this spec.** When the real flow lands, the success token persists to `expo-secure-store` (keys per ARCHITECTURE) — never AsyncStorage (CLAUDE.md rule 3).

## Existing components reused
- `Button` (`src/components/ui/Button.tsx`) — the "Verificar" CTA. Variant `grad` (blue→lime) when enabled — matches the gradient shown in `sms-otp-preenchido.png` and DESIGN_SYSTEM's listing of "Começar partida"-style primary CTAs as `bg-gradient-cta`. When all 4 digits are not yet filled, render `disabled` (the Button's disabled state already produces the muted `bg-bg-light-alt` grey fill with no shadow, matching `sms-otp.png`). Uses `loading` while the mocked verify mutation is in flight.
- `QuadraLogo` — **not used here** (the dark-strip glyph is a Lucide message icon, see divergences). Listed only to record the deliberate decision.

## New components proposed
- `OtpInput` — *why nothing fits*: no segmented-code input exists in the catalog; `PhoneInput` is a single masked field and does not fit auto-advancing per-digit boxes with focus management and an error/shake state. This is a reusable auth primitive (a 4-box OTP field) and encapsulates non-trivial focus + paste + a11y behavior, qualifying under the COMPONENTS.md "complex enough to deserve its own tests" rule.
  - Path: `src/components/ui/OtpInput.tsx`
  - Props:
    ```ts
    type OtpInputProps = {
      value: string;                 // the joined code, 0–4 digits
      onChangeText: (code: string) => void;
      length?: 4;                    // fixed 4 for MVP (Cognito-locked); default 4
      error?: boolean;              // drives red border + shake trigger
      autoFocus?: boolean;
      onFilled?: (code: string) => void; // fired when all `length` digits entered
      testID?: string;
    };
    ```
  - Behavior: renders `length` boxes; typing a digit auto-advances focus to the next box; backspace on an empty box moves focus back; accepts a pasted/autofilled full code (iOS SMS autofill via `textContentType="oneTimeCode"` / Android `autoComplete="sms-otp"`) and distributes it across boxes. Empty boxes use `border-line`; filled boxes use `border-primary` (per `sms-otp-preenchido.png`, where filled boxes have a blue border); `error` swaps to `border-danger`. The shake animation uses `react-native-reanimated` (locked) — a brief horizontal oscillation on `error` becoming true.
  - Will be added to COMPONENTS.md by the implementer.

## Shared color token module (new — fixes the raw-hex violation)
`lucide-react-native` icons and `expo-linear-gradient` require **runtime JS color values** for their `color` / `colors` props — Tailwind/NativeWind classes cannot be passed there. To satisfy DESIGN_SYSTEM rule 3 / CLAUDE.md rule 2 (no hardcoded hex in screens) without copying `login.tsx`'s pre-existing inline violation, a single shared, named token module is introduced as the **one source of truth** for these JS-side color values, keyed by their DESIGN_SYSTEM token names and mirroring `tailwind.config.js`:

- Path: `src/theme/colors.ts`
- Exports:
  ```ts
  // Mirrors tailwind.config.js theme.extend.colors — one source of truth for
  // color values needed at runtime by non-NativeWind props (lucide `color`,
  // LinearGradient `colors`). Screens NEVER inline hex; they import from here.
  export const colors = {
    surfaceDark: '#0A0A3C',   // surface-dark
    primary: '#1A1AFF',       // primary
    textOnDark: '#FFFFFF',    // text-on-dark / white (icon on dark)
    danger: '#DC2626',        // danger
  } as const;

  // Navy → blue brand hero gradient, derived from the tokens above.
  export const HERO_GRADIENT = [colors.surfaceDark, colors.primary] as const;
  ```
- The S3 screen imports `colors` and `HERO_GRADIENT` from this module for the `LinearGradient` `colors` prop and the Lucide icon `color` props (`color={colors.textOnDark}`). **No inline hex appears anywhere in `app/(auth)/sms-otp.tsx`.**

## Layout structure

One route, one scroll-free view: a navy gradient strip at top (with back chevron + message icon), then a white rounded card filling the rest. Both filled/empty states are the **same layout** — only the digit boxes' fill, the CTA enabled/disabled state, and the resend link (countdown vs active) differ.

```
import { colors, HERO_GRADIENT } from '@/theme/colors';

<View className="flex-1 bg-surface-dark">
  <LinearGradient colors={HERO_GRADIENT} ...>           {/* navy→blue brand hero (surface-dark → primary), same as S2 */}
    <SafeAreaView className="flex-1">
      {/* back chevron over the dark strip */}
      <Pressable onPress={goBackToLogin} accessibilityRole="button" accessibilityLabel="Voltar"
                 className="ml-4 mt-2 h-10 w-10 rounded-full bg-surface-dark/40 items-center justify-center">
        <ChevronLeft size={24} color={colors.textOnDark} />     {/* lucide; text-on-dark token (icon on dark) */}
      </Pressable>

      {/* message glyph centered in the dark strip */}
      <View className="items-center mt-2">
        <View className="h-16 w-16 rounded-card bg-white/10 items-center justify-center">
          <MessageSquare size={28} color={colors.textOnDark} /> {/* lucide message icon, not the brand mark */}
        </View>
      </View>
    </SafeAreaView>
  </LinearGradient>

  {/* white card pulled up over the strip */}
  <View className="absolute inset-x-0 bottom-0 bg-white rounded-card shadow-modal px-6 pt-6 pb-8"
        style={{ minHeight: SHEET_MIN_HEIGHT }}>
    <Text className="font-display text-h1 text-text-primary uppercase">CONFIRME SEU NÚMERO</Text>
    <Text className="font-body text-body text-text-muted mt-2">
      Enviamos um código de 4 dígitos por SMS para{' '}
      <Text className="font-body text-body-bold text-text-primary">{displayPhone}</Text>.
    </Text>

    {/* 4 digit boxes */}
    <View className="mt-6">
      <OtpInput value={code} onChangeText={setCode} error={isError} autoFocus
                onFilled={onVerify} testID="otp-input" />
    </View>

    <View className="mt-6">
      <Button variant="grad" onPress={onVerify}
              disabled={code.length < 4} loading={verifyOtp.isPending} testID="verify-otp">
        Verificar
      </Button>
    </View>

    {/* resend: countdown (disabled) → active link */}
    <View className="items-center mt-6">
      {secondsLeft > 0 ? (
        <Text className="font-body text-body text-text-muted">
          Não recebeu? Reenviar em{' '}
          <Text className="font-mono text-body-bold text-text-primary">{mmss}</Text>
        </Text>
      ) : (
        <Button variant="ghost" onPress={onResend} loading={resendOtp.isPending} testID="resend-otp">
          Reenviar código
        </Button>
      )}
    </View>

    {/* back to S2 */}
    <View className="items-center mt-2">
      <Button variant="ghost" onPress={goBackToLogin} testID="change-number">
        Usar outro número
      </Button>
    </View>
  </View>
</View>
```

NativeWind classes only. No `StyleSheet.create`. **No hardcoded hex anywhere in this screen** — the two raw color props that `lucide-react-native` and `LinearGradient` require (white for icons on the dark strip via `colors.textOnDark`, and the navy→blue hero gradient via `HERO_GRADIENT`) are imported from the shared `src/theme/colors.ts` token module, which mirrors the `text-on-dark` / `surface-dark`→`primary` tokens in `tailwind.config.js` as the single source of truth. The "Verificar" gradient comes from the `Button` `grad` variant (`bg-gradient-cta` token) — not hardcoded on this screen. The "Usar outro número" prototype label is muted text; using a `ghost` Button keeps it a real, testable, accessible control while reading as a low-emphasis link (DESIGN_SYSTEM `ghost` = tertiary link).

## State

### Server state (TanStack Query hooks)
- `useVerifyOtp()` — `src/features/auth/api/verifyOtp.ts` — `useMutation`, **mock** (`code === '1234'` resolves a stub session/user; otherwise rejects). On success: `setAuth(...)` then route to Onboarding/Home by stub `hasProfile`. `// TODO(real-api):` FA.3 verify.
- `useResendOtp()` — `src/features/auth/api/resendOtp.ts` — `useMutation`, **mock** (~600ms, resolves `{ ok: true }`). On success: restart the countdown. `// TODO(real-api):` FA.3 resend.

### Client state (Zustand)
- `useAuthStore` (`src/stores/auth.ts`, exists) — `setAuth({ userId, accessToken, hasProfile })` is called on a successful (mocked) verify, using the stub session/user (mirrors the S2 Google path). **Token held in-memory only** this iteration — **NOTHING written to AsyncStorage** (CLAUDE.md rule 3); real persistence to `expo-secure-store` lands with the real flow.

### Local state
- `useState` minimal:
  - `code: string` — the joined 0–4 digit OTP (the segmented field's source of truth; not server data, so plain `useState` is correct here — this is not a React Hook Form case because it's a single auto-advancing token field, not a multi-field form).
  - `secondsLeft: number` — resend countdown, initialized to `30` (prototype shows `0:26` mid-countdown, ~30s start per SCOPE), decremented by a `setInterval` in an effect; reset to `30` after a successful resend.
  - `isError: boolean` — set true when the mocked verify rejects (drives `OtpInput error` → red border + shake); cleared on the next edit.

### Forms (if any)
- **None.** The 4-digit OTP is a single auto-advancing token field, not a multi-field form. Per the ARCHITECTURE/CLAUDE rule, React Hook Form + Zod governs *forms*; a single segmented code field is handled by the `OtpInput` component + local `code` state. (Validation that matters — "exactly 4 digits" — is enforced by the field length and the disabled CTA; correctness is the server/mock's job.)

## Navigation triggers
- Back chevron (dark strip) → `router.back()` (returns to S2 / login). If there is no back entry, `router.replace('/login')`.
- "Usar outro número" → same as back: `router.back()` → S2 (SCOPE: "→ back to S2").
- "Verificar" (or auto-submit when the 4th digit is entered) with the **mocked** verify resolving:
  - stub `hasProfile === false` → `router.replace('/onboarding')` (S4).
  - stub `hasProfile === true` → `router.replace('/(tabs)')` (Home / S5).
- "Reenviar código" (after countdown hits 0) → calls mocked `useResendOtp`, restarts the countdown; no route change.

> **Typed-routes note:** `typedRoutes: true` is enabled. Use the typed href forms above (route group `(auth)` is transparent: `/onboarding`, `/login`; Home resolves to the `(tabs)` group root → `app/(tabs)/index.tsx`). All hrefs MUST pass `npm run typecheck` (PR gate); if the generated `.expo/types` union requires a slightly different form, follow the generated types — never use legacy `navigation.navigate`.

## Permissions / external integrations
- **NONE.** No camera/location/contacts. (iOS one-time-code SMS autofill via `textContentType="oneTimeCode"` and Android `autoComplete="sms-otp"` are OS keyboard affordances, **not** permission prompts and require no SDK.)

## Real-time subscriptions (if any)
- None.

## Loading / error / empty states
- Loading: "Verificar" shows the `Button` `loading` spinner (button disabled) while the mocked verify mutation is in flight; "Reenviar código" shows its spinner while the mocked resend runs.
- Error: a wrong code (mock rejects when `code !== '1234'`) sets `isError` → `OtpInput` renders `border-danger` and triggers the shake animation (reanimated). The error clears as soon as the user edits a digit. **No toast primitive is introduced** (consistent with S2 — errors are inline only). The DESIGN_SYSTEM `danger` token is the sole error color.
- Empty: N/A — there is no data list. The "empty" code state is simply the disabled-CTA initial state shown in `sms-otp.png`.

## Acceptance criteria
- [ ] The screen renders the navy→blue hero strip with a back chevron and a message icon, then a white card with the "CONFIRME SEU NÚMERO" display headline.
- [ ] The subtitle echoes the phone passed from S2 (e.g. "Enviamos um código de 4 dígitos por SMS para +55 (31) 23121-3312.").
- [ ] Four separate digit boxes are shown; typing a digit auto-advances focus to the next box; backspace on an empty box moves focus to the previous box.
- [ ] "Verificar" is disabled (muted grey, no shadow) until all 4 digits are entered, then becomes the blue→lime gradient CTA.
- [ ] Submitting the code calls the **mocked** `useVerifyOtp` (no network); on its resolution the user lands on Onboarding (stub `hasProfile === false`) or Home (stub `hasProfile === true`).
- [ ] Entering an incorrect code (anything other than the mock's canonical `"1234"`) surfaces the error state (red border + shake) and renders no toast.
- [ ] The resend control shows "Reenviar em M:SS" counting down (~30s) and is non-interactive during the countdown; at 0 it becomes an active "Reenviar código" link.
- [ ] Tapping "Reenviar código" calls the **mocked** `useResendOtp` and restarts the countdown.
- [ ] "Usar outro número" and the back chevron both return to S2 (login).
- [ ] Exactly 4 boxes are rendered (no 5/6-digit variant).
- [ ] All criteria are verifiable via RNTL against the mocked mutations (no MSW / no network) and mocked navigation/route params.

## Out of scope (be explicit)
- Real auth backend wiring — `useVerifyOtp` / `useResendOtp` are mocked this iteration; the human wires real FA.3 verify/resend later (see "Mock-first auth note").
- Codes longer than 4 digits — locked by Cognito config (SCOPE S3 OUT); `OtpInput` length is fixed at 4 for MVP.
- Token persistence — held in-memory in the Zustand store only; nothing written to AsyncStorage; real `expo-secure-store` persistence lands with the real flow.
- Toast / global notification primitive — not introduced; the wrong-code error is inline (red border + shake) only.
- Swipe-to-dismiss / backdrop-tap-to-close — S3 is a full route, not a bottom sheet; dismissal is the back chevron / "Usar outro número" only.
- The phone entry itself (S2) and the onboarding form (S4).

## Files to create
- `app/(auth)/sms-otp.tsx` — the screen (replaces the placeholder).
- `src/components/ui/OtpInput.tsx` — segmented 4-box auto-advancing OTP field with error/shake state.
- `src/theme/colors.ts` — shared, named brand color token module (mirrors `tailwind.config.js`) exporting `colors` (`surfaceDark`, `primary`, `textOnDark`, `danger`) and the derived `HERO_GRADIENT`; the single source of truth for JS-side color props (Lucide `color`, LinearGradient `colors`) so no screen inlines hex.
- `src/features/auth/api/verifyOtp.ts` — `useVerifyOtp` mutation (**MOCK** `mutationFn`; canonical `"1234"` resolves a stub session/user, else rejects; `// TODO(real-api):` FA.3 verify).
- `src/features/auth/api/resendOtp.ts` — `useResendOtp` mutation (**MOCK** `mutationFn` resolving `{ ok: true }`; `// TODO(real-api):` FA.3 resend).

## Files to modify
- `docs/COMPONENTS.md` — add an entry for `OtpInput`.
- `app/(auth)/login.tsx` — **small pre-existing-violation cleanup**: refactor to import `HERO_GRADIENT` / `colors` from the new `src/theme/colors.ts` instead of its local inlined `const HERO_GRADIENT = ['#0A0A3C', '#1A1AFF']` (line 27) and inline `color="#FFFFFF"` on `ChevronLeft` (line 200). This **extracts** the existing hex violation into the shared token module rather than letting S3 duplicate it — keeping one source of truth across the auth stack. No behavior or layout change; tokens are identical.
- (No change to `app/(auth)/_layout.tsx` — `sms-otp` is already a route in the auth stack with `headerShown: false`.)

## New npm dependencies
- **NONE — no stack change.** OTP verification is mocked, so no Cognito/SMS SDK is added. All libraries used (`expo-linear-gradient`, `react-native-reanimated`, `react-native-safe-area-context`, `lucide-react-native`, `@tanstack/react-query`, `zustand`) are already in the locked stack. The real verify/resend SDK (if any) is deferred to the real-flow iteration (and only then would CLAUDE.md be updated).

## Implementation notes
- Echo the phone from S2 verbatim: read `phone` (E.164) from `useLocalSearchParams`, then format it for display as "+55 (XX) XXXXX-XXXX" (reuse the `formatBR` logic that already lives in `PhoneInput.tsx` — consider lifting that formatter to a small `src/lib/phone.ts` helper so both the field and this subtitle share it, rather than duplicating). Do not refetch or re-derive the number from anywhere else.
- Auto-submit when the 4th digit lands (`onFilled`) for a snappy flow, but keep "Verificar" as an explicit fallback control (and the only path while a digit is missing). Guard against double-submit while `verifyOtp.isPending`.
- Countdown: drive `secondsLeft` from a single `setInterval` cleared on unmount; format as `M:SS` with the seconds in `font-mono` (the prototype renders the timer in a mono face). Start at 30; reset to 30 on successful resend; never let it go negative.
- Keep the mock `mutationFn` bodies trivial and deterministic (fixed latency, fixed canonical code, no randomness) so RNTL can assert both the success and the error branch without flakiness; allow latency to be zeroed under test. Do not import or reference `EXPO_PUBLIC_API_URL` in these mock files. Leave `// MOCK:` and `// TODO(real-api):` markers where the real call slots in, behind the unchanged hook signatures — matching `requestOtp.ts`/`googleSignIn.ts`.
- Do not call any API from the screen — both actions go through `src/features/auth/api/` hooks (CLAUDE.md rule 6), even while mocked.
- Accessibility: each box exposes an accessible label ("Dígito 1 de 4", …); the shake/red-border error also surfaces an `accessibilityLiveRegion="polite"` status text ("Código inválido, tente novamente") for screen readers; the disabled "Verificar" is announced as disabled; the countdown text is a polite live region so the resend availability is announced when it flips to active.
- The display headline must use `font-display` + `uppercase` (Climate Crisis is display-only/uppercase per CLAUDE.md).
- **No raw hex in any screen.** The hero gradient and the on-dark icon colors come from the shared `src/theme/colors.ts` module (`HERO_GRADIENT` and `colors.textOnDark`), which mirrors the `surface-dark`→`primary` and `text-on-dark` tokens in `tailwind.config.js`. `app/(auth)/login.tsx` is refactored to consume the same module so the auth stack has a single source of truth for these JS-side color values — do **not** reintroduce a local `['#0A0A3C', '#1A1AFF']` constant or inline `#FFFFFF`.
