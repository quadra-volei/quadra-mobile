# Screen Spec: S4 — Onboarding (post-signup, first time only)

> ✅ **scope-guardian: APPROVED** (round 1) — all 11 checklist items passed; mock-first acceptable, backend-alignment gate (F2.1 fields) respected, no real endpoint asserted.

## Origin
- Screen from SCOPE: S4 — Onboarding (post-signup, first time only)
- Layer: 1 (Match Core — entry/auth/profile bootstrap)
- Requested by: human (renanortega.dev@gmail.com)

## Reference assets read
- [x] `docs/references/screens/S4-onboarding/dados-pessoais-cadastro.png` (personal-data intro step — NOME/SOBRENOME split, DATA DE NASCIMENTO, APELIDO/@handle with "SEU @ NA QUADRA" lime badge, disabled grey "Continuar", footer note)
- [x] `docs/references/screens/S4-onboarding/dados-posicao.png` (Passo 1/3 — "QUAL SUA POSIÇÃO?", 6-card 2-col grid, COR card highlighted lime when selected, "Continuar")
- [x] `docs/references/screens/S4-onboarding/dados-nivel-jogo-cadastro.png` (Passo 2/3 — "SEU NÍVEL DE JOGO", 3 full-width rows with icon + radio: Iniciante/Intermediário/Avançado)
- [x] `docs/references/screens/S4-onboarding/dados-modalidade-favorita-cadastro.png` (Passo 3/3 — "MODALIDADE FAVORITA", two large image cards: Vôlei de quadra 6x6 / Vôlei de praia 2x2)
- [x] `docs/references/screens/S4-onboarding/dados-perfil-pronto.png` (completion — full navy screen, "PERFIL COMPLETO" + 3/3 check, lime check circle, "PERFIL PRONTO!", summary rows Posição/Nível/Modalidade, "Entrar na quadra" gradient CTA)
- All five PNGs exist on disk and were read. No prototype source exists; the PNGs are the only layout reference.

## Mock-first auth note (read this first)
S4 continues the **fully mocked auth/profile** flow established in S2 and S3. Per the human's decision, **everything auth/profile-related is FAKE/MOCKED** this iteration — no real network call, no real backend path asserted, no Cognito. The single TanStack Query mutation introduced here (`useCreateProfile`) wraps a **deterministic, test-friendly fake async function** that simulates latency and resolves success. The human wires the real F2.1 profile-create call **later**, replacing the mock internals behind the same hook signature. Every mock is marked in code with `// MOCK:` and `// TODO(real-api):`, matching the convention already used in `src/features/auth/api/verifyOtp.ts`, `resendOtp.ts`, and `googleSignIn.ts`.

To keep the screen exercisable without a backend, the mock `useCreateProfile`:
- resolves success (`{ profile: { id: 'mock-profile', ...echoed input } }`) after ~600ms fixed latency, and
- on success the success handler calls `useAuthStore.setAuth`/a `setHasProfile` flag so the guard now treats the user as onboarded.

This is intentional for this iteration and is the only "persistence" logic; it is replaced by the real F2.1 create call later behind the unchanged hook signature.

## ⚠️ Backend alignment gate (must resolve before implementation)
SCOPE S4 flags: *"⚠️ new profile fields (`@handle`, `lastName`, `birthDate`, `modality`) must exist in the backend Profile model; align backend SCOPE before building."* This spec defines the **frontend** contract (Zod schema + mock hook) so the screen is buildable and testable now, but **the real F2.1 wiring is blocked** until the backend Profile model confirms these fields. The implementer must NOT claim a real endpoint exists. Mock-only this iteration; flag the gate in the PR.

## Notable divergences from the prototype
- **The personal-data step is NOT part of the "Passo X de 3" counter.** In `dados-pessoais-cadastro.png` there is no progress bar and no "Passo X de Y" label — it uses the same **navy hero strip + white card pulled up** visual language as S3, with a back chevron. The three wizard steps with the progress bar (position / level / modality) are "Passo 1/2/3 de 3"; the personal-data step precedes them as step 0. This matches SCOPE which lists personal-data as its own "IN" item separate from the numbered steps.
- **Profile photo picker is NOT included** — not in any onboarding mockup. SCOPE: *"profile photo picker — NOT in the onboarding mockup; photo is set later in S10 (Editar perfil)."*
- **Secondary position is NOT included** — single-select only. SCOPE: *"secondary position (dropped — single position only)."*
- **No tutorial slides / carousel** — SCOPE: *"tutorial slides (push to post-MVP)."*
- **No contact sync** — SCOPE Layer 3.
- The completion screen shows a small "level" glyph next to "Nível" and a globe glyph next to "Modalidade" — rendered with `lucide-react-native` general-UI icons (DESIGN_SYSTEM iconography), not custom brand SVGs.

## Goal
Let a first-time user who just authenticated build their player profile through a short wizard (personal data → position → level → modality), then commit it and enter the app.

## Route
`app/(auth)/onboarding.tsx` — replaces the current placeholder (`<Text>Onboarding</Text>`). Lives in the `(auth)` stack (`headerShown: false`). Reached from S3 via `router.replace('/onboarding')` when `hasProfile === false` (already wired in `app/(auth)/sms-otp.tsx`). The whole wizard is a **single route** with internal step state — NOT separate routes per step (steps are ephemeral UI; no deep-linking into a step is required for MVP).

## Backend dependencies
**NONE asserted this iteration — all profile creation is mocked.** No real endpoint path is referenced and no backend behavior is claimed to exist. One mutation resolves locally:
- `src/features/profile/api/createProfile.ts` — `useCreateProfile()` `useMutation`. Its `mutationFn` is a **FAKE async function** (~600ms latency, no network). Resolves a stub `{ profile: { id: 'mock-profile', ...echoedInput } }`. Marked `// MOCK:` with `// TODO(real-api):` for the real **F2.1** profile-create call. Input: the validated `OnboardingProfileInput` (see Forms).
- **TODO(real-api)** maps to backend **F2.1 (Player Profile creation)**, gated on the backend Profile model gaining `@handle`, `lastName`, `birthDate`, `modality` (see Backend alignment gate above). Do not wire until aligned.

## Existing components reused
- `Button` (`src/components/ui/Button.tsx`) — `variant="grad"` for the per-step "Continuar" and the final "Entrar na quadra" CTA (both are the screen's main CTA → blue→lime gradient per DESIGN_SYSTEM); muted disabled fill when a step is incomplete (built-in `disabled` behavior). `variant="outlineW"` is NOT needed here.
- `colors` / `HERO_GRADIENT` (`src/theme/colors.ts`) — for the navy hero strip on the personal-data step and the full-screen navy completion screen, and for `lucide` icon `color` props (no inline hex).

## New components proposed
The onboarding selectors are visually specific to this screen and are **not reused elsewhere** (S10 Editar perfil uses single-select chips, a different layout per SCOPE), so per COMPONENTS.md's "Decision log" (extract only on ≥2-screen reuse) these are built **inline in the screen**, NOT added to the catalog. Two exceptions are genuinely reusable form primitives that other auth/profile/match-create screens will also need:

- `TextField` — *why an existing one doesn't fit*: COMPONENTS.md has `PhoneInput` and `OtpInput` but **no generic labeled text input**. NOME / SOBRENOME / APELIDO all need a labeled, RHF-controlled text field with an eyebrow label, optional left adornment (the `@` prefix), optional right badge slot, and error state. This is reused by S10 (edit profile) and S11 (create match name) too.
  - Path: `src/components/ui/TextField.tsx`
  - Props: `{ label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; error?: string; leftAdornment?: ReactNode; rightSlot?: ReactNode; autoCapitalize?: 'none' | 'words'; maxLength?: number; testID?: string }`
  - Will be added to COMPONENTS.md by the implementer.
- `DateField` — *why an existing one doesn't fit*: no date input exists. DATA DE NASCIMENTO needs a `DD/MM/AAAA` masked field with a calendar leading icon, RHF-controlled, error state. Reused by S10 and S11 (match date entry, partially).
  - Path: `src/components/ui/DateField.tsx`
  - Props: `{ label: string; value: string; onChangeText: (v: string) => void; error?: string; testID?: string }`
  - Notes: value is the masked string `DD/MM/AAAA`; the Zod schema validates and parses it. No native date-picker dependency added (the mockup shows a plain masked field, not a wheel picker) — see New npm dependencies (NONE).
  - Will be added to COMPONENTS.md by the implementer.

The position grid cards, level rows, modality cards, the step progress bar, and the completion summary rows are **one-off inline `<View>`/`<Pressable>` compositions** within `onboarding.tsx` — not extracted.

## Layout structure

Token references only; NativeWind classes; no hex; no `StyleSheet.create`.

### Step 0 — Personal data (`dados-pessoais-cadastro.png`)
```
<View className="flex-1 bg-surface-dark">           # navy base
  <LinearGradient colors={HERO_GRADIENT}>            # navy → blue hero strip
    <SafeAreaView>
      <Pressable> <ChevronLeft /> </Pressable>       # back chevron, bg-surface-dark/40 rounded-full
  <View className="absolute inset-x-0 bottom-0 bg-white rounded-card shadow-modal px-6 pt-6 pb-8">
    <View className="flex-row gap-4">
      <TextField label="NOME" autoCapitalize="words" />        # text-eyebrow label
      <TextField label="SOBRENOME" autoCapitalize="words" />
    <DateField label="DATA DE NASCIMENTO" className="mt-4" />
    <View className="mt-4 bg-bg-light-alt rounded-card p-4">   # APELIDO group block
      <View className="flex-row items-center justify-between">
        <Text className="text-eyebrow text-text-primary">APELIDO</Text>
        <View className="bg-accent rounded-pill px-3 py-1">    # "SEU @ NA QUADRA" lime badge
          <Text className="text-mono text-text-primary uppercase">SEU @ NA QUADRA</Text>
      <TextField leftAdornment={<Text className="font-num text-primary">@</Text>}
                 autoCapitalize="none" />                       # "@ renan"
      <Text className="text-caption text-text-muted mt-2">É assim que a galera vai te encontrar e marcar nas partidas.</Text>
    <Button variant="grad" disabled={!stepValid} className="mt-6">Continuar</Button>
    <Text className="text-caption text-text-muted text-center mt-4">Você poderá editar essas informações depois no seu perfil.</Text>
```

### Steps 1–3 — wizard (position / level / modality)
```
<View className="flex-1 bg-bg-light">
  <SafeAreaView className="px-4">
    <View className="flex-row items-center justify-between">
      <Text className="text-mono text-text-muted uppercase">MONTE SEU PERFIL</Text>
      <Text className="text-mono text-text-muted uppercase">Passo {n} de 3</Text>
    <View className="flex-row gap-2 mt-2">                       # 3-segment progress bar
      {segments.map(filled => <View className={filled ? 'bg-primary' : 'bg-line'} className="flex-1 h-1.5 rounded-pill" />)}
    <Text className="font-display text-display text-text-primary uppercase mt-6">QUAL SUA POSIÇÃO?</Text>  # step title varies
    <Text className="text-body text-text-muted mt-2">Escolha onde você joga melhor. Isso equilibra os times nas partidas.</Text>

    # Step 1 — position: 2-col grid of 6 Pressable cards
    <View className="flex-row flex-wrap gap-3 mt-6">
      <Pressable className="w-[48%] bg-white rounded-card p-4 shadow-card {selected ? 'bg-accent' : ''}">
        <Text className="font-display text-h1 text-primary uppercase">LEV</Text>   # abbrev (primary on light; COR selected card -> text-primary on lime)
        <Text className="text-h3 text-text-primary mt-2">Levantador</Text>
        <Text className="text-caption text-text-muted mt-1">Distribui e arma o jogo</Text>
      ...  # PON, OPO, CEN, LIB, COR (COR shows ★ + "Joga em qualquer posição")

    # Step 2 — level: 3 full-width Pressable rows
    <Pressable className="bg-white rounded-card p-4 shadow-card flex-row items-center mt-3">
      <View className="h-12 w-12 rounded-chip bg-bg-light-alt items-center justify-center"><BarChart3 /></View>
      <View className="flex-1 ml-4">
        <Text className="text-h3 text-text-primary">Iniciante</Text>
        <Text className="text-caption text-text-muted">Ainda aprendendo as regras e fundamentos</Text>
      <View className="h-6 w-6 rounded-full border-2 {selected ? 'border-primary bg-primary' : 'border-line'}" />  # radio

    # Step 3 — modality: 2 large image-style Pressable cards
    <Pressable className="bg-white rounded-card shadow-card overflow-hidden mt-4">
      <LinearGradient ...>  # navy/blue gradient "court" art (quadra) / cyan→blue (praia)
      <View className="p-4">
        <Text className="text-h3 text-text-primary">Vôlei de quadra</Text>
        <Text className="text-caption text-text-muted">Clássico 6x6, na quadra coberta</Text>

  <View className="px-4 pb-8">                                   # pinned footer
    <Button variant="grad" disabled={!stepValid}>Continuar</Button>
```

### Completion (`dados-perfil-pronto.png`)
```
<View className="flex-1 bg-surface-dark">
  <LinearGradient colors={HERO_GRADIENT}>     # full-screen navy hero
    <SafeAreaView className="flex-1 px-6">
      <View className="flex-row items-center justify-between">
        <Text className="text-mono text-text-on-dark uppercase">PERFIL COMPLETO</Text>
        <Text className="text-mono text-text-on-dark uppercase">✓ 3/3</Text>
      <View className="flex-row gap-2 mt-2">  # all 3 segments bg-accent (lime, complete)
      <View className="items-center mt-10">
        <View className="h-20 w-20 rounded-full bg-accent items-center justify-center"><Check /></View>
        <Text className="font-display text-display text-text-on-dark uppercase mt-6">PERFIL PRONTO!</Text>
        <Text className="text-body text-text-on-dark/70 text-center mt-2">Já dá pra montar times equilibrados pra você. Bora encontrar partidas perto e entrar em quadra.</Text>
      <View className="mt-8 gap-3">           # summary rows on a translucent dark card
        <SummaryRow label="Posição" value="Coringa" badge="COR" />
        <SummaryRow label="Nível" value="Iniciante" />
        <SummaryRow label="Modalidade" value="Vôlei de quadra" />
      <View className="flex-1" />
      <Button variant="grad" loading={createProfile.isPending}>Entrar na quadra</Button>
```

## State

### Server state (TanStack Query hooks)
- `useCreateProfile()` — `src/features/profile/api/createProfile.ts` (MOCK this iteration; F2.1 later). `useMutation`. Fired only on the completion screen's "Entrar na quadra".

### Client state (Zustand)
- `useAuthStore` (`src/stores/auth.ts`, already exists) — on profile-create success, mark the user onboarded so the route guard stops redirecting to onboarding. The store currently exposes `hasProfile` via `setAuth`; a minimal `setHasProfile(true)` setter should be added (small store extension) OR re-call `setAuth` with the existing `userId`/`accessToken` and `hasProfile: true`. Prefer adding `setHasProfile` to avoid re-passing the token.

### Local state
- `useState` for the current step index only: `step: 0 | 1 | 2 | 3 | 4` (0 = personal data, 1 = position, 2 = level, 3 = modality, 4 = completion). Step transitions are `setStep(step + 1)` / back chevron `setStep(step - 1)` (or `router.back()` at step 0).
- No other ad-hoc `useState` — all field values and the three single-selects live in React Hook Form.

### Forms (RHF + Zod)
One form spanning the whole wizard (single `useForm`, values accumulate across steps), schema in `src/features/profile/schema/onboarding.ts`:

```ts
export const onboardingSchema = z.object({
  firstName: z.string().trim().min(1, 'Informe seu nome'),
  lastName: z.string().trim().min(1, 'Informe seu sobrenome'),
  birthDate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Data inválida'), // DD/MM/AAAA, refine to a real past date
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, '@ inválido'),
  position: z.enum(['LEV', 'PON', 'OPO', 'CEN', 'LIB', 'COR']),
  level: z.enum(['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']),
  modality: z.enum(['INDOOR', 'BEACH']), // Vôlei de quadra 6x6 / Vôlei de praia 2x2
});
export type OnboardingProfileInput = z.infer<typeof onboardingSchema>;
```
- `useForm` with `zodResolver(onboardingSchema)`, `mode: 'onChange'` so per-step "Continuar" enablement is derived from `formState` validity of that step's fields (use `trigger([...stepFields])` on Continuar, or scope validity per step).
- `TextField` / `DateField` wired via `Controller`. The three single-selects (`position`, `level`, `modality`) are also RHF-controlled via `Controller` (no raw `useState`), satisfying the "no uncontrolled inputs" rule.
- On the final step, `handleSubmit(onValid)` → `createProfile.mutate(values)`.

## Navigation triggers
- Step 0 back chevron → `router.back()` (returns toward S3/S2). Steps 1–3 back → `setStep(step - 1)` (internal), no route change.
- Personal-data "Continuar" → validate step-0 fields → `setStep(1)`.
- Position/level "Continuar" → validate → `setStep(step + 1)`.
- Modality "Continuar" → validate → `setStep(4)` (completion).
- Completion "Entrar na quadra" → `createProfile.mutate(...)` → on success `setHasProfile(true)` then `router.replace('/(tabs)')` (Home).

## Permissions / external integrations
- NONE. No location, no camera, no photo picker (photo deferred to S10), no Google SDK on this screen.

## Real-time subscriptions (if any)
- None for this screen.

## Loading / error / empty states
- **Loading**: only the final mutation has a spinner — `Button loading={createProfile.isPending}` on "Entrar na quadra" (disables press, swaps to `ActivityIndicator` per Button contract). Steps are local, no skeletons.
- **Error**: per-field validation errors render inline under `TextField`/`DateField` via the `error` prop (`danger` token) — the sole error-surfacing path, consistent with `PhoneInput`. If `createProfile` rejects (mock won't, but the real F2.1 can), show an inline `text-danger` message below the final CTA with `accessibilityLiveRegion="polite"` and keep the user on the completion screen to retry (no navigation on error). No toast.
- **Empty**: N/A — this is a form, not a data list.

## Acceptance criteria
- [ ] Reached only when `hasProfile === false` after auth (S3 already routes here via `router.replace('/onboarding')`); a user with a profile never sees it.
- [ ] Step 0 collects NOME, SOBRENOME, DATA DE NASCIMENTO, and APELIDO/@handle; "Continuar" is disabled until all four are valid.
- [ ] APELIDO field shows the `@` adornment and the "SEU @ NA QUADRA" lime badge; helper text is present.
- [ ] Position step (Passo 1 de 3) shows exactly 6 single-select cards (LEV, PON, OPO, CEN, LIB, COR); selecting one highlights it and enables "Continuar"; only one can be selected.
- [ ] Level step (Passo 2 de 3) offers exactly Iniciante / Intermediário / Avançado, single-select.
- [ ] Modality step (Passo 3 de 3) offers exactly Vôlei de quadra (6x6) and Vôlei de praia (2x2), single-select.
- [ ] Progress header reads "MONTE SEU PERFIL" / "Passo X de 3" and the segmented bar fills 1→2→3 across the wizard.
- [ ] Completion screen ("PERFIL PRONTO!") summarizes the chosen posição, nível, and modalidade.
- [ ] "Entrar na quadra" fires `useCreateProfile`, shows a loading spinner, and on success navigates to Home (`/(tabs)`) with the user marked onboarded.
- [ ] No profile-photo step, no secondary position, no tutorial slides appear anywhere.
- [ ] All inputs are RHF-controlled; no raw `useState` holds form values.

## Out of scope (be explicit)
- Profile photo / "Trocar foto" — Layer/S10; the prototype has none here. Set later in S10 (Editar perfil).
- Secondary position — dropped per SCOPE; single position only.
- Tutorial / onboarding carousel slides — post-MVP per SCOPE and the global NOT-in-MVP list.
- Contact sync — Layer 3.
- Any real F2.1 network call — blocked on backend Profile-model alignment (see Backend alignment gate); mocked this iteration.

## Files to create
- `app/(auth)/onboarding.tsx` — the wizard screen (replaces the placeholder).
- `src/components/ui/TextField.tsx` — new reusable labeled text field.
- `src/components/ui/DateField.tsx` — new reusable masked date field.
- `src/features/profile/schema/onboarding.ts` — Zod schema + `OnboardingProfileInput` type.
- `src/features/profile/api/createProfile.ts` — `useCreateProfile` (MOCK; F2.1 later).

## Files to modify
- `docs/COMPONENTS.md` — add entries for `TextField` and `DateField`.
- `src/stores/auth.ts` — add a minimal `setHasProfile(true)` setter (or reuse `setAuth`).
- (No change to `app/(auth)/_layout.tsx` — `headerShown: false` already covers this route; no change to `app/(auth)/sms-otp.tsx` — it already `router.replace('/onboarding')`.)

## New npm dependencies
- NONE. The masked date field uses a plain `TextInput` with manual masking (the mockup shows `DD/MM/AAAA` text, not a wheel/native picker) — no `@react-native-community/datetimepicker`. RHF, Zod, and the resolver are already in the locked stack.

## Implementation notes
- Reuse the exact S3 hero-strip + white-card pattern for step 0 (`app/(auth)/sms-otp.tsx` is the reference) so the visual language is consistent — import `HERO_GRADIENT`/`colors` from `src/theme/colors.ts`; never inline hex.
- Climate Crisis (`font-display`) is uppercase-only — apply `uppercase` to all step titles and "PERFIL PRONTO!". Numbers/abbreviations like position codes (LEV/PON…) on cards are uppercase display text; the `@` glyph in the handle field uses `font-num` (Russo One) per the mockup's stylized `@`.
- Accessibility: each position/level/modality `Pressable` needs `accessibilityRole="button"`, `accessibilityState={{ selected }}`, and a label (e.g. "Levantador"); the level radio communicates selection via `accessibilityState`, not color alone. The "Continuar" disabled state must be reflected in `accessibilityState` (Button already does this).
- `mode: 'onChange'` keeps per-step CTA enablement reactive but call `trigger(stepFields)` before advancing so the user sees inline errors if they tap a disabled-looking control; do not advance on invalid.
- Mark every mock with `// MOCK:` / `// TODO(real-api):` exactly as the existing auth hooks do; do NOT assert any real endpoint path.
- Keep the wizard a single route — do not split steps into separate files; step state is ephemeral and deep-linking into a step is not required for MVP.
