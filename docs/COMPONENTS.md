# COMPONENTS.md — Living Component Catalog

> **Read before creating any new component.** This file is the source of truth for what reusable pieces exist.
> The `implementer` updates this file when it ships a new reusable component.
> The `screen-spec-writer` reads this file to reuse what exists instead of inventing duplicates.

---

## How to use this file

### Before specifying a screen
The spec-writer checks: "Does the screen need a Button? A Card? An Avatar? Is it already here?" If yes → reference by name. If no → propose a new one **in the spec**, justifying why an existing component doesn't fit.

### Before implementing
The implementer checks: "The spec mentions `<MatchCard>`. Is it in the catalog?" If yes → import and use. If no → check the spec for the proposed new component, build it in `src/components/`, and add an entry to this file.

### When updating
Every PR that adds a reusable component MUST add an entry here. The PR is incomplete without it.

---

## Catalog format

Each entry follows this structure:

```markdown
### `<ComponentName>`
- **Path**: `src/components/<category>/<ComponentName>.tsx`
- **Category**: ui | layout | domain
- **Props**: TypeScript interface or signature
- **Used in**: list of screens
- **Example**:
  ```tsx
  <Button variant="primary" onPress={...}>Entrar</Button>
  ```
- **Notes**: behavior nuances, accessibility, variants
```

---

## UI primitives (`src/components/ui/`)

### `Button`
- **Path**: `src/components/ui/Button.tsx`
- **Category**: ui
- **Props**: `{ variant: 'grad' | 'primary' | 'outline' | 'outlineW' | 'ghost'; onPress: () => void; children: ReactNode; disabled?: boolean; loading?: boolean; leftIcon?: ReactNode; testID?: string }`
- **Used in**: S2 Login
- **Example**:
  ```tsx
  <Button variant="grad" onPress={openSheet}>Entrar e jogar</Button>
  <Button variant="outline" onPress={onGoogle} leftIcon={<GoogleMark />}>Entrar com Google</Button>
  ```
- **Notes**: All five DESIGN_SYSTEM variants. `grad` (blue→lime) and `primary` (navy→blue) wrap `expo-linear-gradient` with `shadow-cta` / `shadow-primary`; when `disabled` or `loading` they render a muted `bg-bg-light-alt` fill (no shadow). `outline` / `outlineW` / `ghost` are transparent (50% opacity when disabled). `loading` swaps content for an `ActivityIndicator` and disables press. Tap height ~48px (`h-12`), `rounded-btn`. Exposes `accessibilityRole="button"` and `accessibilityState` (disabled/busy).

### `PhoneInput`
- **Path**: `src/components/ui/PhoneInput.tsx`
- **Category**: ui
- **Props**: `{ value: string; onChangeText: (value: string) => void; country?: 'BR'; error?: string; testID?: string }`
- **Used in**: S2 Login
- **Example**:
  ```tsx
  <PhoneInput value={value} onChangeText={onChange} country="BR" error={error?.message} />
  ```
- **Notes**: `value` and `onChangeText` deal in **national digits only** (mask stripped, max 11). Displays a BR `(11) 00000-0000` mask and a **display-only** "BR +55" pill (no multi-country selector in MVP). When `error` is set, the field border turns `border-danger` and the message renders below in the `danger` token — this is the sole error-surfacing path on the login screen (no toast).

### `OtpInput`
- **Path**: `src/components/ui/OtpInput.tsx`
- **Category**: ui
- **Props**: `{ value: string; onChangeText: (code: string) => void; length?: 4; error?: boolean; autoFocus?: boolean; onFilled?: (code: string) => void; testID?: string }`
- **Used in**: S3 SMS Verification
- **Example**:
  ```tsx
  <OtpInput value={code} onChangeText={setCode} error={isError} autoFocus onFilled={onVerify} testID="otp-input" />
  ```
- **Notes**: Segmented 4-box auto-advancing OTP field (length fixed at 4 for MVP, Cognito-locked). Typing a digit advances focus to the next box; backspace on an empty box clears+moves to the previous box; a pasted/autofilled full code (iOS `textContentType="oneTimeCode"`, Android `autoComplete="sms-otp"`) is distributed across boxes. Empty boxes use `border-line`, filled boxes `border-primary`, and `error` swaps to `border-danger` plus a brief horizontal shake via `react-native-reanimated`. `onFilled` fires when all boxes are filled (used for auto-submit). Each box exposes an accessible label ("Dígito N de 4"). Boxes are `h-16 w-16`, `font-num`.

### `TextField`
- **Path**: `src/components/ui/TextField.tsx`
- **Category**: ui
- **Props**: `{ label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; error?: string; leftAdornment?: ReactNode; rightSlot?: ReactNode; autoCapitalize?: 'none' | 'words'; maxLength?: number; testID?: string }`
- **Used in**: S4 Onboarding (NOME / SOBRENOME / APELIDO)
- **Example**:
  ```tsx
  <TextField label="NOME" value={value} onChangeText={onChange} autoCapitalize="words" error={errors.firstName?.message} />
  <TextField
    label="APELIDO"
    value={value}
    onChangeText={onChange}
    autoCapitalize="none"
    leftAdornment={<Text className="font-num text-primary">@</Text>}
    rightSlot={<View className="bg-accent rounded-pill px-3 py-1"><Text className="font-mono text-mono text-text-primary uppercase">SEU @ NA QUADRA</Text></View>}
  />
  ```
- **Notes**: Generic RHF-controlled labeled text input — fills the gap `PhoneInput`/`OtpInput` don't cover. Eyebrow label (`text-eyebrow`, uppercase) with an optional `rightSlot` on the same row (e.g. a badge); optional `leftAdornment` rendered inside the field before the input (e.g. an `@` prefix). When `error` is set, the field border turns `border-danger` and the message renders below in the `danger` token (`accessibilityLiveRegion="polite"`) — consistent with `PhoneInput`. Field height `h-12`, `rounded-chip`. The root `View` is `flex-1` so two fields sit side-by-side in a `flex-row gap-4` row. Designed for reuse by S10 (edit profile) and S11 (match name).

### `DateField`
- **Path**: `src/components/ui/DateField.tsx`
- **Category**: ui
- **Props**: `{ label: string; value: string; onChangeText: (v: string) => void; error?: string; testID?: string }`
- **Used in**: S4 Onboarding (DATA DE NASCIMENTO)
- **Example**:
  ```tsx
  <DateField label="DATA DE NASCIMENTO" value={value} onChangeText={onChange} error={errors.birthDate?.message} />
  ```
- **Notes**: Masked `DD/MM/AAAA` date field with a leading lucide `Calendar` icon (`primary` color). Holds/raises the **masked string** (`DD/MM/AAAA`); masking is applied internally as the user types digits (`number-pad`, max 10 chars). It does NOT validate — the consuming Zod schema validates/parses the string into a real past date. No native date-picker dependency (the mockup shows a plain masked field). Error surfacing mirrors `TextField`/`PhoneInput` (`border-danger` + danger caption, `accessibilityLiveRegion="polite"`). Designed for reuse by S10 and S11.

### `FilterChip`
- **Path**: `src/components/ui/FilterChip.tsx`
- **Category**: ui
- **Props**: `{ label: string; selected: boolean; onPress: () => void; disabled?: boolean; testID?: string }`
- **Used in**: S6 Explore (filter row "Todos / Perto / Hoje / Iniciante / 6x6"), S9 Ranking (scope tabs — "Amigos" active; "Bairro"/"Geral" `disabled`), S11 Create Match (date/format/level/type/confirm-window chips), S12 Match Detail (organizer "2 times / 3 times / 4 times" team-count group, single-select)
- **Example**:
  ```tsx
  <FilterChip label="Perto" selected={activeFilter === 'perto'} onPress={() => setActiveFilter('perto')} />
  <FilterChip label="Bairro" selected={false} onPress={() => {}} disabled />
  ```
- **Notes**: Selectable filter pill — controlled and purely presentational (holds no state, never fetches). `h-9 px-4 rounded-pill` with a `font-mono` `text-mono` uppercase label. Selected = `bg-primary` fill + `text-text-on-dark`; unselected = `bg-white border border-line` + `text-text-primary`. `disabled` renders an inert, muted pill (`bg-bg-light-alt` + `text-text-muted`, press is no-op via `Pressable disabled`) — used by S9's "Em breve" Bairro/Geral scope tabs. Single `accessibilityRole="button"` exposing `accessibilityState={{ selected, disabled }}`. Distinct from a static tag/pill (this is interactive single/multi-select chrome). Designed for reuse by S11 (date/format/level chips) and S9/S10 (scope/position chips).

### `SearchField`
- **Path**: `src/components/ui/SearchField.tsx`
- **Category**: ui
- **Props**: `{ value: string; onChangeText: (v: string) => void; placeholder?: string; onClear?: () => void; testID?: string }`
- **Used in**: S6 Explore (match-list search)
- **Example**:
  ```tsx
  <SearchField value={query} onChangeText={setQuery} placeholder="Buscar quadra, bairro ou horário..." onClear={() => setQuery('')} />
  ```
- **Notes**: Label-less search input — controlled and purely presentational (holds no state, never fetches). `h-12 px-4 rounded-pill bg-white shadow-card` container with a leading lucide `Search` (`text-muted`) and an optional trailing clear (`X`) shown only when `value` is non-empty and `onClear` is provided. Exposes `accessibilityLabel="Buscar partidas"`. Distinct from `TextField` (an RHF-controlled **labeled** form field with error caption/adornments) — `SearchField` is an ephemeral filter control, not a form input (no RHF/Zod). Designed for reuse by S11 ("Buscar quadra ou endereço") and S10. **Deferred catalog note (from S11):** S11's "LOCAL" mockup shows a leading `MapPin`, but the leading icon is currently hardcoded to lucide `Search`. S11 uses it as-is; a future change may add an optional `leftIcon`/`icon` prop so consumers can swap the leading glyph — not done as part of S11 to avoid touching a shared component's API mid-screen.

### `Avatar`
- **Path**: `src/components/ui/Avatar.tsx`
- **Category**: ui
- **Props**: `{ uri?: string; name?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; level?: number; testID?: string }`
- **Used in**: S8 Profile (header + ranking preview rows)
- **Example**:
  ```tsx
  <Avatar uri={profile.avatarUrl} name={profile.firstName} size="md" />
  <Avatar name={row.name} size="sm" />
  ```
- **Notes**: Circular avatar (`rounded-full`). Renders a cached `expo-image` (`contentFit="cover"`) of the player's photo when `uri` is present, otherwise a **brand default illustration** from `src/theme/defaultAvatars.ts` — seeded by `name` (`defaultAvatarFor`) so a given player is stable and a roster shows variety, matching the prototype (which uses these illustrations as everyone's default photo). Pass `defaultSource={DEFAULT_AVATAR}` to pin a specific avatar to the prototype's volleyball-court illustration (used for the current user across the profile header, player card, edit, and feedback so they stay consistent). Sizes: `sm` (`h-10 w-10`, ranking/header rows), `md` (`h-12 w-12`, header), `lg` (`h-16 w-16`, S9 podium), `xl` (`h-32 w-32`, S8b player-card photo). When `level` is set, overlays a tier-colored level badge ("bolinha") at the bottom-right (colors from `src/theme/levelTier.ts`, mirroring the prototype's `BadgeAvatar`); the badge exposes `accessibilityLabel="Nível N"` and `testID="avatar-level-badge"`. Exposes `accessibilityLabel` derived from `name`. Receives plain data via props; never fetches. Designed for reuse by S9/S10/S12/S15.

### `StepperField`
- **Path**: `src/components/ui/StepperField.tsx`
- **Category**: ui
- **Props**: `{ label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; prefix?: string; testID?: string }`
- **Used in**: S11 Create Match (VAGAS & VALOR — "Jogadores" count + "Valor / pessoa" price), S12 Match Detail (organizer "Jogadores por time" team-config stepper)
- **Example**:
  ```tsx
  <StepperField label="Jogadores" value={value} onChange={onChange} min={2} testID="players-stepper" />
  <StepperField label="Valor / pessoa" value={value} onChange={onChange} min={0} prefix="R$ " testID="price-stepper" />
  ```
- **Notes**: Boxed numeric stepper — eyebrow label, a large `font-num` value (with an optional `prefix` like `"R$ "`), and round `−` / `+` controls (lucide `Minus`/`Plus`). Fills the gap `TextField` (free text) doesn't cover. Controlled; clamps to `[min, max]` and disables the relevant control at the bound (50% opacity). The root `View` is `flex-1` so two steppers sit side-by-side in a `flex-row gap-4` row. Each control exposes `accessibilityRole="button"` + `accessibilityState={{ disabled }}` and the value exposes an `accessibilityLabel`. Receives plain data via props; never fetches.

### `ToggleField`
- **Path**: `src/components/ui/ToggleField.tsx`
- **Category**: ui
- **Props**: `{ icon?: ReactNode; title: string; caption?: string; value: boolean; onValueChange: (v: boolean) => void; testID?: string }`
- **Used in**: S11 Create Match (PRIVACIDADE — "Partida aberta")
- **Example**:
  ```tsx
  <ToggleField icon={<Lock size={20} color={colors.primary} />} title="Partida aberta" caption="Qualquer um pode entrar nas vagas" value={value} onValueChange={onChange} testID="open-toggle" />
  ```
- **Notes**: Boolean switch row — optional leading icon + title + caption + a native RN `Switch` on a `bg-white rounded-card border border-line` row. The `Switch` carries the accessible `role="switch"` + `accessibilityState={{ checked }}` and label (title). RN core `Switch` styles via `trackColor`/`thumbColor` props (not className) — track/thumb colors mirror the `notifications.tsx` precedent (`#E8EEF8` bg-light-alt off / `colors.primary` on / `colors.textOnDark` thumb). Controlled; never fetches. **Row-chrome precedent**: S12's inlined Manual/Automático draw-mode radio rows mirror this exact row layout (icon + title + caption on a `bg-white rounded-card border` row) but with a trailing lucide `Check` instead of a `Switch` and `accessibilityRole="radio"` (single-select). That is a one-screen presentational variation — it is **inlined in `app/matches/[id].tsx`**, not extracted, and adds no `ToggleField` API change.

### `CourtImage`
- **Path**: `src/components/ui/CourtImage.tsx`
- **Category**: ui
- **Props**: `{ tint: string; height: number; radius?: number; label?: string; children?: ReactNode }`
- **Used in**: S5 Home / S6 Explore match-card covers (`MatchCard`, `MatchCardCompact`)
- **Example**:
  ```tsx
  <CourtImage tint={match.tint} height={172} radius={16}>{overlay}</CourtImage>
  ```
- **Notes**: On-brand match-cover placeholder (ports the prototype's `CourtImage`). A `tint → navy` `expo-linear-gradient` fill behind a faint volleyball court-line motif drawn with plain Views (outer box + center line + two dashed attack lines — **no `react-native-svg`**, so it renders cheap and is test-safe). Overlaid `children` are positioned absolutely by the caller; `radius` is `0` when the cover sits flush at a card's top. Gradient end color from `src/theme/colors.ts`.

### `Tag`
- **Path**: `src/components/ui/Tag.tsx`
- **Category**: ui
- **Props**: `{ children: ReactNode; bg?: string; color?: string; dot?: boolean }`
- **Used in**: `MatchCard` (format + level tags), `MatchCardCompact` (category tag)
- **Example**:
  ```tsx
  <Tag bg={colors.primary} color={colors.textOnDark} dot>CASUAL</Tag>
  ```
- **Notes**: Small uppercase pill label (ports the prototype's `Tag`): `font-body-bold` (DM Sans 700), 10px, letter-spacing 1, `rounded-pill`. `bg`/`color` are passed in because they vary per use (category/format/level) and the caller owns the DESIGN_SYSTEM priority-color choice; optional leading `dot` in the label color. Purely presentational.

<!--
More UI primitives will live here:

### `GradientButton`
### `Input`
### `Card`
### `Avatar`
### `Badge`
### `Pill`
### `IconButton`
-->

---

## Icons (`src/components/icons/`)

### `QuadraLogo`
- **Path**: `src/components/icons/QuadraLogo.tsx`
- **Props**: `{ size?: number; testID?: string }`
- **Used in**: S1 Splash, S2 Login
- **Notes**: Official brand mark (three overlapping blocks, blue + lime). Colors are fixed — never recolor.

### `GoogleMark`
- **Path**: `src/components/icons/GoogleMark.tsx`
- **Props**: `{ size?: number; testID?: string }`
- **Used in**: S2 Login (as the `leftIcon` of the "Entrar com Google" button)
- **Notes**: Google "G" brand SVG ported to `react-native-svg`. Purely visual; fixed brand colors (not themeable). Pulls in **no** Google SDK.

---

## Layout (`src/components/layout/`)

*(empty — will be populated)*

<!--
### `Screen`               — base safe-area wrapper with default bg
### `Header`               — top header with optional back button + actions
### `BottomTabBar`         — custom bottom nav (4 tabs + central FAB)
### `Section`              — section with title + content slot
-->

---

## Domain components (`src/components/domain/`)

### `MatchCard`
- **Path**: `src/components/domain/MatchCard.tsx`
- **Category**: domain
- **Props**: `{ match: NearbyMatch; onPress: (id: string) => void; testID?: string }` where `NearbyMatch = { id: string; name: string; format: '2X2' | '4X4' | '6X6'; level: 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO'; distanceKm: number; confirmed: number; capacity: number; priceLabel: string; tint: string }` (from `@/features/matches/types/match`)
- **Used in**: S5 Home ("JOGOS PERTO DE VOCÊ" grid). Reused by S6 Explore grid and S17 map bottom sheet.
- **Example**:
  ```tsx
  <MatchCard match={m} onPress={(id) => router.push({ pathname: '/matches/[id]', params: { id } })} />
  ```
- **Notes**: Image-forward card mirroring the prototype's `NearbyCard`. A `<CourtImage>` cover (`height 172`) tinted per match by `match.tint`, with a dark bottom scrim. Top-left: a stacked `<Tag>` pair — a translucent-white format tag + a lime level tag. Overlaid bottom block: a `MapPin` distance in `font-mono` brightLime (`"1,2 km"`, comma decimal), the venue name (`font-body-bold`, single line, white), and a row with a `Users` confirmed/capacity and a `font-num` brightLime price. Single `accessibilityRole="button"` target announcing name + distance. Receives plain data via props; never fetches. No hardcoded hex — colors come from `src/theme/colors.ts`.

### `MatchCardCompact`
- **Path**: `src/components/domain/MatchCardCompact.tsx`
- **Category**: domain
- **Props**: `{ match: UpcomingMatch; onPress: (id: string) => void; testID?: string }` where `UpcomingMatch = { id: string; name: string; startsAt: string; category?: string; openSlots: number; priceLabel: string; avatarUrls: string[]; tint: string }` (from `@/features/matches/types/match`)
- **Used in**: S5 Home ("PRÓXIMAS PARTIDAS" horizontal scroll). (Not used on S8 — the S8 "MINHAS PARTIDAS" rows are result rows, rendered by `MatchHistoryRow`, not compact cover cards.)
- **Example**:
  ```tsx
  <MatchCardCompact match={m} onPress={(id) => router.push({ pathname: '/matches/[id]', params: { id } })} />
  ```
- **Notes**: Light `bg-white rounded-card shadow-card` compact card (`w-[262px]`) mirroring the prototype's upcoming card. A `<CourtImage>` cover (`height 124`, flush top, `radius 0`) tinted by `match.tint` with a category `<Tag>` (blue+dot for "CASUAL", else lime) top-left. Content block: the match name (`font-body-bold` 16px, single line), a `Clock` datetime rendered relatively (`"Hoje · 19h30"` / `"Amanhã · 20h00"` / `"20/06 · 19h30"` via a pure internal formatter, `font-body-semibold`), then a hairline footer with a confirmed-avatar stack (`expo-image`, max 3 + "+N" overflow) and two matched badges — `"N vagas"` (blue on blue-tint) and price (`font-body-bold`, green when "Grátis", else navy, on `bg-light`). Single `accessibilityRole="button"` target announcing name + datetime. Receives plain data via props; never fetches. No hardcoded hex — colors come from `src/theme/colors.ts`.

### `LevelBar`
- **Path**: `src/components/domain/LevelBar.tsx`
- **Category**: domain
- **Props**: `{ level: number; xp: number; xpToNext: number; testID?: string }`
- **Used in**: S8 Profile ("Seu progresso" card)
- **Example**:
  ```tsx
  <LevelBar level={profile.level} xp={profile.xp} xpToNext={profile.xpToNext} />
  ```
- **Notes**: Labeled XP progress bar — a "Level N" label (`font-num`), a track (`bg-bg-light-alt`) + fill (lime `bg-accent`) bar, and an "XP: a / b" caption (thousands formatted pt-BR, e.g. `2.450`). The fill width is the only inline style (a runtime percentage NativeWind can't express); no colors are inlined. The ratio is clamped to `[0, 1]`. Receives plain data via props; never fetches. Designed for reuse on profile/ranking surfaces.

### `MatchHistoryRow`
- **Path**: `src/components/domain/MatchHistoryRow.tsx`
- **Category**: domain
- **Props**: `{ match: RecentMatch; onPress: (id: string) => void; testID?: string }` where `RecentMatch = { id: string; name: string; playedAt: string; format: '2X2' | '4X4' | '6X6'; result: 'VITORIA' | 'DERROTA'; setScore: string }` (from `@/features/profile/types/profile`)
- **Used in**: S8 Profile ("MINHAS PARTIDAS" recent-match list)
- **Example**:
  ```tsx
  <MatchHistoryRow match={m} onPress={(id) => router.push({ pathname: '/matches/[id]', params: { id } })} />
  ```
- **Notes**: Slim recent-match result row (distinct from `MatchCardCompact`, which is a cover-strip *upcoming* card). A `Volleyball` icon in a `bg-bg-light-alt` circle, the match name + "date · format" subtitle (`playedAt` rendered relatively as `"Hoje · 19h30"` / `"Ontem · 19h30"` / `"20/06"` via a pure internal formatter), a right-aligned Vitória/Derrota label (`text-success` / `text-danger`) over the set score (`font-num`), and a trailing `ChevronRight`. Single `accessibilityRole="button"` target announcing name + result + score. Receives plain data via props; never fetches. No hardcoded hex — icon colors come from `src/theme/colors.ts`.

### `RankingRow`
- **Path**: `src/components/domain/RankingRow.tsx`
- **Category**: domain
- **Props**: `{ row: RankingRow; isMe: boolean; testID?: string }` where `RankingRow = { position: number; playerId: string; name: string; subtitle: string; score: number; isMe?: boolean; trend?: { direction: 'up' | 'down' | 'flat'; delta: number } }` (from `@/features/ranking/types/ranking`)
- **Used in**: S9 Ranking (position-4+ list). Available to S8 to replace its inline preview rows later (not required yet).
- **Example**:
  ```tsx
  <RankingRow row={row} isMe={userId === row.playerId} />
  ```
- **Notes**: Single **non-navigable** ranking-list row: a large `font-num` `text-primary` position number, an `<Avatar size="sm" />`, the name (`text-body-bold`; appends "· você" in `text-primary` when `isMe`), an `@handle · Posição` `text-caption text-text-muted` subtitle, a right-aligned `font-num` score, and a `TrendBadge` (↑ `success` / ↓ `danger` / — `text-muted`, arrows via lucide `ArrowUp`/`ArrowDown`/`Minus` colored from `src/theme/colors.ts`, delta in `font-num`; absent `trend` → "—"). The `isMe` row gets a subtle `bg-primary/10 rounded-card` highlight. No `accessibilityRole="button"` (rows are display-only); a single `accessibilityLabel` announces position/name/score/trend (+ "você"). Receives plain data via props; never fetches. No hardcoded hex.

### `PresenceGrid`
- **Path**: `src/components/domain/PresenceGrid.tsx`
- **Category**: domain
- **Props**: `{ players: PresencePlayer[]; capacity: number; onPressEmpty?: () => void; testID?: string }` where `PresencePlayer = { id: string; name: string; avatarUrl?: string; status: 'CONFIRMADO' | 'RECUSADO' | 'PENDENTE'; position?: 'LEV' | 'PON' | 'OPO' | 'CEN' | 'LIB' | 'COR'; isGuest?: boolean }` (from `@/features/matches/types/matchDetail`)
- **Used in**: S12 Match Detail ("CONFIRMADOS" confirmed-players grid). Designed for reuse by S13 (team rosters share the avatar+slot idiom).
- **Example**:
  ```tsx
  <PresenceGrid players={match.players} capacity={match.capacity} onPressEmpty={() => setGuestSheetOpen(true)} testID="presence-grid" />
  ```
- **Notes**: Capacity-aware wrapping grid (`w-1/4` cells) — renders an `<Avatar size="md" />` + name per player, then dashed `border-line` "vaga" placeholders for the remaining `capacity - players.length` open slots (each tagged `{testID}-empty`). A player with `isGuest` gets a muted "Convidado" eyebrow under the name. When `onPressEmpty` is passed the empty slots become buttons (organizer "add guest" affordance on S12); omit it for inert placeholders. Presentational: receives plain data via props, never fetches. **No per-player OVR number is rendered** (Layer-3 cut, per SCOPE S12). Avatars are display-only (no tap navigation). Small grid (≤ capacity, typically ≤ 12) → a wrapping `View` is used, not a `FlatList`.

### `AddGuestSheet`
- **Path**: `src/components/domain/AddGuestSheet.tsx`
- **Category**: domain
- **Props**: `{ visible: boolean; onClose: () => void; onSubmit: (values: AddGuestInput) => void; submitting?: boolean; testID?: string }` where `AddGuestInput = { name: string; position?: PlayerPosition }` (from `@/features/matches/schema/addGuest`)
- **Used in**: S12 Match Detail — organizer taps an open "vaga" slot in `PresenceGrid` to fill it with a guest (someone without an app account).
- **Example**:
  ```tsx
  <AddGuestSheet visible={open} onClose={() => setOpen(false)} onSubmit={handleAddGuest} submitting={addGuest.isPending} testID="add-guest-sheet" />
  ```
- **Notes**: Bottom-sheet (`Modal transparent animationType="slide"`) with a RHF + Zod form — required `Nome` (`TextField`) + optional `Posição` (`FilterChip` row; tap again to clear). Form resets each time it opens. Backdrop tap and the close/× dismiss. Respects the bottom safe-area inset. Presentational: the parent owns the `useAddGuest` mutation and closes the sheet on success.

### `CoverPicker`
- **Path**: `src/components/domain/CoverPicker.tsx`
- **Category**: domain
- **Props**: `{ uri?: string; onPress: () => void; testID?: string }`
- **Used in**: S11 Create Match (CAPA DA PARTIDA cover banner)
- **Example**:
  ```tsx
  <CoverPicker uri={coverUri} onPress={pickCover} testID="cover-picker" />
  ```
- **Notes**: Rectangular match-cover banner (`h-40 rounded-card`) — distinct from the circular `Avatar`. With no `uri` it renders a navy `HERO_GRADIENT` (`expo-linear-gradient`) placeholder with a "CAPA DA PARTIDA" eyebrow, a dashed frame, and a pencil + "Trocar capa" affordance; once picked it shows the chosen image (`expo-image`, `contentFit="cover"`) with the same affordance overlaid. Presentational: the consuming screen owns the `expo-image-picker` invocation (passed via `onPress`); the component never touches the picker or fetches. Single `accessibilityRole="button"` announcing "Trocar capa da partida". No hardcoded hex — gradient/icon colors from `src/theme/colors.ts`.

### `TeamRoster`
- **Path**: `src/components/domain/TeamRoster.tsx`
- **Category**: domain
- **Props**: `{ teamId: string; teamName?: string; players: PresencePlayer[]; testID?: string }` where `PresencePlayer = { id: string; name: string; avatarUrl?: string; status: PresenceStatus; position?: PlayerPosition }` (from `@/features/matches/types/matchDetail`)
- **Used in**: S13 In-Game Teams (team roster columns)
- **Example**:
  ```tsx
  <TeamRoster teamId="team-1" teamName="Time 1" players={team.players} testID="team-roster-1" />
  ```
- **Notes**: Vertical team roster column — displays a team header (name/number), a vertical stack of player `<Avatar size="md" />`, and optional position badges (PON, LEV, etc. on a `primary` pill). Presentational: receives plain data via props, never fetches. Designed for S13 where N columns (2, 3, or 4) are rendered side-by-side in a `flex-row gap-4` layout.

<!--
### `PlayerAvatar`         — circular avatar with position-colored ring
### `ScoreBoard`           — live score display
### `StatBlock`            — labeled stat (e.g. ACE 30)
### `PositionBadge`        — colored pill (PON, OPO, LEV, LIB, etc.)
-->

---

## Decision log (when to extract vs inline)

A component goes here ONLY when one of these is true:

1. **Used in ≥ 2 screens** — clear reuse case
2. **Complex enough to deserve its own tests** — e.g. ScoreBoard with set-by-set logic
3. **Encapsulates a design-system primitive** — Button, Card, Avatar

A component does NOT go here when:

- It's a one-off layout piece for a specific screen
- It's a tiny wrapper around a single NativeWind class
- It exists "in case we need it later" — extract only when reuse happens

---

## Naming rules

- `PascalCase` filename matches the export name
- Props interface: `ComponentNameProps`
- No "Component" suffix in the name (`Button`, not `ButtonComponent`)
- Variants live as props (`<Button variant="primary">`), not as separate files (`<PrimaryButton>`)
