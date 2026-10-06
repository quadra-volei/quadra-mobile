# Screen Spec: S11 — Create Match

> ## ⚠️ REVISION 2026-07-10 — "formulário vivo" (progressive disclosure) full port
> The screen was **re-implemented as a conversational, progressive-disclosure form** — a faithful port of the Quadra prototype `screens-create.jsx` (`app.jsx` playmenu → this flow). Owner-approved ("Full faithful port"). Sections below that describe the earlier **single-page** form are **superseded** where they conflict; the mock-transport, success-screen, and navigation contracts are unchanged.
>
> **What changed:**
> - **UX**: one scrolling flow where each answer reveals the next block (`Reveal`), a top **progress bar**, and a **sticky footer CTA** that reads "Responda pra continuar" (disabled) until the whole flow validates, then "Criar partida".
> - **Datetime / recurring / invite are now IN** (previously STOP). The schema gained: `whenType` (Hoje/Amanhã/Outra data) + `customDate`; a **recurring scheduler** (`recDays`, `recFreq`, `recStart`); **time-of-day** (`time`, presets + "Outro horário" masked input) + **duration**; a separate **monthly price** (`priceMonthly`); and **privacy** as `privacy: 'open' | 'private'` + `inviteMode: 'code' | 'guests'` (replacing the old `isOpen` boolean). `players` is now auto-set from the format via `SUGGESTED_PLAYERS` (no manual stepper); `format`/`level`/`type` are chosen via `OptionCard`s.
> - Conditional requirements are enforced by a Zod `superRefine` (+ `isCreateMatchComplete` for the footer gate). `resolveMatchStartsAt` now takes the input object (schedule + time), not a single quick-date string.
> - The presentational primitives `Reveal` / `Question` / `OptionCard` are **inlined** in `app/matches/create.tsx` (single-use to this flow) — no new COMPONENTS.md catalog entries; `FilterChip` / `StepperField` / `DateField` / `SearchField` / `TextField` / `CoverPicker` / `Button` are reused.
> - Tests rewritten: `tests/features/matches/screens/CreateMatchScreen.test.tsx` (conversational reveal + OneOff/Recurring paths + footer gate) and `tests/features/matches/lib/buildMatchDetail.test.ts` (new `resolveMatchStartsAt` signature + `privacy`).
>
> ---
>
> Revised after scope-guardian REJECTION (round 1, fixed) and a subsequent change adding the TIPO + CONFIRMAÇÕES ABREM controls. The earlier DESIGN GAP STOP on Recurring/OneOff + confirmation-window is now LIFTED and the controls are designed token-free via the existing `FilterChip` primitive (no new design token). The QUANDO "+" custom-date chip and any match time-of-day entry remain STOP (not authorized, still no token).
>
> The user authorized designing these controls ("You can add those elements of Recurring/OneOff toggle (Recorrente/Avulso) and select confirmation-window, you have the power to choose how it can be, in future i will adjust if needs."). The design below is conservative — reuses an existing primitive, invents no token, fully reversible — so a future adjustment is cheap.

## Origin
- Screen from SCOPE: S11 — Create Match
- Layer: 1 (Match Core)
- Requested by: human (renanortega.dev@gmail.com)

## Reference assets read
- [x] `docs/references/screens/S11-create-match/partida-criar-formulario.png` (the form — back chevron + "CRIAR PARTIDA" title; navy "CAPA DA PARTIDA" cover block with "Trocar capa"; NOME DA PARTIDA text field ("Ex: Racha de Quinta"); LOCAL search field with a MapPin ("Buscar quadra ou endereço"); QUANDO quick chips "Hoje / Amanhã / Sex / Sáb / +"; FORMATO chips "2x2 / 4x4 / 6x6" (6x6 selected); NÍVEL chips "Iniciante / Intermediário / Avançado" (Intermediário selected); VAGAS & VALOR two boxed numeric fields "Jogadores 12" / "Valor / pessoa R$ 25"; PRIVACIDADE "Partida aberta" toggle row with a lock icon; "Criar partida" gradient CTA)
- [x] `docs/references/screens/S11-create-match/partida-criada.png` (success — navy screen, lime check circle, "PARTIDA CRIADA!" display title, subtitle "Sua partida está no ar. Convide a galera e bora jogar!", and three stacked CTAs: "Ver a partida criada" (gradient), "Convidar jogadores" (white-outline, share icon), "Voltar ao início" (white-outline))
- Both PNGs exist on disk and were read. No prototype source exists; the PNGs are the only layout reference.
- **TIPO and CONFIRMAÇÕES ABREM are NOT in either PNG** — they are added per the user-authorized design, rendered with the existing `FilterChip` primitive exactly like FORMATO/NÍVEL so they stay visually consistent and token-free.

## Mock-first data note (read this first)
S11 is a **write** screen. The backend match-create endpoint (F1.1) is **not built yet** and SCOPE defines no concrete path. Following the convention locked in S2–S8 (`requestOtp.ts`, `verifyOtp.ts`, `createProfile.ts`, `getNearby.ts`), this iteration ships the create mutation as a **deterministic, test-friendly MOCK** via TanStack Query `useMutation` — **no network, no `EXPO_PUBLIC_API_URL` fetch, no asserted backend path**. The `mutationFn` resolves a fixed stub `{ match: { id } }` after a short fake latency (latency overridable to 0 under test), marked `// MOCK:` with `// TODO(real-api):` pointing at F1.1, replaceable behind the unchanged hook signature once the backend match module lands. The **payload shape is now final** (it includes `type` + `confirmationOpensHoursBefore`); only the transport is mocked.

## Recurring/OneOff + confirmation window — RESOLVED (was DESIGN GAP)
The earlier STOP on the F1.1-required match **type** and **confirmation window** is **lifted** (user-authorized; the user explicitly said they can be designed now and adjusted later if needed). Because DESIGN_SYSTEM has **no datetime-picker token**, these are designed **without inventing one**, reusing the existing `FilterChip` primitive exactly like FORMATO/NÍVEL:

- **TIPO** — single-select `FilterChip` group: **"Avulso"** (default → `type: 'OneOff'`) and **"Recorrente"** (→ `type: 'Recurring'`). Placed right after NÍVEL.
- **CONFIRMAÇÕES ABREM** — single-select `FilterChip` **preset** group: **"48h antes"**, **"24h antes"** (default), **"12h antes"**, **"6h antes"**. Maps to `confirmationOpensHoursBefore: 48 | 24 | 12 | 6`. The window **opens X hours before** the match and **closes at match start** (implicit — no separate close control, no datetime picker). Placed after VAGAS & VALOR, before PRIVACIDADE.

> The confirmation window is modeled as a relative "opens X hours before, closes at match start" **preset** precisely because no datetime-picker token exists — this avoids inventing one. **A future design may replace these preset chips with explicit open/close datetime pickers** once DESIGN_SYSTEM defines a picker token; the schema/payload field (`confirmationOpensHoursBefore`) is shaped so that swap is additive, and `type` is independent of it.

## Datetime — STOP (this iteration, retained)
DESIGN_SYSTEM lists no date/time-picker token. The following were **not authorized** and still have no token, so they remain STOP (distinct from the now-resolved confirmation-window preset above, which uses no datetime picker):
- The **QUANDO "+" custom-date chip** (in the mockup) — OUT this iteration.
- **Any match time-of-day entry** — OUT this iteration.
- QUANDO ships **only** the quick-date chips that map to a concrete relative day: "Hoje", "Amanhã", "Sex", "Sáb" (single-select, resolved by a pure relative-day formatter — no picker).

## Notable divergences from the prototype
- **TIPO (Avulso/Recorrente) + CONFIRMAÇÕES ABREM (48/24/12/6h) — ADDED** (not in the PNG) per the user-authorized design, via `FilterChip` (token-free). Required by backend F1.1.
- **QUANDO "+" custom-date chip + time entry — NOT included (STOP).** No date/time token exists; deferred (see "Datetime — STOP").
- **"Convidar jogadores" (success CTA) does NOT open an inline invite UI.** SCOPE S11 OUT. No invite flow/route is specced in MVP. **Decision (definitive): route it to S12 `/matches/[id]` with the new match id** (the organizer view's "Convidar" entry, per SCOPE S12). Not conditional, not disabled.
- **No description field** — correctly OUT per SCOPE (not in mockup).
- **LOCAL is free text only** — no geocoding/venue-search endpoint exists in SCOPE; the field captures a plain string (no autocomplete).
- The cover block shows a "CAPA DA PARTIDA" eyebrow + dashed "Trocar capa" affordance — kept (cover picker IN per SCOPE).

## Goal
Lets an authenticated organizer create a new match (cover, name, location, quick date, format, level, type, slots, price, confirmation window, open/private) and, on success, see a confirmation with follow-up CTAs.

## Route
`app/matches/create.tsx` — reached via `router.push('/matches/create')` (from S5 Home "Criar partida" and the bottom-nav central "Jogar" FAB). Presented as a **stack** screen (not inside the `(tabs)` group), so no tab bar shows. The header (back chevron + "CRIAR PARTIDA" title) is **inlined** in the screen the same way S5/S8 inline theirs — there is no `Header` primitive in the catalog (see "No assumed primitives").

## Backend dependencies

> ### ⚠️ Scope override (owner-approved) — same posture as S5/S8
> Per CLAUDE/agent rule #10, an undefined backend endpoint would normally STOP the spec. The project owner (renanortega.dev@gmail.com) has, for the match screens, consciously approved shipping **fully mocked** ahead of backend alignment. S11 follows that locked convention for the create mutation.
> - **(a) Not yet in backend SCOPE:** a concrete path for **F1.1** (create match) is **not yet aligned** in quadra-api. The F1.1 contract may also require a **structured-venue/geo** field that the free-text LOCAL cannot supply — this remains unresolved.
> - **(b) Conscious decision:** the owner approves shipping S11's create call **fully mocked** this iteration.
> - **(c) Explicit follow-up (gating real wiring):** wiring the real F1.1 call is **BLOCKED only by the unresolved structured-venue/geo question** — NOT by type/confirmation-window, which are now designed and ship in the final payload shape. The hook signature is designed so the transport swap is path-only behind the unchanged interface.

**NONE asserted this iteration — the create is MOCKED.** No real endpoint path is referenced and no backend behavior is claimed to exist. One `useMutation` hook resolves locally (mirroring `src/features/profile/api/createProfile.ts`):

- `src/features/matches/api/createMatch.ts` — `useCreateMatch()`. `mutationFn` is a **FAKE async function** (~600ms fake latency, no network) resolving a fixed stub `{ match: { id } }` echoing a generated id. The payload it receives is the **final** `CreateMatchInput` (now including `type` + `confirmationOpensHoursBefore`). Marked `// MOCK:` / `// TODO(real-api):` → backend **F1.1**. On success: `queryClient.invalidateQueries({ queryKey: ['matches'] })` so S5's upcoming/nearby lists refetch.

> Mutation has no cache key; the success invalidation targets `['matches']`. No `EXPO_PUBLIC_API_URL` is imported in the mock file.

## No assumed primitives — header / safe-area shell
The catalog (COMPONENTS.md) has **no** `Screen`, `Header`, or `IconButton` component, and S5/S8 deliberately inline their shell + header. S11 reuses that **same inline pattern** — it does NOT reference undeclared primitives and does NOT propose new ones for the shell:

- **Screen shell**: `<View className="flex-1 bg-bg-light">` wrapping `<SafeAreaView edges={['top']} className="flex-1">` (identical to S5/S8).
- **Header**: an inline `<View className="flex-row items-center gap-3 px-4 pt-2 pb-4">` with a back affordance + the title. The back affordance is an inline `<Pressable accessibilityRole="button" accessibilityLabel="Voltar">` wrapping a lucide `ChevronLeft` colored via `colors.surfaceDark` — the same `Pressable` + lucide-icon pattern S5/S8 use for their header actions. No `IconButton` component is introduced.

## Existing components reused
- `Button` (`src/components/ui/Button.tsx`) — `variant="grad"` for "Criar partida" (main CTA) and the success "Ver a partida criada"; `variant="outlineW"` for the success "Convidar jogadores" (with a lucide `Share2` `leftIcon`) and "Voltar ao início" (white-border on the navy success screen).
- `TextField` (`src/components/ui/TextField.tsx`) — RHF-controlled "NOME DA PARTIDA" (`placeholder="Ex: Racha de Quinta"`).
- `SearchField` (`src/components/ui/SearchField.tsx`) — "LOCAL" / "Buscar quadra ou endereço" (catalog note: "Designed for reuse by S11"). Presentational (not RHF-native); its value is bridged into RHF via `onChangeText` → `setValue('location', text)`. (The mockup shows a leading MapPin while SearchField renders a leading Search icon — **deferred as a separate catalog note**, NOT changed as part of S11.)
- `FilterChip` (`src/components/ui/FilterChip.tsx`) — QUANDO quick-date chips (Hoje / Amanhã / Sex / Sáb), FORMATO (2x2 / 4x4 / 6x6), NÍVEL (Iniciante / Intermediário / Avançado), **TIPO (Avulso / Recorrente)**, and **CONFIRMAÇÕES ABREM (48h / 24h / 12h / 6h)**. Catalog note: "Designed for reuse by S11 (date/format/level chips)" — the TIPO + confirmation chips reuse the exact same single-select pattern. Controlled by the RHF value.
- `colors` / `CTA_GRADIENT` / `HERO_GRADIENT` (`src/theme/colors.ts`) — runtime color values for lucide icon `color` props (ChevronLeft, MapPin/Lock/Share2/Check) and the navy `LinearGradient` of the cover block and success screen. No inline hex.

## New components proposed
The catalog has no numeric stepper, no boolean switch row, and no cover-image picker. These three are reusable beyond S11 (S10, S12 organizer setup) and are proposed with justification; if the implementer finds any genuinely single-use, it may be inlined per the catalog's "extract only when reuse happens" rule.

- `StepperField` — *why nothing fits*: `TextField` is free-text; "Jogadores 12" / "Valor / pessoa R$ 25" are boxed numeric fields with a large `font-num` value. No numeric/currency stepper exists.
  - Path: `src/components/ui/StepperField.tsx`
  - Props:
    ```ts
    type StepperFieldProps = {
      label: string; value: number; onChange: (v: number) => void;
      min?: number; max?: number; step?: number; prefix?: string; testID?: string;
    };
    ```
  - RHF-controlled via `Controller`. Value `font-num`; constrained to `[min, max]`.
- `ToggleField` — *why nothing fits*: no boolean switch row exists; "PRIVACIDADE / Partida aberta" is a lock icon + title + caption + RN `Switch`.
  - Path: `src/components/ui/ToggleField.tsx`
  - Props:
    ```ts
    type ToggleFieldProps = {
      icon?: ReactNode; title: string; caption?: string;
      value: boolean; onValueChange: (v: boolean) => void; testID?: string;
    };
    ```
- `CoverPicker` — *why nothing fits*: `Avatar` is a circular display image; this is a rectangular cover banner (navy `HERO_GRADIENT`, "CAPA DA PARTIDA" eyebrow, dashed frame, pencil + "Trocar capa", chosen image after a pick).
  - Path: `src/components/domain/CoverPicker.tsx`
  - Props:
    ```ts
    type CoverPickerProps = { uri?: string; onPress: () => void; testID?: string; };
    ```
  - The consuming screen runs `expo-image-picker` (see Permissions).

All three will be added to COMPONENTS.md by the implementer (if extracted).

## Layout structure

Token references only; NativeWind classes; no hex; no `StyleSheet.create`. Mirrors the S5/S8 inline-header + scroll shell. **Section order**: Cover → NOME → LOCAL → QUANDO → FORMATO → NÍVEL → **TIPO** → VAGAS & VALOR → **CONFIRMAÇÕES ABREM** → PRIVACIDADE → CTA.

```
<View className="flex-1 bg-bg-light">
  <SafeAreaView edges={['top']} className="flex-1">

    # ── Header (inline; back + title — no Header/IconButton primitive) ──
    <View className="flex-row items-center gap-3 px-4 pt-2 pb-4">
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={router.back}>
        <ChevronLeft color={colors.surfaceDark} />
      </Pressable>
      <Text className="font-display text-h1 text-text-primary uppercase">Criar partida</Text>
    </View>

    <ScrollView contentContainerClassName="px-4 pb-8">

      # ── Cover picker (navy HERO_GRADIENT block, rounded-card) ──
      <CoverPicker uri={coverUri} onPress={pickCover} testID="cover-picker" />

      # ── NOME DA PARTIDA ──
      <Text className="text-eyebrow text-text-primary mt-6">NOME DA PARTIDA</Text>
      <Controller name="name" control={control} render={({ field, fieldState }) => (
        <TextField label="" value={field.value} onChangeText={field.onChange}
                   placeholder="Ex: Racha de Quinta" error={fieldState.error?.message} />
      )} />

      # ── LOCAL (free text; SearchField bridged into RHF) ──
      <Text className="text-eyebrow mt-6">LOCAL</Text>
      <SearchField value={location} placeholder="Buscar quadra ou endereço"
                   onChangeText={(t) => { setLocation(t); setValue('location', t, { shouldValidate: true }); }} />

      # ── QUANDO (quick-date chips ONLY — no "+" / no time this iteration) ──
      <Text className="text-eyebrow mt-6">QUANDO</Text>
      <View className="flex-row gap-2 flex-wrap">
        <FilterChip label="Hoje"   selected={day==='today'}    onPress={() => setDay('today')} />
        <FilterChip label="Amanhã" selected={day==='tomorrow'} onPress={() => setDay('tomorrow')} />
        <FilterChip label="Sex"    selected={day==='fri'}      onPress={() => setDay('fri')} />
        <FilterChip label="Sáb"    selected={day==='sat'}      onPress={() => setDay('sat')} />
      </View>

      # ── FORMATO (default 6x6) ──
      <Text className="text-eyebrow mt-6">FORMATO</Text>
      <View className="flex-row gap-2">
        <FilterChip label="2x2" selected={format==='2X2'} onPress={() => setValue('format','2X2')} />
        <FilterChip label="4x4" selected={format==='4X4'} onPress={() => setValue('format','4X4')} />
        <FilterChip label="6x6" selected={format==='6X6'} onPress={() => setValue('format','6X6')} />
      </View>

      # ── NÍVEL (default Intermediário) ──
      <Text className="text-eyebrow mt-6">NÍVEL</Text>
      <View className="flex-row gap-2">
        <FilterChip label="Iniciante"     selected={level==='INICIANTE'}     onPress={() => setValue('level','INICIANTE')} />
        <FilterChip label="Intermediário" selected={level==='INTERMEDIARIO'} onPress={() => setValue('level','INTERMEDIARIO')} />
        <FilterChip label="Avançado"      selected={level==='AVANCADO'}      onPress={() => setValue('level','AVANCADO')} />
      </View>

      # ── TIPO (NEW — default Avulso/OneOff) ──
      <Text className="text-eyebrow mt-6">TIPO</Text>
      <View className="flex-row gap-2">
        <FilterChip label="Avulso"     selected={type==='OneOff'}    onPress={() => setValue('type','OneOff')} />
        <FilterChip label="Recorrente" selected={type==='Recurring'} onPress={() => setValue('type','Recurring')} />
      </View>

      # ── VAGAS & VALOR ──
      <Text className="text-eyebrow mt-6">VAGAS & VALOR</Text>
      <View className="flex-row gap-4">
        <Controller name="players" control={control} render={({ field }) => (
          <StepperField label="Jogadores" value={field.value} onChange={field.onChange} min={2} testID="players-stepper" />
        )} />
        <Controller name="price" control={control} render={({ field }) => (
          <StepperField label="Valor / pessoa" value={field.value} onChange={field.onChange} min={0} prefix="R$ " testID="price-stepper" />
        )} />
      </View>

      # ── CONFIRMAÇÕES ABREM (NEW — preset window; default 24h; opens X h before, closes at match start) ──
      <Text className="text-eyebrow mt-6">CONFIRMAÇÕES ABREM</Text>
      <View className="flex-row gap-2 flex-wrap">
        <FilterChip label="48h antes" selected={confirmOpens===48} onPress={() => setValue('confirmationOpensHoursBefore',48)} />
        <FilterChip label="24h antes" selected={confirmOpens===24} onPress={() => setValue('confirmationOpensHoursBefore',24)} />
        <FilterChip label="12h antes" selected={confirmOpens===12} onPress={() => setValue('confirmationOpensHoursBefore',12)} />
        <FilterChip label="6h antes"  selected={confirmOpens===6}  onPress={() => setValue('confirmationOpensHoursBefore',6)} />
      </View>

      # ── PRIVACIDADE ──
      <Text className="text-eyebrow mt-6">PRIVACIDADE</Text>
      <Controller name="isOpen" control={control} render={({ field }) => (
        <ToggleField icon={<Lock color={colors.primary} />} title="Partida aberta"
                     caption="Qualquer um pode entrar nas vagas"
                     value={field.value} onValueChange={field.onChange} testID="open-toggle" />
      )} />

      {createError && (
        <Text className="text-caption text-danger mt-4" accessibilityLiveRegion="polite">
          Não foi possível criar a partida. Tente novamente.
        </Text>
      )}

      <Button variant="grad" onPress={handleSubmit(onSubmit)} loading={isPending}
              className="mt-8" testID="create-submit">Criar partida</Button>

    </ScrollView>
  </SafeAreaView>
</View>
```

### Success state (`partida-criada.png`)
Full-screen navy state after a successful create (screen flips to `created` local state holding the new `id`):

```
<View className="flex-1 bg-surface-dark items-center justify-center px-6">
  <View className="bg-accent rounded-full h-20 w-20 items-center justify-center">
    <Check color={colors.surfaceDark} />
  </View>
  <Text className="font-display text-display text-text-on-dark uppercase text-center mt-6">Partida criada!</Text>
  <Text className="font-body text-body text-text-on-dark/80 text-center mt-2">
    Sua partida está no ar. Convide a galera e bora jogar!
  </Text>
  <Button variant="grad"     onPress={goToMatch}  className="mt-8">Ver a partida criada</Button>
  <Button variant="outlineW" onPress={goToInvite} leftIcon={<Share2 color={colors.textOnDark} />} className="mt-3">Convidar jogadores</Button>
  <Button variant="outlineW" onPress={goHome}     className="mt-3">Voltar ao início</Button>
</View>
```

> The cover block + success screen use navy `HERO_GRADIENT` / `surface-dark` with `text-on-dark`, the lime `bg-accent` check circle, display titles in `font-display` + `uppercase`, and `font-num` for stepper values. The TIPO + CONFIRMAÇÕES chips are visually identical to FORMATO/NÍVEL (`FilterChip`). Tokens only — NO inline hex; NO `StyleSheet.create`.

## State

### Server state (TanStack Query hooks)
- `useCreateMatch()` — `src/features/matches/api/createMatch.ts` (**MOCK** transport; F1.1 later). `useMutation` taking the validated Zod input (final shape, incl. `type` + `confirmationOpensHoursBefore`), returning `{ match: { id } }`. `mutationFn` is a FAKE async function (~600ms fake latency, latency overridable to 0 under test, no network, no `EXPO_PUBLIC_API_URL`), marked `// MOCK:` / `// TODO(real-api):` F1.1. On success: `queryClient.invalidateQueries({ queryKey: ['matches'] })`.

### Client state (Zustand)
- `useAuthStore` (`src/stores/auth.ts`, exists) — read-only; organizer must be authenticated. No new store.

### Local state
- `created: { id: string } | null` — flips to the success state and carries the new id.
- `location: string` — mirrors the LOCAL `SearchField` text (bridged into RHF).
- `coverUri: string | undefined` — picked cover image local URI (included in submit payload).
- `day: 'today' | 'tomorrow' | 'fri' | 'sat'` — selected QUANDO quick-date chip (resolved to a concrete date by a pure relative-day formatter at submit). **No** custom-date / time state (STOP).
- `createError: boolean` — toggles the inline error message after a rejected mutation.

> `type`, `format`, `level`, `confirmationOpensHoursBefore`, `players`, `price`, `isOpen` are RHF form values (read via `watch`/`useController` for the `selected` flags shown as `type`/`format`/`level`/`confirmOpens` in the layout), not separate `useState`.

### Forms
- Form schema (Zod) — `src/features/matches/schema/createMatch.ts`:
  ```ts
  const createMatchSchema = z.object({
    name: z.string().trim().min(1, 'Dê um nome à partida'),
    location: z.string().trim().min(1, 'Informe o local'),
    day: z.enum(['today', 'tomorrow', 'fri', 'sat']),          // quick-date only (no '+' / no time — STOP)
    format: z.enum(['2X2', '4X4', '6X6']),                     // reuse MatchFormat
    level: z.enum(['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']), // reuse the shared LEVELS enum
    type: z.enum(['OneOff', 'Recurring']),                     // TIPO — Avulso / Recorrente
    players: z.number().int().min(2, 'Mínimo de 2 jogadores'),
    price: z.number().min(0),                                  // 0 ⇒ "Grátis"
    confirmationOpensHoursBefore: z.union([                    // CONFIRMAÇÕES ABREM preset; closes at match start (implicit)
      z.literal(48), z.literal(24), z.literal(12), z.literal(6),
    ]),
    isOpen: z.boolean(),
  });
  export type CreateMatchInput = z.infer<typeof createMatchSchema>;
  ```
  The `coverUri` is carried alongside the validated input into the mutation payload (optional, set by the picker — not a validated form field).
- React Hook Form:
  ```ts
  useForm<CreateMatchInput>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      day: 'today', format: '6X6', level: 'INTERMEDIARIO',
      type: 'OneOff', players: 12, price: 0,
      confirmationOpensHoursBefore: 24, isOpen: false,
    },
  });
  ```
  Defaults mirror the mockup's pre-selected chips ("Hoje", "6x6", "Intermediário", players 12) plus the new defaults **TIPO = Avulso (`OneOff`)** and **CONFIRMAÇÕES ABREM = 24h**. Price default is 0/Grátis unless design pins R$ 25 — confirm; kept at 0 as the safe default.

## Navigation triggers
- Back chevron → `router.back()`.
- "Criar partida" (valid) → `useCreateMatch` mutate; on success set `created` and render the success state.
- Success "Ver a partida criada" → `router.replace({ pathname: '/matches/[id]', params: { id } })` (S12).
- **Success "Convidar jogadores" → `router.replace({ pathname: '/matches/[id]', params: { id } })` (S12).** Definitive: inline invite is OUT (SCOPE), no invite route specced, so it routes to the S12 organizer "Convidar" entry. Not disabled, not conditional.
- Success "Voltar ao início" → `router.replace('/(tabs)')` (S5 Home).

> **Typed-routes note:** `typedRoutes: true`. Typed hrefs; groups transparent (`/matches/[id]`, `/(tabs)`). All hrefs must pass `npm run typecheck`. No legacy `navigation.navigate`.

## Permissions / external integrations
- `expo-image-picker` (locked, already installed) — for "Trocar capa", mirroring S10's "Trocar foto". On tap of `CoverPicker`:
  1. `ImagePicker.requestMediaLibraryPermissionsAsync()`; if denied, polite inline message, no crash.
  2. If granted, `ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 })` (cover aspect).
  3. On a non-canceled result, take the local `uri`, `setCoverUri(uri)` (preview updates immediately), include it in the `useCreateMatch` payload (mock echoes back).
- **Test seam**: `expo-image-picker` is **mocked at the module boundary** (`jest.mock('expo-image-picker')`) returning a deterministic granted permission + a fixed `{ canceled: false, assets: [{ uri }] }` — the cover criterion asserts the rendered preview URI, not an OS side-effect.
- No location permission on this screen (LOCAL is free text; geo lands with S17). No camera/contacts/Google.

## Real-time subscriptions (if any)
- None.

## Loading / error / empty states
- **Loading (submitting)**: "Criar partida" shows `Button loading` (ActivityIndicator, press disabled). No full-screen blocker.
- **Error (create failed)**: set `createError`; render inline `text-caption text-danger` above the CTA (`accessibilityLiveRegion="polite"`), button re-enabled to retry. Per-field validation errors surface via each field's `error` prop (border-danger + caption). No toast primitive.
- **Empty**: N/A (creation form).

> Loading-state note: the form is **not** "already populated" — QUANDO/FORMATO/NÍVEL/TIPO/VAGAS/CONFIRMAÇÕES have explicit defaults (Hoje / 6x6 / Intermediário / Avulso / 12 / 24h), while NOME and LOCAL start empty and are required; submit is gated by Zod validation of the required fields.

## Acceptance criteria
- [ ] Header shows an inline back chevron (`accessibilityLabel="Voltar"`, calls `router.back()`) and the "CRIAR PARTIDA" title (`font-display`, uppercase) — built from the inline `<View>`/`<Pressable>` shell, with **no** `Screen`/`Header`/`IconButton` primitive.
- [ ] The cover block renders the navy "CAPA DA PARTIDA" placeholder with "Trocar capa". With `expo-image-picker` mocked (granted + fixed asset `uri`), tapping "Trocar capa" updates `CoverPicker` to **render that selected `uri`**, and that `uri` is included in the `useCreateMatch` payload on submit. Permission denial shows a polite inline message and does not crash.
- [ ] "NOME DA PARTIDA" is required; submitting empty shows the field error and blocks the mutation.
- [ ] "LOCAL" captures free text and is required; submitting empty shows its error and blocks the mutation.
- [ ] QUANDO defaults to **"Hoje" selected**, single-select among Hoje / Amanhã / Sex / Sáb; there is **no "+" chip and no time control** on the screen.
- [ ] FORMATO defaults to **6x6 selected**, single-select; NÍVEL defaults to **Intermediário selected**, single-select.
- [ ] **TIPO defaults to "Avulso" selected (`type: 'OneOff'`), single-select between Avulso / Recorrente; the chosen `type` is included in the submit payload.**
- [ ] "Jogadores" stepper defaults to 12 and enforces a minimum of 2; "Valor / pessoa" accepts 0 (Grátis) and positive values.
- [ ] **CONFIRMAÇÕES ABREM defaults to "24h antes" selected (`confirmationOpensHoursBefore: 24`), single-select among 48h / 24h / 12h / 6h; the chosen value is included in the submit payload.**
- [ ] "Partida aberta" toggle reflects and updates `isOpen` (default off).
- [ ] Tapping "Criar partida" with valid input calls `useCreateMatch` (mocked) with a payload containing `name`, `location`, `day`, `format`, `level`, `type`, `players`, `price`, `confirmationOpensHoursBefore`, `isOpen` (and `coverUri` if picked), shows the Button loading state, then renders the "PARTIDA CRIADA!" success screen.
- [ ] Success "Ver a partida criada" navigates to S12 (`/matches/[id]`) with the new id.
- [ ] Success "Convidar jogadores" navigates to S12 (`/matches/[id]`) with the new id (definitive — not disabled).
- [ ] Success "Voltar ao início" navigates to Home (`/(tabs)`).
- [ ] A failed (mock-forced) create shows the inline retryable error and re-enables the button.
- [ ] On success, `['matches']` queries are invalidated.
- [ ] No tab bar is shown on this stack screen.
- [ ] All criteria are verifiable via RNTL against the mocked mutation (no MSW / no network), the mocked `expo-image-picker` module, and mocked navigation.

## Out of scope (be explicit)
- **QUANDO "+" custom-date chip + any match time-of-day entry — STOP** (no date/time-picker token in DESIGN_SYSTEM; not authorized). QUANDO ships only the quick-date chips.
- Inline player invitation — the success "Convidar jogadores" CTA routes to S12 (per SCOPE; no inline invite, no separate invite route in MVP).
- Optional description field (not in mockup).
- Payment processing / charging (price is informational only).
- Venue autocomplete / geocoding for LOCAL (no endpoint in SCOPE; free text only in MVP).
- Generated/shareable cover or match image (post-MVP).
- Explicit open/close **datetime pickers** for the confirmation window — modeled as relative preset chips this iteration (no datetime token); a future design may replace the presets once a picker token exists.
- Real F1.1 wiring — the create is mocked; the human wires real F1.1 later behind the unchanged hook signature. **Now blocked only by the unresolved structured-venue/geo question** — type + confirmation-window are resolved.

## Files to create
- `app/matches/create.tsx` — the screen (form + success state).
- `src/features/matches/schema/createMatch.ts` — Zod schema + `CreateMatchInput` (includes `type` + `confirmationOpensHoursBefore`; reuses `MatchFormat` + shared `LEVELS`; no `any`).
- `src/features/matches/api/createMatch.ts` — `useCreateMatch` mutation hook (**MOCK** `mutationFn`, `// TODO(real-api):` F1.1; payload shape final).
- `src/components/ui/StepperField.tsx` — new component (if not inlined).
- `src/components/ui/ToggleField.tsx` — new component (if not inlined).
- `src/components/domain/CoverPicker.tsx` — new component (if not inlined).

## Files to modify
- `docs/COMPONENTS.md` — add entries for `StepperField`, `ToggleField`, `CoverPicker` (if extracted); add a **deferred note** that `SearchField` may need an optional leading-icon prop (MapPin) for S11 — flagged but **not** changed as part of S11; note that `FilterChip` now also serves S11's TIPO + CONFIRMAÇÕES groups (no API change).
- `src/features/matches/types/match.ts` — optionally export a shared level enum (or import from `@/features/profile/schema/onboarding`) so the create schema doesn't redefine it; reuse `MatchFormat`.

## New npm dependencies
- **NONE — no stack change.** Mocked create uses `@tanstack/react-query` (locked). Form via `react-hook-form` + `zod` + `@hookform/resolvers` (locked). Cover via `expo-image-picker` (locked, installed) + `expo-image` (locked); cover block + success screen use `expo-linear-gradient` (locked); icons via `lucide-react-native` (locked). No new packages, **no new design token** (TIPO + CONFIRMAÇÕES reuse `FilterChip`).

## Implementation notes
- **TIPO + CONFIRMAÇÕES ABREM**: render with the existing `FilterChip` exactly like FORMATO/NÍVEL — single-select, controlled by the RHF value. Do **not** invent a datetime-picker token; the confirmation window is a relative preset ("opens X h before, closes at match start"). The `confirmationOpensHoursBefore` value is the only thing persisted; the close time is implicit (match start) and computed server-side once F1.1 lands.
- **Future-proofing**: a later design may swap the CONFIRMAÇÕES preset chips for explicit open/close datetime pickers; keep the field name (`confirmationOpensHoursBefore`) and `type` independent so that change is additive.
- **No assumed primitives**: header is the S5/S8 inline `<View>` + `<Pressable>` + lucide pattern; no `Screen`/`Header`/`IconButton`.
- **LOCAL**: bridge `SearchField` into RHF via `setValue('location', text, { shouldValidate: true })`. **Do not modify `SearchField`'s API for S11** — the MapPin-vs-Search mismatch is a separate catalog note for the component owner.
- **Cover test seam**: `jest.mock('expo-image-picker')` returns granted + fixed `{ canceled: false, assets: [{ uri }] }`; assert the rendered preview `uri`. Mirror S10's "Trocar foto".
- **Mock**: trivial, deterministic `mutationFn` (fixed latency, fixed stub `{ match: { id } }`, no randomness), latency overridable to 0 under test — like `src/features/profile/api/createProfile.ts`. Do not import `EXPO_PUBLIC_API_URL`. Leave `// MOCK:` / `// TODO(real-api):` (F1.1) markers at the transport swap point. **No `// TODO(scope-gap):` remains** — `type` + `confirmationOpensHoursBefore` ship in the final payload shape.
- **Enums**: reuse `MatchFormat` from `@/features/matches/types/match` and the existing `LEVELS` enum (`@/features/profile/schema/onboarding`) rather than redeclaring.
- **Display type**: "CRIAR PARTIDA", "PARTIDA CRIADA!" use `font-display` + `uppercase`. Section labels use `text-eyebrow`; stepper values/prices use `font-num`; chips use `font-mono`/`text-mono` (FilterChip already does this).
- **No API from the screen** — the create goes through `src/features/matches/api/createMatch.ts` (CLAUDE.md rule 6), even mocked.
- **Performance**: short form → `ScrollView` (FlatList threshold ~10).
- **Accessibility**: each chip group (incl. TIPO + CONFIRMAÇÕES) exposes `accessibilityState={{ selected }}` (FilterChip already does); the toggle uses an accessible `Switch` with a label; the cover affordance announces "Trocar capa da partida"; the inline error uses `accessibilityLiveRegion="polite"`.
