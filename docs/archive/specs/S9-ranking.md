# Screen Spec: S9 — Full Group Ranking

✅ **scope-guardian: APPROVED** — all 11 checklist items pass. Item 3 (backend gate, rule #10) cleared via the owner-approved S5/S6/S8 mocked posture (reuses the existing `useGroupRanking` with `preview: false`). The three "Open questions" are resolved to the spec's documented MVP-mock defaults: (1) render an inert single-group selector affordance; (2) extend `RankingRow` with an optional `trend` populated by the mock (real semantics deferred to F2.3); (3) a sub-3-member group renders a partial podium with the position-4+ list absent. Implementer notes confirmed: `trend` is additive (S8 unaffected), `success` must be added to `src/theme/colors.ts` (mirroring `danger`), and `FilterChip` needs a minimal additive `disabled?` prop (or plain disabled pills).

## Origin
- Screen from SCOPE: S9 — Full Group Ranking
- Layer: 2 (Retention) — F2.3 group ranking. The full-list destination of the S8 ranking preview's "Ver tudo".
- Requested by: human (renanortega.dev@gmail.com)

## Reference assets read
- [x] `docs/references/screens/S9-ranking/amigos-ranking.png` — the only PNG under S9's `Reference:` line in SCOPE.md (⚠️ marked "screenshot only" — no prototype source). Read in full; it is the sole layout/hierarchy reference.

What the screenshot shows, top to bottom:
1. **Header** — "RANKING" display title (top-left) + a notification bell and a sun/moon theme icon (top-right). No avatar/greeting (unlike S8).
2. **Scope tabs** — a 3-segment pill row: **"Bairro" (rendered active/blue in the print) · "Amigos" · "Geral"**.
3. **Top-3 podium** — three columns: 2nd (left, shorter), 1st (center, tallest, on a navy block), 3rd (right). Each has a circular avatar with a numbered medal badge, the player name, and a blue score (`font-num`). The center "1º" sits on a tall navy pedestal; 2º/3º on white pedestals.
4. **Ranked list (position 4+)** — white rows, each: a large position number (blue), avatar, name (with "· você" in blue on the current user's row), a "@handle · Posição" muted subtitle, a right-aligned score (`font-num`), and a small trend indicator under it (green "↑ 5", grey "—", red "↓ 2").
5. Bottom tab bar (Início/Explorar/Jogar FAB/Rede/Perfil) is drawn in the print.

## Notable divergences from the prototype
SCOPE wins on behavior/in-out; the PNG wins on visual hierarchy; DESIGN_SYSTEM wins on tokens. Divergences (each justified):

- **Active scope tab is "Amigos", not "Bairro".** The print renders **"Bairro" as the active/blue tab**, but SCOPE S9 is explicit: *"for MVP only the 'Amigos' (group) tab is functional; 'Bairro' and 'Geral' are shown disabled / 'Em breve'."* "Bairro" (city) and "Geral" (global) are Layer 3. So this spec makes **"Amigos" the default-selected, functional tab** and renders **"Bairro" + "Geral" disabled with an "Em breve" affordance** — the inverse of the print's highlight. (SCOPE rule: the prototype may show Layer-3 features the MVP cuts.)
- **Bottom tab bar is NOT present on S9.** The print draws it, but S9's route is `app/profile/ranking.tsx` — a **stack** screen *outside* the `(tabs)` group (it's the destination of `router.push('/profile/ranking')`). Stack screens pushed over the tabs do not carry the tab bar; S9 gets a back affordance instead. (SCOPE wins on routing via the `Route` line; the print's tab bar is a prototype artifact of rendering every screen full-frame.)
- **Trend indicator (↑/↓/—) requires a new data field.** The print shows a per-row trend (green up / red down / grey flat with a delta number). The existing shared `RankingRow` type (`src/features/ranking/types/ranking.ts`, owned jointly with S8) has **no `trend` field**. SCOPE S9 explicitly lists *"trend indicator (↑/↓/—)"* as IN. This spec **extends `RankingRow` with an optional `trend`** (see "New components / types") — additive, so S8's preview is unaffected.
- **"@handle · position" subtitle.** The print's list rows show `@renan · Levantador`. The existing `RankingRow.subtitle` is a free "secondary line" string; the S8 mock populates it with a full name ("Renan Dias"). For S9 the same `subtitle` field carries `@handle · Posição` (the mock data, owned by the shared hook, is updated to that shape — no type change needed, `subtitle` already covers it). Documented so the implementer aligns the mock subtitle to the S9 print.
- **Group selector (multiple recurring matches).** SCOPE S9 IN: *"group selector if user belongs to multiple recurring matches (within the 'Amigos' tab)."* The print shows **no** group selector (it shows a single ranking). This is a SCOPE-required affordance with no visual reference → rendered as a minimal control (see "Open questions"); for MVP-mock it defaults to a single group and the selector is **present but inert** (one group), flagged for design.

## Goal
Let the onboarded user see the full weekly ranking of their recurring-match group — a top-3 podium plus the ranked list from position 4 down — with their own row highlighted, reached from the S8 "Ver tudo".

## Route
`app/profile/ranking.tsx` — **verified**: the file exists today as a placeholder (`<Text>Ranking</Text>`), S8 navigates here via `router.push('/profile/ranking')` (verified in `app/(tabs)/profile.tsx`), and the typed href resolves. It is a **stack** screen registered by the **root** `<Stack>` in `app/_layout.tsx` (`screenOptions={{ headerShown: false }}`); there is **no** `app/profile/_layout.tsx`. Because `headerShown` is false group-wide, S9 owns its own header (title + back) inline — consistent with how S5–S8 own their headers. (If a `profile/` stack header is wanted later, that's an `_layout.tsx` addition, out of scope here.)

## Backend dependencies

> ### ⚠️ Scope override (owner-approved) — same posture as S5/S6/S8
> Per CLAUDE/agent rule #10, an undefined backend endpoint would normally STOP the spec. The owner (renanortega.dev@gmail.com) has, for the data-display screens (S5/S6/S8), **consciously approved shipping fully mocked** ahead of backend alignment. S9 follows that locked convention and, critically, **reuses the same already-shipped mock hook S8 introduced** — no new mock hook.
> - **(a) Not yet in backend SCOPE:** the concrete endpoint path for **F2.3** (group ranking) is not yet aligned in quadra-api.
> - **(b) Conscious decision:** S9 ships **fully mocked** this iteration, reading the existing `useGroupRanking` hook with `preview: false`.
> - **(c) Explicit follow-up (gating real wiring):** backend alignment for **F2.3** in quadra-api must precede replacing the mock. The hook signature is designed so the swap is path-only behind the unchanged interface.

**NONE asserted this iteration — the read is mocked.** S9 references **no new** endpoint and **creates no new** API file. It consumes the existing:

- `src/features/ranking/api/getGroupRanking.ts` — `useGroupRanking({ preview: false })`. **Already exists** (shipped by S8; MOCK, `// TODO(real-api):` → F2.3). S8 calls it with `preview: true` (short preview); **S9 calls it with `preview: false`** (full list). Query key `['ranking', 'group', { preview: false }]`, `staleTime: 60_000`. **Do NOT duplicate this hook.**

> **Mock-data note (implementer action, no new file):** the current `MOCK_RANKING` stub in `getGroupRanking.ts` returns only 4 rows and ignores `params.preview`. For S9 to show a podium (3) **plus** a list (4+), the mock must return **≥ 6–8 rows** and **branch on `preview`** (preview → top rows + the user's row; full → the whole list). This is a change to the **existing mock body behind the unchanged hook signature** — not a new hook, not a contract change. Also align each row's `subtitle` to the S9 `@handle · Posição` shape and add the optional `trend` (see types below). The `// MOCK:` / `// TODO(real-api):` markers stay.

## Existing components reused
- `Avatar` (`src/components/ui/Avatar.tsx`) — `size="lg"` for the podium avatars (its `lg` is documented as "podium (S9)"), `size="sm"` for the list rows. Falls back to an initial when `uri` is absent (the mock rows have no avatar URL). Reused as-is.
- `Button` (`src/components/ui/Button.tsx`) — `variant="ghost"` for the per-section retry link and any "Em breve" inert label; `variant="outline"` only if a primary action is needed (none required by this read-only screen). No new variant.
- `FilterChip` (`src/components/ui/FilterChip.tsx`) — its catalog note already earmarks it for "S9 … scope chips". Used for the **scope tabs** ("Amigos" selected; "Bairro"/"Geral" disabled). See Implementation notes for the `disabled` gap.
- `colors` / `HERO_GRADIENT` (`src/theme/colors.ts`) — runtime color values for lucide icon `color` props (bell, sun, chevron-left back, trend arrows) and the navy `LinearGradient` of the 1st-place pedestal / any dark hero block. No inline hex.
- `RankingRow` **type** (`src/features/ranking/types/ranking.ts`) — reused (extended additively with `trend`, below).
- Header pattern — inlined the same way S5/S6/S7/S8 inline it (no shared `Header` component exists in the catalog yet). S9 uses the **title + back** variant (title-only header plus a leading back affordance, since it's a pushed stack screen, not a tab).

## New components proposed
The S8 spec deliberately left the reusable **`RankingRow` *component*** to S9 ("the screen that owns the full ranking"). S9 is that screen, and it renders the same row shape many times (list 4+) — clear reuse case (rule 1 + 2 of the COMPONENTS.md decision log). One new component; one additive type extension.

- `RankingRow` — *why nothing fits*: the catalog has **no** ranking-row primitive (the `<!-- RankingRow -->` placeholder in COMPONENTS.md is unimplemented; S8 used an **inline** preview row on purpose and flagged that S9 owns the extraction). The full list needs a consistent row: position number, avatar, name (+ "· você"), `@handle · posição` subtitle, score, and a trend indicator.
  - Path: `src/components/domain/RankingRow.tsx`
  - Props:
    ```ts
    type RankingRowProps = {
      row: RankingRow;        // from @/features/ranking/types/ranking (incl. optional trend)
      isMe: boolean;          // derived by the screen from useAuthStore().userId === row.playerId
      testID?: string;
    };
    ```
  - Renders: `position` (`font-num`, blue/`text-primary` on light), `<Avatar size="sm" />`, name (`text-body-bold`; appends `· você` in `text-primary` when `isMe`), `subtitle` (`text-caption text-text-muted`), `score` (`font-num`), and a `TrendBadge` (↑ green `text-success` / ↓ red `text-danger` / — grey `text-text-muted`, with the delta number; arrows via `lucide` `ArrowUp`/`ArrowDown` or a `Minus`, colored from `src/theme/colors.ts`). The `isMe` row gets a subtle `bg-bg-light-alt`/`bg-primary/10` highlight + rounded container. Single `accessibilityRole="button"` is **not** applied (rows are non-navigable here — see Navigation); instead an `accessibilityLabel` announces "position, name, score, trend" and "você" when `isMe`. Receives plain data via props; never fetches. Will be added to COMPONENTS.md by the implementer.
  - Reused by: S9 list rows; available to S8 to replace its inline preview rows later (not required this iteration).

- **Type extension (not a component): `RankingRow.trend`** — add an **optional** field to `src/features/ranking/types/ranking.ts`:
  ```ts
  /** Movement since the previous ranking period. Absent → render "—" (flat). */
  trend?: { direction: 'up' | 'down' | 'flat'; delta: number };
  ```
  Additive and optional, so S8's preview (which doesn't render trend) is unaffected. The mock populates it for the full list. `// TODO(real-api):` F2.3 supplies the real trend.

The **podium** (top-3 visual), the **scope-tab row**, the **header**, and the **group selector** stay **inline** in `app/profile/ranking.tsx` — each is a one-off composition for this screen (decision-log "does NOT go here": one-off layout pieces). The podium reuses `Avatar`; it is not extracted until a second podium consumer appears.

If the implementer finds the podium genuinely reused elsewhere, revisit — but for MVP it is inline.

## Layout structure

Token references only; NativeWind classes; no hex; no `StyleSheet.create`. Mirrors the S8 inline-header + `ScrollView` shell, with a stack back affordance instead of a tab-bar.

```
<View className="flex-1 bg-bg-light">
  <SafeAreaView edges={['top']} className="flex-1">

    # ── Header (inline; title + back variant) ──
    <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
      <View className="flex-row items-center gap-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()}>
          <ChevronLeft color={colors.surfaceDark} />
        </Pressable>
        <Text className="font-display text-h1 text-text-primary uppercase">RANKING</Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Notificações" onPress={noop}>
          <Bell color={colors.surfaceDark} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Alternar tema" onPress={noop}>
          <Sun color={colors.surfaceDark} />
        </Pressable>
      </View>
    </View>

    # ── Scope tabs (Amigos active; Bairro/Geral disabled "Em breve") ──
    <View className="flex-row gap-2 px-4 pb-2">
      <FilterChip label="Bairro" selected={false} onPress={noop} />   # disabled → "Em breve" (see impl notes)
      <FilterChip label="Amigos" selected={true}  onPress={() => setScope('amigos')} />
      <FilterChip label="Geral"  selected={false} onPress={noop} />   # disabled → "Em breve"
    </View>

    # ── Group selector (Amigos tab only; inert single-group for MVP-mock) ──
    <View className="px-4 pb-2">
      <Pressable className="flex-row items-center gap-1" accessibilityRole="button" accessibilityLabel="Selecionar grupo">
        <Text className="font-body text-body-bold text-text-primary">{groupName}</Text>
        <ChevronDown color={colors.surfaceDark} />
      </Pressable>
    </View>

    <ScrollView contentContainerClassName="pb-10">

      # ── Top-3 podium (inline; 2º left, 1º center on navy pedestal, 3º right) ──
      <View className="flex-row items-end justify-center gap-3 px-4 mt-2">
        # 2º
        <View className="items-center">
          <Avatar uri={top[1]?.uri} name={top[1]?.name} size="lg" />
          <Text className="font-body text-body-bold text-text-primary mt-2">{top[1]?.name}</Text>
          <Text className="font-num text-primary">{top[1]?.score}</Text>
          <View className="bg-white rounded-card shadow-card items-center justify-center h-16 w-24 mt-2">
            <Text className="font-num text-text-muted">2º</Text>
          </View>
        </View>
        # 1º (tallest, navy pedestal)
        <View className="items-center">
          <Avatar uri={top[0]?.uri} name={top[0]?.name} size="lg" />
          <Text className="font-body text-body-bold text-text-primary mt-2">{top[0]?.name}</Text>
          <Text className="font-num text-primary">{top[0]?.score}</Text>
          <View className="rounded-card overflow-hidden h-24 w-24 mt-2">
            <LinearGradient colors={HERO_GRADIENT} start={{x:0,y:0}} end={{x:1,y:1}} className="flex-1 items-center justify-center">
              <Text className="font-num text-accent">1º</Text>
            </LinearGradient>
          </View>
        </View>
        # 3º
        <View className="items-center"> ... 3º (white pedestal, shortest) ... </View>
      </View>

      # ── Ranked list (position 4+) ──
      <View className="mx-4 mt-6 bg-white rounded-card shadow-card overflow-hidden">
        {rest.map((row, i) => (
          <View key={row.playerId}>
            {i > 0 ? <View className="h-px bg-line mx-4" /> : null}
            <RankingRow row={row} isMe={userId != null ? row.playerId === userId : Boolean(row.isMe)} />
          </View>
        ))}
      </View>

    </ScrollView>
  </SafeAreaView>
</View>
```

> "RANKING" + any pedestal labels use `font-display`/`font-num` per role. Scores/positions/trend deltas use `font-num` (Russo One). The 1st-place pedestal uses `HERO_GRADIENT` (`src/theme/colors.ts`) with a lime `text-accent` "1º". Trend colors come from semantic tokens (`text-success`/`text-danger`/`text-text-muted`). No inline hex; no `StyleSheet.create`. The list is small (mocked ≤ ~10) so a `ScrollView` + `map` is within ARCHITECTURE's ~10-item `FlatList` threshold; switch the list to a `FlatList` only when real F2.3 returns many rows.

## State

### Server state (TanStack Query hooks)
- `useGroupRanking({ preview: false })` — `src/features/ranking/api/getGroupRanking.ts` (**existing MOCK**; F2.3 later). Key `['ranking', 'group', { preview: false }]`, `staleTime: 60_000`. The screen splits the returned rows into `top = rows.slice(0,3)` (podium) and `rest = rows.slice(3)` (list). **No new hook.**

### Client state (Zustand)
- `useAuthStore` (`src/stores/auth.ts`) — read `userId` to derive each row's `isMe` (prefer the `userId === playerId` match over the mock `isMe` flag, exactly as S8 does). **No new store.** The theme toggle stays a no-op (dark tokens still unspecified — S10's responsibility).

### Local state
- `useState` only for the **active scope tab** (`'amigos'` fixed-functional; `'bairro'`/`'geral'` are disabled and cannot become active) and, if implemented, the **selected group** (defaults to the single mock group; selector is inert for MVP-mock). Minimal, ephemeral, screen-local — no persisted effect. These are pure UI toggles (not server data), so `useState` is correct (ARCHITECTURE component-local state).

### Forms (if any)
- None. S9 is read-only; no form, no RHF/Zod.

## Navigation triggers
- **Back** (header chevron / system back) → `router.back()` (returns to S8 Profile, the pusher).
- **Scope tabs** — "Amigos" selects the functional tab (no navigation; local state). "Bairro"/"Geral" are **disabled** (Layer 3) → no navigation, show "Em breve".
- **Group selector** → opens a group picker **only if** the user belongs to multiple recurring matches. For MVP-mock there's a single group, so it's inert (documented). No new route.
- **Rows / podium** → **no navigation.** SCOPE S9 lists no per-player profile destination (player profiles / search are Layer 3). Rows are non-interactive display (the `isMe` row is highlighted but not tappable). This avoids leaking a Layer-3 player-detail screen.
- Bell / theme toggle → no-op this iteration (documented; consistent with S5–S8).

> **Typed-routes note:** `typedRoutes: true` is enabled. `router.back()` needs no href. No new hrefs are introduced by S9. Everything must pass `npm run typecheck` (PR gate). No legacy `navigation.navigate`.

## Permissions / external integrations
- **NONE.** No location, camera, contacts, or Google. Podium/row avatars load via `expo-image` over the network (no permission); the mock rows have no URL and render the initial fallback.

## Real-time subscriptions (if any)
- None. The ranking is a static weekly read; live subscriptions belong to S14.

## Loading / error / empty states
- **Loading**: while `useGroupRanking` `isPending`, render neutral skeletons — a podium-shaped placeholder (three `bg-bg-light-alt rounded-card` blocks of staggered heights) above a list of `bg-bg-light-alt` row placeholders. (DESIGN_SYSTEM "Skeleton/loading shapes" is still listed as not-yet-specified — reuse the same neutral placeholder S5/S8 established; flag for design.)
- **Error**: a single inline error block — `text-body text-text-muted` "Não foi possível carregar o ranking" + `Button variant="ghost"` "Tentar novamente" calling `refetch()` (mirrors S8's `ErrorRow`). No toast primitive introduced.
- **Empty** (user in no recurring-match group, or group has < the rows a podium needs):
  - Zero rows → centered "Entre em uma partida recorrente para aparecer no ranking" (`text-caption text-text-muted`, `accessibilityLiveRegion="polite"`).
  - 1–3 rows (podium-only, no list) → render the podium with the available places; the "position 4+" list section is simply absent (no empty row).
  - Empty-state illustrations are not yet specified in DESIGN_SYSTEM — text-only for now; flag for design.

## Acceptance criteria
- [ ] Header shows the "RANKING" display title, a back affordance (returns to S8), a notification bell, and a theme toggle.
- [ ] Scope tabs render "Bairro", "Amigos", "Geral"; **"Amigos" is selected and functional**; **"Bairro" and "Geral" are disabled** ("Em breve") and cannot be activated.
- [ ] A top-3 podium renders with 1º centered (on a navy pedestal), 2º left, 3º right — each with an avatar, name, and score (`font-num`), using `useGroupRanking({ preview: false })` data.
- [ ] The ranked list (position 4+) renders one `RankingRow` per remaining row: position number, avatar, name, `@handle · posição` subtitle, score, and a trend indicator (↑ success / ↓ danger / — muted).
- [ ] The current user's row is highlighted and appends "· você" (derived from `useAuthStore().userId === row.playerId`).
- [ ] A group selector affordance is present within the "Amigos" tab (inert/single-group for MVP-mock).
- [ ] Rows and podium entries are **not** navigable (no player-detail screen).
- [ ] Loading shows a skeleton, error shows a retry, and the no-group empty state shows its message — driven by the mocked query states.
- [ ] The screen is reached from S8's "Ver tudo" (`/profile/ranking`) and `router.back()` returns to S8; the bottom tab bar is **not** shown (stack screen).
- [ ] No permission prompt fires on this screen.
- [ ] All criteria are verifiable via RNTL against the mocked query (no MSW / no network) and mocked navigation.

## Out of scope (be explicit)
- **"Bairro" (city) and "Geral" (global) rankings** — Layer 3 (SCOPE S9 OUT: "tabs visible but disabled"). Tabs render disabled with "Em breve".
- **Per-player navigation / player profile / player search** — Layer 3 (global NOT-in-MVP "Player search US 2.2"); rows are display-only.
- **Per-player stats (ACE/BLK/ATA/DEF, OVR cards)** — Layer 3; the row shows only name/handle/position/score/trend.
- **Friend system / "Meus amigos" as a social graph** — Layer 3; this is the **group** ranking (F2.3), not friends (the S8 "Meus amigos" label is a known misnomer).
- **Functional dark-mode theme toggle** — dark tokens unspecified; toggle is a no-op until S10 + dark tokens.
- **Notifications screen / bell badge** — no notifications screen in SCOPE; bell is a no-op.
- **A new API hook or endpoint** — S9 reuses the existing mocked `useGroupRanking` with `preview: false`; real F2.3 wiring is a backend-aligned follow-up behind the unchanged signature.
- **The bottom tab bar on this screen** — S9 is a pushed stack screen; the print's tab bar is a prototype artifact.

## Open questions for scope-guardian / PM
1. **Group selector with no design.** SCOPE S9 requires a group selector "if the user belongs to multiple recurring matches", but the print shows none. Default taken: render an inert single-group affordance (a tappable group-name + chevron) that becomes a real picker once a user has ≥2 groups; for MVP-mock it's a single group. Confirm the affordance shape, or move multi-group selection to a follow-up.
2. **Trend field source.** SCOPE requires the ↑/↓/— trend, which the data layer doesn't yet carry. Default taken: extend `RankingRow` with an optional `trend` and populate it in the mock; real values arrive with F2.3. Confirm the trend semantics (delta vs. position-change vs. score-change) with backend when F2.3 is aligned.
3. **Podium minimum.** If a group has < 3 members, the podium renders partial places and the list is absent. Confirm this degradation is acceptable, or define a minimum-members rule.

## Files to create
- `src/components/domain/RankingRow.tsx` — the reusable ranking-row primitive (position, avatar, name + "· você", `@handle · posição`, score, trend badge). The one extraction S8 deferred to S9.

> The route file `app/profile/ranking.tsx` already exists (placeholder) — it is **modified**, not created (see below).

## Files to modify
- `app/profile/ranking.tsx` — replace the `<Text>Ranking</Text>` placeholder with the full S9 screen (header + scope tabs + podium + list).
- `src/features/ranking/types/ranking.ts` — add the optional `trend` field to `RankingRow` (additive; S8 unaffected).
- `src/features/ranking/api/getGroupRanking.ts` — **extend the existing mock body** (no new file): branch on `params.preview` (full vs. preview), return ≥ 6–8 rows for the full list, align `subtitle` to `@handle · Posição`, and populate `trend`. Keep the `// MOCK:` / `// TODO(real-api):` F2.3 markers and the unchanged hook signature.
- `docs/COMPONENTS.md` — add the `RankingRow` entry; the `<!-- RankingRow -->` placeholder becomes a real catalog entry.

## New npm dependencies
- **NONE — no stack change.** The mocked read uses `@tanstack/react-query` (locked). `Avatar` uses `expo-image` (locked); the podium pedestal uses `expo-linear-gradient` (locked); header/trend icons use `lucide-react-native` (locked); scope tabs reuse `FilterChip` (no dep). No new packages.

## Implementation notes
- **`FilterChip` disabled-state gap.** `FilterChip`'s current props are `{ label, selected, onPress, testID }` — there is **no `disabled` prop**. The "Bairro"/"Geral" tabs must read as disabled/"Em breve". Two acceptable paths, implementer's choice: (a) render them as plain non-interactive `View` pills (not `FilterChip`) with a muted style + an "Em breve" affordance; or (b) **add an optional `disabled?: boolean` to `FilterChip`** (no-op `onPress`, `accessibilityState={{ disabled: true }}`, muted styling) and update its COMPONENTS.md entry. Prefer (b) if S10's scope/position chips also need a disabled state — but keep it a **minimal additive prop**, not a redesign. Do not fake "disabled" by leaving `onPress` live.
- **`isMe` highlight**: derive from `useAuthStore().userId === row.playerId`; fall back to the mock `isMe` flag only when `userId` is null (test convenience) — same rule S8 documents.
- **Podium ordering**: the visual order is 2-1-3 (center tallest), but the data order is 1-2-3. Map `top[0]→center`, `top[1]→left`, `top[2]→right`. Guard for fewer than 3 rows (partial podium).
- **Trend rendering**: arrows via lucide (`ArrowUp`/`ArrowDown`/`Minus`) colored from `src/theme/colors.ts` (`success`/`danger`/`textMuted` — add `success` to `colors.ts` if absent, mirroring the danger token already there); the delta number is `font-num`. Absent `trend` → render "—" (flat).
- **Display type**: "RANKING" uses `font-display` + `uppercase` (Climate Crisis is display-only/uppercase). Positions/scores/level numbers/trend deltas use `font-num` (Russo One). Pedestal "Nº" labels use `font-num`. The "quadra" wordmark / Baloo 2 is **not** used here.
- **No API from the screen** — the single read goes through the existing `src/features/ranking/api/` hook (CLAUDE.md rule 6). `RankingRow` and `Avatar` receive plain data via props and never fetch.
- **Accessibility**: bell/theme/back expose `accessibilityRole="button"` + labels even while no-op; the highlighted row announces "você"; rows are labeled with position/name/score/trend; empty/error blocks use `accessibilityLiveRegion="polite"`; disabled scope tabs expose `accessibilityState={{ disabled: true }}`.
- **Performance**: small mocked list (≤ ~10) → `ScrollView` + `map` is fine (ARCHITECTURE threshold). Convert the position-4+ list to a `FlatList` when real F2.3 returns many rows. Avatars via `expo-image` for caching.

## Testability notes (for the test-writer)
- Mock `useGroupRanking` at the hook boundary (as S8's `ProfileScreen.test.tsx` does) to drive the four states (pending / error / empty / populated) deterministically — no MSW, no network. Use the hook's `latencyMs: 0` override (or mock the module) to remove the fake delay.
- Set `useAuthStore` `userId` via `setState` to exercise the `isMe` highlight (the real store is used; only `userId` is seeded), matching the S8 test approach.
- Stub native modules inline (`expo-linear-gradient` → forwarding `View`, `expo-image`, `lucide-react-native`, `react-native-safe-area-context`) — the repo's `tests/__mocks__` are **not** auto-applied (per the S8 test header).
- **Press one css-interop node per assertion.** Discovered on S8: `Button` is a NativeWind/css-interop `Pressable`; pressing multiple css-interop pressables in a tight loop inside a single test overlaps `act()` and corrupts subsequent renders. On S9 this applies to the **scope-tab `FilterChip`s** and any retry `Button` — assert one press per test (or stub `Button`/`FilterChip` as plain `Pressable`s) rather than pressing several in one synchronous loop.
- The bottom tab bar's absence is a routing fact (stack screen), not a screen-body concern — don't assert tab chrome in the S9 screen-body test (consistent with S5/S7/S8 screen-body tests).

---

**Next step: hand this spec to `scope-guardian` for evaluation against the 11 frontend rules.**
