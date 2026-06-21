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
- **Props**: `{ match: NearbyMatch; onPress: (id: string) => void; testID?: string }` where `NearbyMatch = { id: string; name: string; format: '2X2' | '4X4' | '6X6'; level: 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO'; distanceKm: number; confirmed: number; capacity: number; priceLabel: string }` (from `@/features/matches/types/match`)
- **Used in**: S5 Home ("JOGOS PERTO DE VOCÊ" grid). Reused by S6 Explore grid and S17 map bottom sheet.
- **Example**:
  ```tsx
  <MatchCard match={m} onPress={(id) => router.push({ pathname: '/matches/[id]', params: { id } })} />
  ```
- **Notes**: Dark, image-forward card on a navy `HERO_GRADIENT` (`expo-linear-gradient`) with `text-on-dark` copy. Top row: a translucent format mono pill + a lime `bg-accent` level pill; then a `MapPin` distance (`"1,2 km"`, comma decimal), the venue name (`text-h3`, single line), and a footer with a `Users` confirmed/capacity (`font-num`) and a lime `font-num` price. Single `accessibilityRole="button"` target announcing name + distance. Receives plain data via props; never fetches. No hardcoded hex — icon/gradient colors come from `src/theme/colors.ts`.

### `MatchCardCompact`
- **Path**: `src/components/domain/MatchCardCompact.tsx`
- **Category**: domain
- **Props**: `{ match: UpcomingMatch; onPress: (id: string) => void; testID?: string }` where `UpcomingMatch = { id: string; name: string; startsAt: string; category?: string; openSlots: number; priceLabel: string; avatarUrls: string[] }` (from `@/features/matches/types/match`)
- **Used in**: S5 Home ("PRÓXIMAS PARTIDAS" horizontal scroll). Reused by S8 (recent matches strip).
- **Example**:
  ```tsx
  <MatchCardCompact match={m} onPress={(id) => router.push({ pathname: '/matches/[id]', params: { id } })} />
  ```
- **Notes**: Light `bg-white rounded-card shadow-card` compact card (`w-64`). Navy cover strip with an optional category mono pill, then the match name (`text-h3`, single line), a `Clock` datetime rendered relatively (`"Hoje 19h30"` / `"Amanhã 20h00"` / `"20/06 19h30"` via a pure internal formatter), a confirmed-avatar stack (`expo-image`, max 3 + "+N" overflow), a `"N vagas"` label, and a lime price pill. Single `accessibilityRole="button"` target announcing name + datetime. Receives plain data via props; never fetches. No hardcoded hex — icon colors come from `src/theme/colors.ts`.

<!--
### `PlayerAvatar`         — circular avatar with position-colored ring
### `ScoreBoard`           — live score display
### `StatBlock`            — labeled stat (e.g. ACE 30)
### `LevelBar`             — XP progress bar with level indicator
### `RankingRow`           — single row of the group ranking
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
