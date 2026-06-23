# Screen Spec: S10 — Settings (minimal MVP)

✅ **scope-guardian: APPROVED** — all 11 checklist items pass. Item 3 (backend gate, rule #10) cleared via the owner-approved S5/S6/S8/S9 mocked posture (`useUpdateProfile` mocked; real `PATCH /api/v1/profile/me` gated per the S4 backend gate; logout asserts no endpoint). The three prior blocking issues were resolved by human decision: (1) "Salvar alterações" uses `Button variant="primary"`, not `grad`; (2) theme/notification persistence approved via `@react-native-async-storage/async-storage@2.2.0` (now locked in CLAUDE.md, non-secret prefs only — tokens stay in expo-secure-store); (3) "Trocar foto" made functional via `expo-image-picker@~56.0.18` (now locked in CLAUDE.md). Additionally: Notificações is a chevron→sub-screen with three persisted coarse toggles; feedback is `mailto:`-only; the "Open questions" section was deleted (zero unresolved questions).

## Origin
- Screen from SCOPE: S10 — Settings (minimal MVP)
- Layer: 1/2 — FA.* (Auth: logout) + F2.1 (Profile read/edit). The account/preferences hub reached from the S8 Profile header.
- Requested by: human (renanortega.dev@gmail.com)

## Reference assets read
- [x] `docs/references/screens/S10-settings/perfil-configuracoes.png` — settings list (verified present on disk).
- [x] `docs/references/screens/S10-settings/perfil-editar.png` — edit-profile form (verified present on disk).

Both PNGs under S10's `Reference:` line exist and were read in full.

**`perfil-configuracoes.png` (settings list), top to bottom:**
1. **Header** — `< ` back chevron in a rounded square + "CONFIGURAÇÕES" display title.
2. **Profile summary card** — white card: round avatar (with a small level badge "15" overlaid), name "Renan Dias" (bold), "@renan · Levantador" muted subtitle.
3. **"CONTA" section** (eyebrow label) — white grouped card with two rows: "Editar perfil / Nome, nascimento, telefone" (person icon, chevron) and "Pagamentos e Premium / Assinatura, formas de pagamento" (star icon, lime "PRO" pill, chevron).
4. **"PREFERÊNCIAS" section** — "Aparência" card containing a 3-option theme selector (Claro / Escuro / Automático), each a tappable tile with a preview swatch; "Claro" is selected (blue ring + check). Below it a grouped white card: "Notificações / Convites, lembretes, ranking" (bell, chevron) and "Permissões do app / Localização, câmera, contatos" (icon, chevron). The "Notificações" row is a **chevron row** (navigates to a sub-screen), not inline toggles.
5. **"SUPORTE" section** — grouped white card: "Enviar feedback / Sugestões, problemas e elogios" (chevron) and "Sobre o Quadra / v2.4.0" (globe icon, version text).
6. **Logout** — standalone white card row, left chevron + "Sair da conta" in red (`danger`).

**`perfil-editar.png` (edit profile), top to bottom:**
1. **Header** — back chevron + "EDITAR PERFIL".
2. **Avatar + "Trocar foto"** — large centered avatar with a small blue edit (pencil) badge; "Trocar foto" link in `primary` below.
3. **Form fields** — NOME + SOBRENOME (split row), APELIDO (`@ renan`), DATA DE NASCIMENTO (`14/03/1998` with calendar icon), NÚMERO DE TELEFONE (`BR (11) 98472-1130`), POSIÇÃO EM QUADRA (single-select chips: Levantador [selected, blue] / Oposto / Ponteiro / Central / Líbero / Coringa).
4. **"Salvar alterações"** — full-width CTA pinned at the bottom (rendered with `Button variant="primary"`, navy→blue — see "Existing components reused").

## Notable divergences from the prototype
SCOPE wins on behavior/in-out; the PNG wins on visual hierarchy; DESIGN_SYSTEM wins on tokens. Divergences (each justified):

- **"Pagamentos e Premium" row + "PRO" pill — NOT included.** The list print shows a "Pagamentos e Premium / Assinatura, formas de pagamento" row with a lime PRO pill. SCOPE S10 is explicit: *OUT — "Pagamentos e Premium" / subscription (Layer 3 — billing/upsell)*. The entire "CONTA" section therefore renders **only** the "Editar perfil" row in MVP.
- **Avatar level badge ("15") in the summary card — NOT included.** The summary card print overlays a level badge on the avatar. Level/XP/progress is Layer-2 progress data shown on S8, not part of S10's identity summary per SCOPE (S10 IN is "avatar, name, @handle · position" only). Render a plain `Avatar` with no level badge.
- **Bottom tab bar is NOT present on S10.** Neither print draws it (both are full-frame stack screens). S10's route is `app/profile/settings.tsx` — a stack screen outside `(tabs)`, reached via `router.push('/profile/settings')` (verified in `app/(tabs)/profile.tsx`). It gets a back affordance, not the tab bar.
- **Edit-profile is a sub-route, not a modal.** The two prints are distinct screens; SCOPE phrases "Editar perfil →" as a navigation. Implemented as a separate route `app/profile/edit.tsx` pushed from the list.
- **Appearance selector ships fully, but only "Claro" re-themes.** DESIGN_SYSTEM.md has no dark tokens yet. Per the locked decision (see "State → Appearance theme"), all three tiles are selectable and the choice is persisted; "Escuro"/"Automático" persist the preference and carry a small "Em breve" affordance, while only "Claro" actually re-themes the UI. This is not a question — it is the shipped behavior.

## Goal
Let the onboarded user manage their account from one hub: view their profile summary, edit their profile (name, @handle, birth date, phone, position, photo), choose an appearance theme, open a notifications sub-screen with coarse toggles, jump to OS permission settings, send feedback, see the app version, and log out.

## Route
- **List**: `app/profile/settings.tsx` — **verified**: the file exists today as a placeholder (`<Text>Configurações</Text>`), S8 navigates here via `router.push('/profile/settings')` (verified in `app/(tabs)/profile.tsx`). Stack screen registered by the **root** `<Stack>` in `app/_layout.tsx` (`screenOptions={{ headerShown: false }}`); there is **no** `app/profile/_layout.tsx`, so S10 owns its header (title + back) inline — consistent with S9 (`app/profile/ranking.tsx`).
- **Edit sub-route**: `app/profile/edit.tsx` — **new file**, pushed from the list's "Editar perfil" row via `router.push('/profile/edit')`. Same root-stack, own inline header.
- **Notifications sub-route**: `app/profile/notifications.tsx` — **new file**, pushed from the list's "Notificações" chevron row via `router.push('/profile/notifications')`. Same root-stack, own inline header ("NOTIFICAÇÕES"). Holds the coarse on/off toggles.

## Backend dependencies

> ### ⚠️ Scope override (owner-approved) — same posture as S5/S6/S8/S9
> Per agent rule #10, an undefined backend endpoint would normally STOP the spec. The owner (renanortega.dev@gmail.com) has, for the data-display/profile screens, consciously approved shipping **fully mocked** ahead of backend alignment. S10 follows that locked convention.

- **F2.1 (Profile read)** — the summary card and the edit form's initial values reuse the **already-shipped** `useMyProfile` hook (`src/features/profile/api/getMyProfile.ts`, MOCK). ⚠️ The current `MyProfile` type carries only `firstName`/`avatarUrl`/progress — it lacks `lastName`, `handle`, `birthDate`, `phone`, `position`. The edit form needs these; see "New types / hooks" for the additive extension (mock-only, behind the same hook).
- **F2.1 (Profile edit / PATCH)** — "Salvar alterações" needs a **new mutation hook** `useUpdateProfile` (mocked this iteration, mirroring `useCreateProfile`). The payload includes the chosen avatar URI from "Trocar foto" (the mock echoes it back). ⚠️ Same backend-alignment gate as S4: the real `PATCH /api/v1/profile/me` requires the backend Profile model to expose `@handle`, `lastName`, `birthDate`, `modality`/`position`, and an avatar upload field (see the S4 spec's "Backend alignment gate"). **Do not wire to a real endpoint until backend SCOPE is aligned.**
- **FA.* (Auth — logout)** — "Sair da conta" calls a **new `logout()` helper** (`src/lib/auth/logout.ts`). Per ARCHITECTURE "Logout": clear both secure-store keys (`quadra.accessToken`, `quadra.refreshToken`), `useAuthStore.getState().clearAuth()`, `queryClient.clear()`, then `router.replace('/(auth)/login')`. No backend endpoint is asserted (token revocation, if any, is additive later behind this helper).

No new *read* endpoint paths are asserted. The PATCH path and any logout-revoke call are gated as above.

## Existing components reused
- `Avatar` (`size="md"` summary card; `size="lg"` edit-screen header) — `src/components/ui/Avatar.tsx`.
- `Button`:
  - `variant="primary"` (navy→blue) for **"Salvar alterações"** — the bottom CTA on the edit screen.
  - `variant="ghost"` for **"Trocar foto"** (rendered as a text-link button) and any "Tentar novamente" retry.
  - `src/components/ui/Button.tsx`.
- `TextField` (NOME, SOBRENOME, APELIDO with `@` `leftAdornment`) — `src/components/ui/TextField.tsx`. (Catalog notes it is "designed for reuse by S10".)
- `DateField` (DATA DE NASCIMENTO) — `src/components/ui/DateField.tsx`. (Catalog: "Designed for reuse by S10".)
- `PhoneInput` (NÚMERO DE TELEFONE) — `src/components/ui/PhoneInput.tsx`. Display-only "BR +55" pill matches the print's `BR` prefix.
- `FilterChip` (POSIÇÃO EM QUADRA single-select chips) — `src/components/ui/FilterChip.tsx`. (Catalog: "Designed for reuse by … S10 (… position chips)"; `selected` drives the blue fill, `onPress` sets the RHF value.)
- `Switch` (React Native core) — the three coarse toggles on the **Notifications sub-screen** (convites, lembretes, ranking).

Lucide icons (per DESIGN_SYSTEM iconography, colored from `src/theme/colors.ts`): `ChevronLeft`, `ChevronRight`, `User`, `Bell`, `MapPin`/`Settings`, `MessageSquare`, `Globe`, `LogOut`/none (red text only), `Pencil` (edit badge), `Check` (selected theme tile), `Camera`/`Image` (optional, for the photo affordance). No new SVGs.

## New components proposed
Per the COMPONENTS.md decision log (extract only at ≥2-screen reuse or DS-primitive status), the S10 rows/sections are **one-off list chrome** and stay **inline** — not extracted. Specifically NOT proposed: a generic `SettingsRow`, a `SectionCard`, a `ThemeSelector`, a `ToggleRow`. They are used only on S10's screens and are thin wrappers around NativeWind classes.

**NONE.**

### New types / hooks (not reusable UI components — listed for the implementer)
- **Extend `MyProfile`** (`src/features/profile/types/profile.ts`) — additively add the edit-form fields:
  ```ts
  // additive — S8 already only reads firstName/avatarUrl/progress
  lastName?: string;
  handle?: string;        // without leading '@'
  birthDate?: string;     // DD/MM/AAAA masked string (matches DateField/onboarding)
  phone?: string;         // national digits only (matches PhoneInput contract)
  position?: Position;    // from '@/features/profile/schema/onboarding'
  ```
  And populate them in the `getMyProfile` MOCK stub. Additive ⇒ S8 unaffected.
- **`editProfileSchema`** (`src/features/profile/schema/editProfile.ts`) — Zod, reusing the field rules already proven in `onboardingSchema` (firstName/lastName non-empty, `birthDate` masked + real-past-date refine, `handle` `^[a-z0-9_]{3,20}$`, `position` enum) plus a `phone` rule (national digits, ≤11, matching `PhoneInput`) and an optional `avatarUri` string (local URI from the picker). Prefer importing the shared `parseMaskedDate`/regex from onboarding rather than duplicating.
- **`useUpdateProfile`** (`src/features/profile/api/updateProfile.ts`) — `useMutation`, MOCK body (mirror `createProfile.ts`: ~600ms fake latency, echo input including `avatarUri`, `queryClient.invalidateQueries({ queryKey: myProfileQueryKey })` on success). Gated to real `PATCH /api/v1/profile/me` per the S4 backend gate.
- **`logout`** (`src/lib/auth/logout.ts`) — see Backend dependencies.

## Layout structure

### List — `app/profile/settings.tsx`
```
<View className="flex-1 bg-bg-light">
  <SafeAreaView edges={['top']} className="flex-1">
    <Header />  {/* inline; back + title variant, mirrors RankingHeader */}
      <Pressable accessibilityLabel="Voltar" onPress={router.back}><ChevronLeft color={colors.surfaceDark} /></Pressable>
      <Text className="font-display text-h1 text-text-primary uppercase">Configurações</Text>
    <ScrollView contentContainerClassName="pb-24">

      {/* Profile summary card */}
      <View className="mx-4 mt-2 bg-white rounded-card shadow-card p-4 flex-row items-center gap-3">
        <Avatar uri={profile.avatarUrl} name={profile.firstName} size="md" />
        <View>
          <Text className="font-body text-h3 text-text-primary">{fullName}</Text>
          <Text className="font-body text-caption text-text-muted">@{handle} · {positionLabel}</Text>
        </View>
      </View>

      {/* CONTA — only "Editar perfil" (Pagamentos = Layer 3, cut) */}
      <Text className="font-body text-eyebrow text-text-muted uppercase px-4 mt-6 mb-2">Conta</Text>
      <View className="mx-4 bg-white rounded-card shadow-card overflow-hidden">
        <SettingsRow icon={<User/>} title="Editar perfil" subtitle="Nome, nascimento, telefone"
                     onPress={() => router.push('/profile/edit')} />   {/* inline row */}
      </View>

      {/* PREFERÊNCIAS */}
      <Text className="... text-eyebrow ... px-4 mt-6 mb-2">Preferências</Text>
      <View className="mx-4 bg-white rounded-card shadow-card p-4">
        <Text className="font-body text-h3 text-text-primary">Aparência</Text>
        <View className="flex-row gap-3 mt-3">  {/* 3 theme tiles */}
          <ThemeTile value="light"  selected={theme==='light'}  onPress={setTheme} label="Claro" />
          <ThemeTile value="dark"   selected={theme==='dark'}   onPress={setTheme} label="Escuro"     badge="Em breve" />
          <ThemeTile value="system" selected={theme==='system'} onPress={setTheme} label="Automático" badge="Em breve" />
        </View>
      </View>
      <View className="mx-4 mt-3 bg-white rounded-card shadow-card overflow-hidden">
        <SettingsRow icon={<Bell/>} title="Notificações" subtitle="Convites, lembretes, ranking"
                     onPress={() => router.push('/profile/notifications')} />   {/* chevron → sub-screen */}
        <Divider />
        <SettingsRow icon={<MapPin/>} title="Permissões do app" subtitle="Localização, câmera, contatos" onPress={openOsSettings} />
      </View>

      {/* SUPORTE */}
      <Text className="... text-eyebrow ... px-4 mt-6 mb-2">Suporte</Text>
      <View className="mx-4 bg-white rounded-card shadow-card overflow-hidden">
        <SettingsRow icon={<MessageSquare/>} title="Enviar feedback" subtitle="Sugestões, problemas e elogios" onPress={openFeedback} />
        <Divider />
        <SettingsRow icon={<Globe/>} title="Sobre o Quadra" rightText={`v${appVersion}`} disabled />
      </View>

      {/* Logout */}
      <Pressable className="mx-4 mt-6 bg-white rounded-card shadow-card px-4 py-4 flex-row items-center"
                 accessibilityRole="button" accessibilityLabel="Sair da conta" onPress={onLogout}>
        <ChevronLeft color={colors.danger} />
        <Text className="font-body text-body-bold text-danger ml-2">Sair da conta</Text>
      </Pressable>

    </ScrollView>
  </SafeAreaView>
</View>
```
`SettingsRow` / `ThemeTile` / `Divider` are **inline** components in this file (not catalog entries). Row = icon (lucide, `colors.surfaceDark`) + title (`text-h3`) + subtitle (`text-caption text-text-muted`) + trailing `ChevronRight` (`text-muted`) or `rightText` (`font-num`/`text-caption`). Theme tile = a `Pressable` with `rounded-card`, a preview swatch, the label, an optional small "Em breve" `badge` for `dark`/`system`, and a blue ring + `Check` when `selected` (`bg-primary` accents from tokens); tiles expose `accessibilityState={{ selected }}`.

### Edit — `app/profile/edit.tsx`
```
<View className="flex-1 bg-bg-light">
  <SafeAreaView edges={['top']} className="flex-1">
    <Header />  {/* back + "EDITAR PERFIL" */}
    <Animated.ScrollView ...keyboard-aware... contentContainerClassName="px-4 pb-32">
      {/* Avatar + Trocar foto */}
      <View className="items-center mt-2">
        <View>
          <Avatar uri={avatarUri ?? profile.avatarUrl} name={profile.firstName} size="lg" />
          {/* blue Pencil badge overlay */}
        </View>
        <Button variant="ghost" onPress={onChangePhoto}>Trocar foto</Button>  {/* functional picker — see Permissions */}
      </View>

      {/* RHF + Zod fields */}
      <View className="flex-row gap-4 mt-6">
        <Controller name="firstName" ...><TextField label="NOME" autoCapitalize="words" .../></Controller>
        <Controller name="lastName"  ...><TextField label="SOBRENOME" autoCapitalize="words" .../></Controller>
      </View>
      <Controller name="handle" ...>
        <TextField label="APELIDO" autoCapitalize="none" leftAdornment={<Text className="font-num text-primary">@</Text>} .../>
      </Controller>
      <Controller name="birthDate" ...><DateField label="DATA DE NASCIMENTO" .../></Controller>
      <Controller name="phone" ...><PhoneInput .../></Controller>

      {/* POSIÇÃO EM QUADRA — single-select chips */}
      <Text className="font-body text-eyebrow text-text-muted uppercase mt-6 mb-2">Posição em quadra</Text>
      <View className="flex-row flex-wrap gap-2">
        {POSITION_OPTIONS.map(o => (
          <FilterChip key={o.code} label={o.name} selected={value===o.code} onPress={() => onChange(o.code)} />
        ))}
      </View>
    </Animated.ScrollView>

    {/* pinned CTA */}
    <View className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-bg-light">
      <Button variant="primary" onPress={handleSubmit(onSave)} loading={isPending}>Salvar alterações</Button>
    </View>
  </SafeAreaView>
</View>
```
NativeWind only. No `StyleSheet.create`. No hardcoded hex (runtime colors from `src/theme/colors.ts`). `avatarUri` is RHF form state set by the picker; the `Avatar` preview shows it immediately when chosen. `POSITION_OPTIONS` reuses the labels/codes already defined in `app/(auth)/onboarding.tsx` — the implementer should hoist that static config into `src/features/profile/schema/onboarding.ts` (or a shared const) rather than re-declare it.

### Notifications — `app/profile/notifications.tsx`
```
<View className="flex-1 bg-bg-light">
  <SafeAreaView edges={['top']} className="flex-1">
    <Header />  {/* back + "NOTIFICAÇÕES" */}
    <ScrollView contentContainerClassName="pb-24">
      <Text className="font-body text-eyebrow text-text-muted uppercase px-4 mt-4 mb-2">Notificações push</Text>
      <View className="mx-4 bg-white rounded-card shadow-card overflow-hidden">
        <ToggleRow title="Convites"  subtitle="Quando te convidam para uma partida"
                   value={prefs.invites}  onValueChange={setInvites} />
        <Divider />
        <ToggleRow title="Lembretes" subtitle="Antes das partidas confirmadas"
                   value={prefs.reminders} onValueChange={setReminders} />
        <Divider />
        <ToggleRow title="Ranking"   subtitle="Mudanças na sua posição do ranking"
                   value={prefs.ranking}  onValueChange={setRanking} />
      </View>
    </ScrollView>
  </SafeAreaView>
</View>
```
`ToggleRow` / `Divider` are **inline** components in this file (not catalog entries). `ToggleRow` = title (`text-h3`) + subtitle (`text-caption text-text-muted`) + trailing core-RN `<Switch>` (track/thumb tinted from `src/theme/colors.ts` `primary`). Three coarse toggles only (convites, lembretes, ranking) per SCOPE — no per-category granularity. Each toggle reads/writes `useNotificationPrefsStore`.

## State

### Server state (TanStack Query hooks)
- `useMyProfile()` — existing, `src/features/profile/api/getMyProfile.ts`. Feeds the summary card and the edit form's `defaultValues`.
- `useUpdateProfile()` — **new (mocked)**, `src/features/profile/api/updateProfile.ts`. Invalidates `myProfileQueryKey` on success; payload carries the optional `avatarUri`.

### Client state (Zustand)
- `useAuthStore` — existing (`src/stores/auth.ts`); read nothing directly here, but `logout()` calls `clearAuth()`.
- **`useThemeStore`** — **new**, `src/stores/theme.ts`, `{ theme: 'light'|'dark'|'system'; setTheme }`. **Persisted** across restarts via zustand `persist` middleware using the AsyncStorage adapter (`@react-native-async-storage/async-storage`). This is a non-secret UI preference — allowed in AsyncStorage per CLAUDE.md (auth tokens remain in expo-secure-store). **Locked behavior:** all three options are selectable and persist; only `light` actually re-themes the UI today (DESIGN_SYSTEM has no dark tokens yet); `dark`/`system` persist the preference and show a small "Em breve" affordance on their tiles.
- **`useNotificationPrefsStore`** — **new**, `src/stores/notificationPrefs.ts`, `{ invites: boolean; reminders: boolean; ranking: boolean; setInvites; setReminders; setRanking }` (default all `true`). **Persisted** via the same zustand `persist` + AsyncStorage adapter (non-secret prefs). Drives the three switches on `app/profile/notifications.tsx`.

### Local state
- `useState` only for: the logout confirmation dialog open flag (if a confirm step is used). Nothing else — form state is RHF, theme/notification prefs are Zustand, server data is Query.

### Forms
- **Edit profile** — `editProfileSchema` (Zod) via `react-hook-form` + `@hookform/resolvers/zod`. Fields: `firstName`, `lastName`, `handle`, `birthDate`, `phone`, `position`, `avatarUri` (optional). `defaultValues` hydrated from `useMyProfile` data. `Controller`-wrapped `TextField`/`DateField`/`PhoneInput`/`FilterChip`; `avatarUri` is set imperatively by the photo picker via `setValue`. Submit → `useUpdateProfile().mutate(...)` → on success `router.back()`.

## Navigation triggers
- Back chevron (all three screens) → `router.back()`.
- "Editar perfil" row → `router.push('/profile/edit')`.
- "Notificações" row → `router.push('/profile/notifications')`.
- "Salvar alterações" → on mutation success → `router.back()` (return to the list).
- "Sair da conta" → `logout()` → `router.replace('/(auth)/login')`.
- "Permissões do app" → `Linking.openSettings()` (OS settings) — `react-native` `Linking`, no new dep.
- "Enviar feedback" → `Linking.openURL('mailto:contato@quadra.app?subject=Feedback Quadra')` — `react-native` `Linking`, no new dep.

## Permissions / external integrations
- **"Trocar foto" — functional avatar picker** via `expo-image-picker` (locked in CLAUDE.md, already installed). On tap:
  1. Request media-library permission with `ImagePicker.requestMediaLibraryPermissionsAsync()`; if denied, surface a polite inline message and do not crash (optionally offer "Permissões do app" → OS settings).
  2. If granted, call `ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1,1], quality: 0.8 })`.
  3. On a non-canceled result, take the local `uri`, `setValue('avatarUri', uri)` so the `Avatar` preview updates immediately, and include it in the `useUpdateProfile` payload on save (mock echoes it back).
- **"Permissões do app"** deep-links to **OS settings** via `Linking.openSettings()` — it does NOT request permissions in-app (S5/S17 own location requests).
- **"Enviar feedback"** opens the mail client via `Linking.openURL('mailto:...')`.

## Real-time subscriptions
- None.

## Loading / error / empty states
- **List**: summary card shows a `SkeletonBlock` (the `bg-bg-light-alt rounded-card` pattern already used in S8/S9) while `useMyProfile` is `isPending`; on `isError`, the summary card shows "Não foi possível carregar" + a `ghost` "Tentar novamente" retry (mirror S8's `ErrorRow`). The static rows (Aparência/Suporte/logout) render regardless.
- **Edit**: while `useMyProfile` is `isPending`, show skeleton fields (or disable the form); on `isError`, show the retry row. On submit, the CTA shows its `loading` state (`Button loading`); a mutation error surfaces inline above the CTA via `accessibilityLiveRegion="polite"` ("Não foi possível salvar. Tente novamente.") — consistent with the field error tokens, no toast. Photo-picker permission denial surfaces a polite inline message, not a crash.
- **Notifications**: no async load — toggles read synchronously from the persisted store; first render after rehydration reflects saved values.
- **Empty**: N/A (profile always exists for an onboarded user; S10 is unreachable pre-onboarding).

## Acceptance criteria
- [ ] List header shows a back affordance and the "CONFIGURAÇÕES" display title (uppercase, `font-display`).
- [ ] Summary card shows the authenticated user's avatar, full name, and "@handle · position".
- [ ] The "CONTA" section shows **only** "Editar perfil" (no "Pagamentos e Premium" row).
- [ ] "Editar perfil" navigates to `/profile/edit`.
- [ ] The edit form is pre-filled from `useMyProfile` and exposes NOME, SOBRENOME, APELIDO (@), DATA DE NASCIMENTO, NÚMERO DE TELEFONE, and a single-select POSIÇÃO EM QUADRA chip group.
- [ ] Edit form validates via React Hook Form + Zod (invalid @handle / empty name / invalid date surface inline errors).
- [ ] **"Salvar alterações" is a `Button variant="primary"` (navy→blue), calls `useUpdateProfile`, shows a loading state, and returns to the list on success.**
- [ ] **"Trocar foto" launches the image library picker; after picking, the avatar preview updates to the chosen local URI and that URI is included in the `useUpdateProfile` payload.** Media-library permission is requested before launching; denial is handled gracefully (no crash).
- [ ] "Aparência" offers Claro / Escuro / Automático; the selected option is visually marked; **the choice persists via `useThemeStore` (AsyncStorage) across app restarts**. "Escuro"/"Automático" are selectable and persist but show an "Em breve" affordance; only "Claro" re-themes the UI.
- [ ] **"Notificações" is a chevron row that navigates to `/profile/notifications`.**
- [ ] **The Notifications sub-screen shows exactly three coarse switches (Convites, Lembretes, Ranking); toggling each persists via `useNotificationPrefsStore` (AsyncStorage) and the saved state is reflected after restart.**
- [ ] "Permissões do app" opens OS settings.
- [ ] **"Enviar feedback" opens the mail client via `mailto:contato@quadra.app?subject=Feedback Quadra`.**
- [ ] "Sobre o Quadra vX.Y.Z" shows the app version.
- [ ] "Sair da conta" (red) clears tokens + auth store + query cache and redirects to Login.
- [ ] No bottom tab bar on any of the three screens; back returns to the previous screen (list → Profile tab).
- [ ] No hardcoded hex; all colors via tokens / `src/theme/colors.ts`.

## Out of scope (be explicit)
- "Pagamentos e Premium" / subscription / "PRO" pill (Layer 3 — billing/upsell; SCOPE S10 OUT).
- Granular per-category notification settings (post-MVP; SCOPE S10 OUT) — only the three coarse on/off switches (convites/lembretes/ranking) on the sub-screen.
- Actual dark theme rendering — blocked on DESIGN_SYSTEM dark tokens. The selector ships fully and persists the choice; only "Claro" re-themes, with "Escuro"/"Automático" flagged "Em breve" (locked decision, not a question).
- Avatar level badge in the summary card (Layer-2 progress data; not in S10's IN list).
- In-app feedback form / external feedback URL — feedback is `mailto:` only.
- Account deletion, password/2FA, linked accounts — not in SCOPE.

## Files to create
- `app/profile/edit.tsx` — the edit-profile screen.
- `app/profile/notifications.tsx` — the notifications preferences sub-screen (three coarse switches).
- `src/features/profile/schema/editProfile.ts` — Zod schema (reusing onboarding rules) incl. optional `avatarUri`.
- `src/features/profile/api/updateProfile.ts` — `useUpdateProfile` mutation (mocked), echoes `avatarUri`.
- `src/lib/auth/logout.ts` — logout helper.
- `src/stores/theme.ts` — appearance preference store (zustand `persist` + AsyncStorage).
- `src/stores/notificationPrefs.ts` — notification preferences store (zustand `persist` + AsyncStorage).

## Files to modify
- `app/profile/settings.tsx` — replace the placeholder with the settings list.
- `src/features/profile/types/profile.ts` — additively extend `MyProfile` (lastName/handle/birthDate/phone/position).
- `src/features/profile/api/getMyProfile.ts` — populate the new mock fields.
- `app/(auth)/onboarding.tsx` (or a shared const) — hoist `POSITION_OPTIONS` so edit + onboarding share one source.
- `docs/COMPONENTS.md` — **no new component entries** (S10 adds none). (Update only if the implementer, against this spec's recommendation, extracts `SettingsRow`/`ToggleRow`/`ThemeTile`.)

## New npm dependencies
- **`@react-native-async-storage/async-storage@2.2.0`** — **ALREADY INSTALLED + locked** in CLAUDE.md ("Local prefs storage"). Used by `useThemeStore` and `useNotificationPrefsStore` (zustand `persist` adapter) for **non-secret UI preferences only**. Auth tokens remain in expo-secure-store.
- **`expo-image-picker@~56.0.18`** — **ALREADY INSTALLED + locked** in CLAUDE.md ("Image picker"). Used by "Trocar foto" (`launchImageLibraryAsync`) on the edit screen. Requires runtime media-library permission (handled in-screen).
- No other new dependencies.

## Implementation notes
- **Reuse, don't reinvent**: `TextField`/`DateField`/`PhoneInput`/`FilterChip`/`Avatar`/`Button` were all explicitly designed in COMPONENTS.md for S10 reuse — the edit form should be almost entirely composition of existing primitives.
- **Header parity**: copy the inline back+title header pattern from `app/profile/ranking.tsx` (`ChevronLeft` colored `colors.surfaceDark`, title `font-display text-h1 uppercase`) for all three S10 screens. Do not add a `profile/_layout.tsx`.
- **Logout single source**: implement `logout()` once in `src/lib/auth/logout.ts` and reuse it (the auth bootstrap in `app/_layout.tsx` already does `clearAuth()` inline; do not duplicate the full clear logic in the screen).
- **Secure-store keys**: clear `quadra.accessToken` AND `quadra.refreshToken` (per ARCHITECTURE) via `SecureStore.deleteItemAsync` — never AsyncStorage. AsyncStorage is used **only** for the non-secret theme/notification prefs stores.
- **Persisted stores**: both `useThemeStore` and `useNotificationPrefsStore` use zustand `persist` with `createJSONStorage(() => AsyncStorage)`; give each a distinct, namespaced key (e.g. `quadra.prefs.theme`, `quadra.prefs.notifications`). Reads after cold start must reflect rehydrated values.
- **Image picker**: request `requestMediaLibraryPermissionsAsync()` before `launchImageLibraryAsync`; use `allowsEditing: true`, `aspect: [1,1]` for a square avatar crop; handle the canceled result and the denied-permission path without crashing.
- **Accessibility**: every row is a single `accessibilityRole="button"` target with a combined label (title + subtitle); the logout row's destructive intent should be announced; theme tiles expose `accessibilityState={{ selected }}`; each notification `Switch` carries an `accessibilityLabel` matching its title and reports its on/off state.
- **Keyboard**: the edit form reuses the onboarding keyboard-aware scroll approach (`useAnimatedKeyboard`) so the pinned CTA and focused fields stay visible.
