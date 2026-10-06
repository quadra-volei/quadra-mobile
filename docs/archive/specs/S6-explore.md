# Screen Spec: S6 — Explore

## Origin
- Screen from SCOPE: S6 — Explore
- Layer: 1 (Match Core) — F1.7 matches nearby; second data-display tab
- Requested by: human (renanortega.dev@gmail.com)

## Reference assets read
- [x] `docs/references/screens/S6-explore/explorar.png` (single state — header "EXPLORAR" + bell + sun toggle; search bar "Buscar quadra, bairro ou horário..."; filter chips "Todos / Perto / Hoje / Iniciante / 6x6" with "Todos" active in blue; integrated map preview with a lime "2 jogos ao vivo" badge, blue match pins, and a floating selected-venue card ("Beach Vôlei SP", ★ 4.9 (341) · 3,4 km · R$ 40) with a navy "Ver" CTA; a "8 partidas encontradas" count row with a "Grade" grid/list toggle; a 2-col grid of dark image-forward match cards (format + level pills, distance, players, price))
- The PNG exists on disk and was read. No prototype source code exists; the PNG is the only layout reference.

## Mock-first data note (read this first)
S6 reuses the **same mocked nearby read** S5 already shipped (`useNearbyMatches` in `src/features/matches/api/getNearby.ts`). Per the owner-approved scope override recorded in the S5 spec, the F1.7 nearby endpoint is **not yet aligned in quadra-api** and the hook resolves a deterministic stub list (~400ms fake latency, no network, no `EXPO_PUBLIC_API_URL`, latency zeroable under test). S6 introduces **no new backend dependency** — it consumes the existing mocked hook. Search and filter behavior this iteration operate **client-side over the mocked list** (see "State"). Every mock keeps its `// MOCK:` / `// TODO(real-api):` markers so the real F1.7 (with server-side search/filter/bbox params) slots in behind the unchanged hook signature.

## Notable divergences from the prototype
- **"Quadras próximas" / "Jogadores" sections — NOT included.** SCOPE S6 OUT ("omit for MVP; player search is Layer 3"). No below-fold venues carousel or player results render. The "Jogadores" social results in the broader prototype are Layer 3.
- **Actual player search — NOT included.** The search bar filters **matches only** (court/venue/neighborhood/time text against the match list); it does not query players (Layer 3, SCOPE S6 OUT). Placeholder copy stays match-oriented ("Buscar quadra, bairro ou horário...").
- **Arena/venue detail screen — NOT included.** The map preview's selected-venue card "Ver" CTA opens **S17 (full-screen map)**, not a venue detail screen (venue detail is Layer 3, SCOPE S6 OUT). See "Navigation triggers".
- **Map is an inline PREVIEW only.** Per SCOPE S6 ("inline preview; the full-screen map is S17"), the embedded map is a non-interactive/low-interaction preview; tapping it (or its "Ver"/badge) routes to S17 which owns the real `react-native-maps` instance, pin interaction, and the location-permission flow. This screen does **not** request location.
- **"N jogos ao vivo" badge** ("2 jogos ao vivo" in the mockup) reflects live (in-progress) matches. While mocked, live status is derived from the stub list (count of matches flagged live in the mock); it is **display-only** — no SignalR on this screen (live score is S14). Documented, not invented.
- **Theme toggle (sol/lua)** present in the header but **NON-FUNCTIONAL** this iteration (dark tokens are unspecified in DESIGN_SYSTEM "What is NOT yet specified"; the theme selector's real home is S10 "Aparência"). Renders for visual parity; a no-op (or routes to S10) until dark tokens exist — consistent with S5.
- **Notification bell** renders (per the mockup) but is a **no-op** — there is no notifications screen in SCOPE and push preview is in the global NOT-in-MVP list. Consistent with S5.
- **Grade/Lista toggle** ("Grade" in the mockup) — the grid (Grade) view is the default and is the only fully-specified layout in the mockup. The list (Lista) view is a simple single-column re-flow of the same `MatchCard` data. It is in scope (SCOPE S6: "grade/list toggle") and held in local UI state.

## Goal
Let an onboarded user discover matches near them: search and filter the nearby-match list, glance at a live map preview, and open any match — all from a single browsing tab.

## Route
`app/(tabs)/explore.tsx` — replaces the current placeholder (`<Text>Explorar</Text>`). Second tab in the `(tabs)` group (custom tab bar + central FAB owned by `app/(tabs)/_layout.tsx`, established by S5). Reached via the tab bar, and via S5's "Procurar partidas" / "Ver todas" (`router.push('/explore')`).

## Backend dependencies

> **NONE new this iteration — the nearby read is the same mock S5 ships.** No real endpoint path is asserted and no backend behavior is claimed to exist. The screen consumes the existing `useNearbyMatches({ lat, lon, radiusKm })` hook (`src/features/matches/api/getNearby.ts`), whose `queryFn` is a fixed-latency mock marked `// MOCK:` / `// TODO(real-api):` → backend **F1.7** (geo nearby).
>
> ### ⚠️ Scope override (inherited, owner-approved)
> The backend gate (agent rule #10 — "if a required backend endpoint doesn't exist yet, list it and STOP") was **consciously overridden by the project owner** for the match-read iteration (documented in the S5 spec). **F1.7** is **NOT yet aligned in the quadra-api backend SCOPE**; the owner approved shipping the nearby read fully mocked. **Recording F1.7 alignment in quadra-api — now including server-side search text + filter chips + map bounding-box params — is a required follow-up that must happen before the mock is replaced with real network calls.** The hook signature is designed so the swap is path-only behind the unchanged interface.

Query key (ARCHITECTURE convention): `['matches', 'nearby', params]`, `staleTime: 60_000` (already set in the hook).

## Existing components reused
- `MatchCard` (`src/components/domain/MatchCard.tsx`) — the dark, image-forward card the SCOPE describes for the Explore grid (format/level pills, distance, players, price). COMPONENTS.md already lists it as "Reused by S6 Explore grid". Consumes `NearbyMatch`; used for **both** Grade (2-col) and Lista (1-col) views.
- `Button` (`src/components/ui/Button.tsx`) — `variant="primary"` (navy→blue) for the map preview's "Ver" CTA (affirmative action on light bg, matches the navy pill in the mockup); `variant="ghost"` for the "Grade/Lista" toggle link.
- `useNearbyMatches` (`src/features/matches/api/getNearby.ts`) — existing mocked read hook; reused as-is.
- `NearbyMatch` / `MatchFormat` / `MatchLevel` (`src/features/matches/types/match.ts`) — existing shared types; reused as-is.
- `colors` / `HERO_GRADIENT` (`src/theme/colors.ts`) — runtime color values for lucide icon `color` props (bell, sun, search, map-pin, grid/list) and any gradient. No inline hex. `src/theme/colors.ts` exports exactly `surfaceDark`, `primary`, `accent`, `textOnDark`, `textMuted`, `danger` — reference only these keys. There is **no star/rating color token**: the `★` rating in the venue card stays a plain text glyph styled with `text-text-muted` (do **not** use a lucide `Star` with a `color` prop).

## New components proposed
The header, search field, filter chips, and map preview are addressed below.

- `FilterChip` — *why nothing fits*: COMPONENTS.md has no chip/pill primitive. The filter row ("Todos / Perto / Hoje / Iniciante / 6x6") is a horizontally scrollable row of **selectable** pills with an active (blue `bg-primary` + white text) vs inactive (`bg-white`/`border-line` + `text-text-primary`) state — distinct from a static tag. It will be reused by S11 (date chips, format/level selectors) and S9/S10 (scope/position chips), so it earns a catalog entry per the "≥2 screens" rule.
  - Path: `src/components/ui/FilterChip.tsx`
  - Category: ui
  - Props:
    ```ts
    type FilterChipProps = {
      label: string;
      selected: boolean;
      onPress: () => void;
      testID?: string;
    };
    ```
  - Will be added to COMPONENTS.md by the implementer. Notes for implementer: `rounded-pill`, `text-mono`/`text-eyebrow` uppercase label, ~`h-9 px-4`; selected = `bg-primary text-text-on-dark`, unselected = `bg-white border border-line text-text-primary`; single `accessibilityRole="button"` exposing `accessibilityState={{ selected }}`.

- `SearchField` — *why nothing fits*: `TextField` (catalog) is an RHF-controlled **labeled** field with eyebrow label, error caption, and side adornments — wrong shape for a label-less search bar with a leading search icon and a pill (`rounded-pill`) container that filters as you type. S6 search is **not a form** (no RHF/Zod — it's an ephemeral filter, see "Forms"). Reused later by S11 ("Buscar quadra ou endereço") and S10.
  - Path: `src/components/ui/SearchField.tsx`
  - Category: ui
  - Props:
    ```ts
    type SearchFieldProps = {
      value: string;
      onChangeText: (v: string) => void;
      placeholder?: string;
      onClear?: () => void;
      testID?: string;
    };
    ```
  - Will be added to COMPONENTS.md by the implementer. Notes for implementer: leading lucide `Search` (`text-muted`), `rounded-pill bg-white shadow-card h-12 px-4`, optional trailing clear (`X`) when `value` non-empty; `accessibilityLabel` "Buscar partidas". Controlled — holds no state itself.

The **header** ("EXPLORAR" + bell + theme toggle) is the same one-off inline composition pattern used on S5 (different title/actions) — kept inline in `explore.tsx`; extract a shared `Header` only when the decision-log threshold is hit (S8/S9 will repeat it — flag for extraction then, not now). The **map preview** (embedded preview map + live badge + floating venue card) is a **one-off S6 composition** inline in `explore.tsx` (the real interactive map is S17, a different screen) — it does not earn a catalog entry. The **"N partidas encontradas" + toggle** row is a tiny inline `<View>`.

## Layout structure

Token references only; NativeWind classes; no hex; no `StyleSheet.create`.

```
<View className="flex-1 bg-bg-light">                              # default light screen bg
  <SafeAreaView edges={['top']} className="flex-1">

    # ── Header (inline) ──
    <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
      <Text className="font-display text-h1 text-text-primary uppercase">EXPLORAR</Text>
      <View className="flex-row items-center gap-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Notificações"> <Bell color={colors.surfaceDark} /> </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Alternar tema"> <Sun color={colors.surfaceDark} /> </Pressable>
      </View>
    </View>

    <ScrollView contentContainerClassName="pb-24">                  # pb leaves room for the tab bar/FAB

      # ── Search bar ──
      <View className="px-4">
        <SearchField value={query} onChangeText={setQuery} placeholder="Buscar quadra, bairro ou horário..." onClear={() => setQuery('')} />
      </View>

      # ── Filter chips (horizontal, selectable) ──
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 gap-2 mt-3"
        data={FILTERS}                                             # ['Todos','Perto','Hoje','Iniciante','6x6']
        keyExtractor={(f) => f.id}
        renderItem={({ item }) => (
          <FilterChip label={item.label} selected={activeFilter === item.id} onPress={() => setActiveFilter(item.id)} />
        )}
      />

      # ── Map preview (inline; full map is S17) ──
      <Pressable className="mx-4 mt-4 h-44 rounded-card overflow-hidden shadow-card" onPress={goMap} accessibilityRole="button" accessibilityLabel="Abrir mapa de partidas">
        <MapPreview ... />                                         # static/low-interaction preview surface
        # lime "N jogos ao vivo" badge (top-left)
        <View className="absolute top-3 left-3 bg-accent rounded-pill px-3 py-1">
          <Text className="font-mono text-mono text-text-primary uppercase">{liveCount} jogos ao vivo</Text>
        </View>
        # floating selected-venue card (bottom) — STATIC visual placeholder, NOT data-bound (see note below)
        <View className="absolute bottom-3 left-3 right-3 bg-white rounded-card shadow-card p-3 flex-row items-center gap-3">
          <View className="h-10 w-10 rounded-card bg-primary items-center justify-center"><MapPin color={colors.textOnDark} /></View>
          <View className="flex-1">
            # TODO(real-api): venue name/rating/reviews are Layer-3 venue data (not on NearbyMatch) — static sample copy until S17 owns real venue data
            <Text className="text-h3 text-text-primary" numberOfLines={1}>Beach Vôlei SP</Text>
            <Text className="text-caption text-text-muted">★ 4.9 (341) · 3,4 km · R$ 40</Text>
          </View>
          <Button variant="primary" onPress={goMap}>Ver</Button>
        </View>
      </Pressable>

      # ── Results count + Grade/Lista toggle ──
      <View className="flex-row items-center justify-between px-4 mt-6">
        <Text className="text-body-bold text-text-primary">{results.length} partidas encontradas</Text>
        <Button variant="ghost" onPress={() => setView(v => v === 'grid' ? 'list' : 'grid')} leftIcon={view === 'grid' ? <LayoutGrid .../> : <List .../>}>
          {view === 'grid' ? 'Grade' : 'Lista'}
        </Button>
      </View>

      # ── Results grid (Grade = 2-col) / list (Lista = 1-col) ──
      <View className={view === 'grid' ? 'flex-row flex-wrap px-4 gap-3 mt-2' : 'px-4 gap-3 mt-2'}>
        {results.map((m) => (
          <View className={view === 'grid' ? 'w-[48%]' : 'w-full'}>
            <MatchCard match={m} onPress={goMatch} />             # reused dark image-forward card
          </View>
        ))}
      </View>

    </ScrollView>
  </SafeAreaView>
</View>
```

> The dark `MatchCard` already renders per DESIGN_SYSTEM (navy `HERO_GRADIENT` cover, `text-on-dark`, format `text-mono` pill, lime `bg-accent` level pill, `font-num` price/distance). The map preview is a one-off light composition; its venue chip uses `text-h3`/`text-caption` and a `primary` icon tile. Filter row uses `FilterChip` (blue active / white inactive). No `StyleSheet.create`; no inline hex (icon/gradient colors via `src/theme/colors.ts`). For a real >10-result list, switch the grid to `FlatList numColumns={2}` per ARCHITECTURE performance defaults.

## State

### Server state (TanStack Query hooks)
- `useNearbyMatches({ lat, lon, radiusKm: 5 })` — `src/features/matches/api/getNearby.ts` (existing MOCK; F1.7 later). `useQuery`, key `['matches', 'nearby', params]`, `staleTime: 60_000`. While mocked, fixed placeholder `lat/lon` are passed (no device geo read — see Permissions). This is the **only** server read on the screen.

### Client state (Zustand)
- None new. No theme store this iteration (toggle no-op pending dark tokens). Search/filter/view state is ephemeral to this screen → local, not Zustand (ARCHITECTURE: Zustand only for cross-screen/shared state).

### Local state
- `query: string` — search text (`useState`); drives client-side filtering of the mocked list.
- `activeFilter: FilterId` — currently selected chip (`useState`, default `'todos'`); single-select per the mockup.
- `view: 'grid' | 'list'` — Grade/Lista toggle (`useState`, default `'grid'`).
- A pure `useMemo` derives `results` from `nearby.data` + `query` + `activeFilter` (client-side filter while mocked). The live count is derived from `nearby.data`. The selected-venue preview card is **NOT** derived from `nearby.data` — venue name/rating/reviews are Layer-3 venue data absent from `NearbyMatch`; it renders **static sample copy** as a visual placeholder until S17 owns real venue data (do not invent `rating`/`reviews`/`distanceLabel` on `NearbyMatch` or the S5 mock). No raw `useState` for server data (CLAUDE.md rule 4) — only for ephemeral UI controls.

### Forms (if any)
- **None.** The search bar is an **ephemeral filter control**, not a submitted form — RHF/Zod do not apply (CLAUDE.md rule 5 governs forms; this is filter UI). No validation, no submission.

## Navigation triggers
- Any match card tap (Grade or Lista) → `router.push({ pathname: '/matches/[id]', params: { id } })` (S12).
- Map preview tap / live badge / "Ver" on the venue card → `router.push('/explore/map')` (S17). There is no venue-detail route in MVP; "Ver" opens the full map (documented divergence).
- Bell / theme toggle → no-op this iteration (or theme toggle may `router.push('/profile/settings')` as a shortcut). Documented divergence.

> **Typed-routes note:** `typedRoutes: true` is enabled (`(tabs)` group transparent in the href → `/matches/[id]`, `/explore/map`). All hrefs must pass `npm run typecheck` (PR gate); follow `.expo/types` unions; do not use legacy `navigation.navigate`.

## Permissions / external integrations
- **Location — NOT requested this iteration.** Nearby is mocked; the inline map is a preview only. Per ARCHITECTURE lazy-permission guidance and SCOPE, the real `expo-location` prompt + `react-native-maps` interaction belong to **S17** (opened from the preview), not to S6 tab focus. When F1.7 is wired, the real `lat/lon` come from S17's permission flow or a cached last-known position; S6 must not block render on a permission prompt.
- No camera/contacts/Google on this screen.

## Real-time subscriptions (if any)
- **None.** The "N jogos ao vivo" badge is display-only (derived from the mocked list). Live score subscriptions (SignalR) belong to S14.

## Loading / error / empty states
- **Loading**: while `useNearbyMatches` is `isPending`, render shimmering placeholder cards in the results area (neutral `bg-bg-light-alt` rounded blocks matching the `MatchCard` footprint — DESIGN_SYSTEM "Skeleton/loading shapes" is not-yet-specified, so use neutral placeholders; flag for design). The header/search/chips/map-preview chrome render immediately (they don't depend on the query).
- **Error**: if the query rejects (mock won't; real F1.7 can), render an inline error row in the results area — `text-body text-text-muted` "Não foi possível carregar" + `Button variant="ghost"` "Tentar novamente" calling `refetch()`. No toast primitive introduced (consistent with S2–S5). `accessibilityLiveRegion="polite"`.
- **Empty (no nearby data)**: "Nenhuma partida perto de você ainda" (inline, `text-caption text-text-muted`, centered).
- **Empty (filtered to zero by search/chip)**: distinct copy "Nenhuma partida encontrada para esta busca" + a `Button variant="ghost"` "Limpar filtros" that resets `query`/`activeFilter`. This distinguishes "no data" from "filtered out". Empty-state illustrations not yet specified — text-only, flag for design.

## Acceptance criteria
- [ ] Header shows the "EXPLORAR" display title, a notification bell, and a theme toggle — **no avatar/greeting**.
- [ ] A search bar renders with the placeholder "Buscar quadra, bairro ou horário..."; typing filters the results list client-side; a clear (X) resets it.
- [ ] A horizontal selectable filter-chip row renders exactly "Todos / Perto / Hoje / Iniciante / 6x6"; "Todos" is selected by default; selecting a chip always updates the highlighted chip. Selecting a **functional** chip (Perto / Iniciante / 6x6) updates the filtered results; "Hoje" is a documented no-op this iteration (no date field exists — see Implementation notes) and does not change the result set.
- [ ] An inline map preview renders with a "N jogos ao vivo" badge and a floating selected-venue card with a "Ver" CTA; tapping the preview, the badge, or "Ver" navigates to S17 (`/explore/map`).
- [ ] A "N partidas encontradas" count reflects the current (filtered) result length and updates as filters change.
- [ ] A Grade/Lista toggle switches the results between a 2-col grid and a 1-col list of `MatchCard`s using the same data.
- [ ] The results render dark `MatchCard`s from `useNearbyMatches`; tapping a card navigates to S12 with its id.
- [ ] Results show a loading placeholder while pending, a "no nearby" empty state when the source list is empty, and a distinct "no match for this search" empty state (with "Limpar filtros") when filters exclude everything; an error shows a retry row.
- [ ] No location permission prompt fires on S6; no "Quadras próximas" / "Jogadores" sections and no player-search results render.
- [ ] The bottom tab bar persists and "Explorar" is the active tab.
- [ ] All criteria are verifiable via RNTL against the mocked query (no MSW / no network) and mocked navigation.

## Out of scope (be explicit)
- "Quadras próximas" / "Jogadores" sections and any below-fold venues carousel — SCOPE S6 OUT (player search is Layer 3).
- Actual player search — search filters matches only; no player querying (Layer 3, SCOPE S6 OUT).
- Arena/venue detail screen — "Ver" opens S17, not a venue detail (Layer 3, SCOPE S6 OUT).
- Full-screen interactive map, real `react-native-maps` pin interaction, and the location-permission flow — those belong to S17; S6 only previews.
- Functional dark-mode theme toggle — dark tokens unspecified (DESIGN_SYSTEM); no-op until S10 + dark tokens.
- Notifications screen / bell badge / push preview — no notifications screen in SCOPE; bell is a no-op.
- Real match data wiring — the nearby read is the existing S5 mock; F1.7 (now incl. server-side search/filter/bbox params) is wired later behind the unchanged hook signature.
- Live device location read — deferred to S17.
- Server-side search/filtering — filtering is client-side over the mocked list this iteration; moves to F1.7 query params when the backend lands.

## Files to create
- `src/components/ui/FilterChip.tsx` — selectable filter pill (new ui primitive).
- `src/components/ui/SearchField.tsx` — label-less search input (new ui primitive).

## Files to modify
- `app/(tabs)/explore.tsx` — replace the `<Text>Explorar</Text>` placeholder with the full Explore screen (header, search, chips, map preview, count + toggle, results grid/list).
- `docs/COMPONENTS.md` — add entries for `FilterChip` and `SearchField` (new ui primitives).

## New npm dependencies
- **NONE — no stack change.** Reuses `@tanstack/react-query`, `lucide-react-native` (search, bell, sun, map-pin, grid/list, X icons; the `★` rating is a text glyph, not a `Star` icon), `react-native-svg` (brand tab icons, already wired by S5), `expo-image` / `expo-linear-gradient` (inside the reused `MatchCard`). No `react-native-maps` and no `expo-location` are pulled in on S6 — the interactive map and location live on S17. The inline map preview is a static surface (e.g. a styled placeholder/preview tile) requiring no new package; if a static preview image is later desired it ships as a bundled asset, not a new dependency — confirm with design.

## Implementation notes
- **Display type**: "EXPLORAR" uses `font-display` + `uppercase` (Climate Crisis is display-only/uppercase per CLAUDE.md). Chip/badge labels use `font-mono`/`text-mono` uppercase; the "N partidas encontradas" count uses `text-body-bold`; price/distance inside `MatchCard` already use `font-num`.
- **Reuse over create**: do NOT re-implement the dark card — import the existing `MatchCard`. Both Grade and Lista views feed it the same `NearbyMatch[]`; only the wrapper width changes (`w-[48%]` vs `w-full`).
- **Client-side filter**: keep the `useMemo` derivation pure and deterministic so RNTL can assert filtered counts/empty states without flakiness. Map the **functional** filter chips to predicates: "Perto" → sort/limit by `distanceKm`; "Iniciante" → `level === 'INICIANTE'`; "6x6" → `format === '6X6'`. **"Hoje" is a documented no-op this iteration**: the current `NearbyMatch` type has no date/time field, and this iteration must **NOT** extend `NearbyMatch` or the shipped S5 mock (that is S5's contract — scope creep). The chip still renders (SCOPE requires it) and toggles its selected state, but its predicate is the identity (returns the full set) — leave a `// TODO(real-api):` marker. Adding the date field is a required part of **F1.7 alignment** in quadra-api; only then does "Hoje" become a real filter. Do not invent a date field on the rendered card or the mock.
- **Map preview**: it is an inline, low/no-interaction surface — its only job is to route to S17. Do not import `react-native-maps` here; that dependency belongs to S17 to keep S6 light and avoid a native map mounting on every Explore tab focus.
- **Accessibility**: bell and theme toggle expose `accessibilityRole="button"` + labels even while no-op; each `MatchCard` is a single button target (announces name + distance); filter chips expose `accessibilityState={{ selected }}`; the Grade/Lista toggle announces the current mode; empty/error rows use `accessibilityLiveRegion="polite"`.
- **No API from the screen**: the read goes through `useNearbyMatches` (CLAUDE.md rule 6), even while mocked; the new `FilterChip`/`SearchField` are presentational and controlled (hold no state, never fetch).
- **Performance**: mock list is small (≤10) so a `flex-wrap` map is fine; switch the results to a 2-column `FlatList` (`numColumns={2}`) when real F1.7 returns >10 (ARCHITECTURE default). Cover images via `expo-image` (handled inside `MatchCard`).
- Keep the theme toggle a pure no-op (or a `/profile/settings` shortcut) — do NOT introduce dark-mode tokens or a theme store here (gated on DESIGN_SYSTEM dark tokens, S10's responsibility).
