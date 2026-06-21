# Screen Spec: S5 — Home

✅ **scope-guardian: APPROVED** (round 2) — all 11 checklist items pass. Item 3 (backend gate, rule #10) cleared via the owner-approved scope override documented under "Backend dependencies"; item 4 (`EmptyState`) resolved to an inline `<View>`/`<Text>` empty state.

## Origin
- Screen from SCOPE: S5 — Home
- Layer: 1 (Match Core) + 2 (Retention) — F1.7 nearby + F1.1/F1.6 next matches; first data-display tab
- Requested by: human (renanortega.dev@gmail.com)

## Reference assets read
- [x] `docs/references/screens/S5-home/inicio.png` (single state — header "INÍCIO" + bell + sun/moon toggle; "Bora pra quadra?" card with "Criar partida" gradient CTA + "Procurar partidas" outline; "PRÓXIMAS PARTIDAS" horizontal scroll of compact cards with "Ver todas"; "JOGOS PERTO DE VOCÊ" 2-col grid of dark image cards with "Mapa"; bottom tab bar with central lime FAB "Jogar")
- The PNG exists on disk and was read. No prototype source exists; the PNG is the only layout reference.

## Mock-first data note (read this first)
S5 is the first **data-display** screen. The backend match endpoints (F1.7 nearby, F1.1/F1.6 lists) are **not built yet** and PRODUCT.md/SCOPE define no concrete endpoint paths. Following the convention already locked in S2–S4 (`requestOtp.ts`, `verifyOtp.ts`, `createProfile.ts`), this iteration ships the two read hooks as **deterministic, test-friendly mocks** via TanStack Query `useQuery` — **no network, no `EXPO_PUBLIC_API_URL` fetch, no asserted backend path**. Each hook's `queryFn` resolves a fixed stub list after a short fake latency. Every mock is marked `// MOCK:` with `// TODO(real-api):` pointing at F1.7 / F1.1 / F1.6, replaceable behind the unchanged hook signature once the backend match module lands. This keeps the screen, its loading/empty/error states, and navigation fully exercisable under RNTL without MSW.

## Notable divergences from the prototype
- **No avatar / greeting in the header** — SCOPE S5 is explicit: *"header with 'INÍCIO' title + notification bell + theme toggle (sol/lua) — no avatar/greeting on this screen."* The avatar+"Olá, NOME" header belongs to S8 Profile, not Home. Matches the PNG (the Home header shows only the "INÍCIO" wordmark, a bell, and a sun icon).
- **Theme toggle (sol/lua) is present in the header but NON-FUNCTIONAL this iteration** — dark-mode tokens are listed under DESIGN_SYSTEM "What is NOT yet specified", and the theme selector's real home is S10 Settings ("Aparência"). The icon renders for visual parity with the mockup but is a no-op (or routes to S10) until dark tokens exist. Documented, not invented.
- **Notification bell has no destination screen** — there is no notifications screen in SCOPE. The bell renders (per the mockup) but is a no-op this iteration (no count badge, no route). Push/notification preview is in the global NOT-in-MVP list.
- **Match card metadata shown in the mockup (price "R$ 25"/"Grátis", "N vagas", distance "1,2 km", level/format tags, avatar stack)** is rendered from the **mocked** match objects; the field shapes below mirror the mockup so the real F1.7/F1.6 payloads can slot in unchanged.
- **No stories/feed, no weather widget, no ads** — SCOPE S5 OUT; none appear in the mockup.
- The central **"Jogar" FAB** in the bottom tab bar is a brand element from the mockup. Its destination is **"Criar partida" (S11)** — the same action as the card CTA — since SCOPE lists no separate "quick-play" flow (quick-match is not an MVP screen). Documented as a divergence: the FAB is wired to S11, not to a new screen.

## Goal
Give an onboarded user their home base: launch match creation, jump to search, see their own upcoming matches at a glance, and discover matches happening near them.

## Route
`app/(tabs)/index.tsx` — replaces the current placeholder (`<Text>Home</Text>`). The first tab in the `(tabs)` group (`headerShown: false` is already set in `app/(tabs)/_layout.tsx`). Reached via `router.replace('/(tabs)')` from S1 (auth ok + hasProfile) and S4 completion. The custom bottom tab bar + central FAB are owned by `app/(tabs)/_layout.tsx` (see Files to modify), not by this screen.

## Backend dependencies

> ### ⚠️ Scope override (owner-approved)
> The backend gate (CLAUDE/agent rule #10 — "if a required backend endpoint doesn't exist yet, list it and STOP") is **consciously overridden for this iteration by the project owner** (renanortega.dev@gmail.com).
> - **(a) Not yet in backend SCOPE:** the **F1.7** nearby endpoint and the **F1.1/F1.6** next-matches list endpoints are **NOT yet aligned in the quadra-api backend SCOPE** — no concrete endpoint paths exist for them.
> - **(b) Conscious decision:** the owner has **explicitly approved shipping S5 fully mocked** for this iteration rather than blocking on backend alignment.
> - **(c) Explicit follow-up (gating real wiring):** recording backend alignment for **F1.7 / F1.1 / F1.6** in **quadra-api** is a required follow-up that **must happen before** the mocks here are replaced with real network calls. The mock hook signatures are designed so the swap is path-only behind the unchanged interface.

**NONE asserted this iteration — both reads are mocked.** No real endpoint path is referenced and no backend behavior is claimed to exist. Two `useQuery` hooks resolve locally:

- `src/features/matches/api/getUpcoming.ts` — `useUpcomingMatches()`. `queryFn` is a **FAKE async function** (~400ms fake latency, no network) resolving a fixed stub list of the current user's confirmed/upcoming matches. Marked `// MOCK:` / `// TODO(real-api):` → backend **F1.1/F1.6** (user's next matches). Feeds the "PRÓXIMAS PARTIDAS" horizontal scroll.
- `src/features/matches/api/getNearby.ts` — `useNearbyMatches(params)`. `queryFn` is a **FAKE async function** (~400ms fake latency, no network) resolving a fixed stub list of nearby matches. Marked `// MOCK:` / `// TODO(real-api):` → backend **F1.7** (geo nearby). Input shape `{ lat: number; lon: number; radiusKm: number }` so the real geo query slots in unchanged; while mocked, the params are accepted but ignored (no location read this iteration — see Permissions). Feeds the "JOGOS PERTO DE VOCÊ" grid.

> Query keys (ARCHITECTURE convention): `['matches', 'upcoming']` and `['matches', 'nearby', params]`. `staleTime` ~60s on nearby.

## Existing components reused
- `Button` (`src/components/ui/Button.tsx`) — `variant="grad"` for "Criar partida" (main CTA → blue→lime gradient, DESIGN_SYSTEM); `variant="outline"` for "Procurar partidas" (secondary on light bg). "Ver todas" / "Mapa" section links use `variant="ghost"`.
- `colors` / `CTA_GRADIENT` / `HERO_GRADIENT` (`src/theme/colors.ts`) — runtime color values for lucide icon `color` props (bell, sun, map, clock, users) and for the navy `LinearGradient` overlay on the dark match cards. No inline hex.
- `QuadraLogo` — NOT used here (the "INÍCIO" header is display type, not the brand mark).

## New components proposed
The two match cards are the core reusable domain pieces for the app (reused across S6 Explore, S8 Profile history, S12, S17). Per COMPONENTS.md's "≥2 screens" rule they are extracted to the catalog now. The header, the "Bora pra quadra?" card, the section headers, and the bottom tab bar are addressed below.

- `MatchCardCompact` — *why nothing fits*: catalog has no domain components yet; the "PRÓXIMAS PARTIDAS" horizontal items are a distinct compact card (cover strip + name + datetime + small avatar stack + "N vagas" + price pill). Reused by S8 (recent matches strip) and potentially S12 related lists.
  - Path: `src/components/domain/MatchCardCompact.tsx`
  - Props:
    ```ts
    type MatchCardCompactProps = {
      match: {
        id: string;
        name: string;
        startsAt: string;        // ISO; rendered as "Hoje 19h30" / "Amanhã ..."
        category?: string;       // e.g. "CASUAL" / "COMPETITIVO" (mono pill)
        openSlots: number;       // "N vagas"
        priceLabel: string;      // "R$ 15" | "Grátis"
        avatarUrls: string[];    // confirmed players (stacked, +N overflow)
      };
      onPress: (id: string) => void;
      testID?: string;
    };
    ```
  - Will be added to COMPONENTS.md by the implementer.
- `MatchCard` — *why nothing fits*: the "JOGOS PERTO DE VOCÊ" grid uses a larger **dark, image-forward** card (DESIGN_SYSTEM "image-forward match cards" / "dark hero"): format tag (4X4/6X6), level pill, venue name, distance, "players N/M", price. Reused by S6 Explore grid and S17 map bottom sheet.
  - Path: `src/components/domain/MatchCard.tsx`
  - Props:
    ```ts
    type MatchCardProps = {
      match: {
        id: string;
        name: string;
        format: '2X2' | '4X4' | '6X6';
        level: 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO';
        distanceKm: number;          // "1,2 km"
        confirmed: number;           // "2/8"
        capacity: number;
        priceLabel: string;          // "R$ 25" | "Grátis"
      };
      onPress: (id: string) => void;
      testID?: string;
    };
    ```
  - Will be added to COMPONENTS.md by the implementer.

The **header** ("INÍCIO" + bell + theme toggle) and the **"Bora pra quadra?" card** are one-off compositions inline in `index.tsx` (the header reappears on S6/S8/S9 but with different titles/actions — extract a shared `Header` only when its 2nd consumer lands per the decision log; for now inline). The **section header row** ("PRÓXIMAS PARTIDAS" + "Ver todas") is a tiny inline `<View>`. The **bottom tab bar with central FAB** is built once in `app/(tabs)/_layout.tsx` via the `tabBar` prop (see Files to modify) — not a per-screen component.

## Layout structure

Token references only; NativeWind classes; no hex; no `StyleSheet.create`.

```
<View className="flex-1 bg-bg-light">                              # default light screen bg
  <SafeAreaView edges={['top']} className="flex-1">

    # ── Header (inline) ──
    <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
      <Text className="font-display text-h1 text-text-primary uppercase">INÍCIO</Text>
      <View className="flex-row items-center gap-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Notificações"> <Bell color={colors.surfaceDark} /> </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Alternar tema"> <Sun color={colors.surfaceDark} /> </Pressable>
      </View>
    </View>

    <ScrollView contentContainerClassName="pb-24">                  # pb leaves room for the tab bar/FAB

      # ── "Bora pra quadra?" card ──
      <View className="mx-4 bg-white rounded-card shadow-card p-4">
        <Text className="text-h3 text-text-primary text-center">Bora pra quadra?</Text>
        <Text className="text-caption text-text-muted text-center mt-1">Crie ou encontre um jogo agora</Text>
        <Button variant="grad" className="mt-4" onPress={goCreate}>Criar partida</Button>
        <Button variant="outline" className="mt-3" onPress={goExplore}>Procurar partidas</Button>
      </View>

      # ── Section: PRÓXIMAS PARTIDAS (horizontal) ──
      <View className="flex-row items-center justify-between px-4 mt-6">
        <Text className="font-display text-h1 text-text-primary uppercase">PRÓXIMAS PARTIDAS</Text>
        <Button variant="ghost" onPress={goExplore}>Ver todas</Button>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 gap-3"
        data={upcoming.data}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MatchCardCompact match={item} onPress={goMatch} />}
        ListEmptyComponent={                                                          # inline text-only empty state (no EmptyState component)
          <View className="px-4 py-6 items-center">
            <Text className="text-caption text-text-muted text-center">Você ainda não tem partidas marcadas</Text>
          </View>
        }
      />

      # ── Section: JOGOS PERTO DE VOCÊ (2-col grid) ──
      <View className="flex-row items-center justify-between px-4 mt-6">
        <Text className="font-display text-h1 text-text-primary uppercase">JOGOS PERTO DE VOCÊ</Text>
        <Button variant="ghost" onPress={goMap}>Mapa</Button>
      </View>
      <View className="flex-row flex-wrap px-4 gap-3 mt-2">
        {nearby.data.map((m) => (
          <View className="w-[48%]">                               # 2-col grid via flex-wrap
            <MatchCard match={m} onPress={goMatch} />              # dark image-forward card
          </View>
        ))}
      </View>

    </ScrollView>
  </SafeAreaView>
</View>
```

> The dark `MatchCard` uses a navy `LinearGradient` (`HERO_GRADIENT`) cover with `text-on-dark` copy, format tag as `text-mono` pill, level as a lime `bg-accent` pill, price as a lime/`text-num` label — all per DESIGN_SYSTEM. The compact card is a light `bg-white rounded-card shadow-card` with a small cover strip. No `StyleSheet.create`; no inline hex (gradient/icon colors come from `src/theme/colors.ts`).

## State

### Server state (TanStack Query hooks)
- `useUpcomingMatches()` — `src/features/matches/api/getUpcoming.ts` (MOCK this iteration; F1.1/F1.6 later). `useQuery`, key `['matches', 'upcoming']`.
- `useNearbyMatches({ lat, lon, radiusKm: 5 })` — `src/features/matches/api/getNearby.ts` (MOCK; F1.7 later). `useQuery`, key `['matches', 'nearby', params]`, `staleTime: 60_000`. While mocked, fixed placeholder `lat/lon` are passed (no device geo read — see Permissions).

### Client state (Zustand)
- None new. `useAuthStore` already holds `isAuthenticated`/`hasProfile` (used by the route guard, not by this screen's render). No theme store this iteration (the toggle is a no-op pending dark tokens).

### Local state
- None required. The screen is read-only data display; no form, no toggles with persisted effect. (If the theme toggle is later made functional, that state belongs in a `useThemeStore` introduced with S10 + dark tokens — not here.)

### Forms (if any)
- None. S5 has no form.

## Navigation triggers
- "Criar partida" (card CTA) → `router.push('/matches/create')` (S11).
- Central "Jogar" FAB (tab bar) → `router.push('/matches/create')` (S11) — same action; see divergence note.
- "Procurar partidas" → `router.push('/explore')` (S6, the Explore tab).
- "Ver todas" (Próximas partidas) → `router.push('/explore')` (S6) — there is no dedicated "all my matches" screen in MVP; full history lives in S8/S9. Route to Explore.
- "Mapa" (Jogos perto) → `router.push('/explore/map')` (S17).
- Any match card tap (compact or grid) → `router.push({ pathname: '/matches/[id]', params: { id } })` (S12).
- Bell / theme toggle → no-op this iteration (documented divergence).

> **Typed-routes note:** `typedRoutes: true` is enabled. Use the typed href forms; `(tabs)`/`(auth)` groups are transparent in the href (so `/explore`, `/matches/create`, `/explore/map`, `/matches/[id]`). All hrefs must pass `npm run typecheck` (PR gate) — follow the generated `.expo/types` union if a slightly different form is required; do not use legacy `navigation.navigate`.

## Permissions / external integrations
- **Location** — **NOT requested this iteration.** Nearby is mocked, so no `expo-location` read happens on Home. Per ARCHITECTURE's lazy-permission guidance, the real location prompt belongs to the **S17 map** flow ("location permission request flow" is an S17 IN item), requested when the user opens the map — not on tab focus. When F1.7 is wired, the real `lat/lon` come from S17's permission flow or a cached last-known position; Home must not block render on a permission prompt.
- No camera/contacts/Google on this screen.

## Real-time subscriptions (if any)
- None. Home shows static lists; live score subscriptions belong to S14.

## Loading / error / empty states
- **Loading**: while `useUpcomingMatches`/`useNearbyMatches` are `isPending`, render shimmering placeholder cards per section (a small inline skeleton View matching each card's footprint — DESIGN_SYSTEM "Skeleton/loading shapes" is listed as not-yet-specified, so use a neutral `bg-bg-light-alt` rounded block as the placeholder; flag for design refinement). The two sections load independently (no full-screen blocker).
- **Error**: if a section query rejects (mock won't, but the real F1.7/F1.6 can), render a per-section inline error row — `text-body text-text-muted` "Não foi possível carregar" + a `Button variant="ghost"` "Tentar novamente" calling `refetch()`. No toast primitive is introduced (consistent with S2–S4). The other section still renders.
- **Empty**: per-section empty states — Próximas partidas: "Você ainda não tem partidas marcadas" (inline, `text-caption text-text-muted`, centered) with a subtle "Criar partida" ghost link; Jogos perto: "Nenhuma partida perto de você ainda". Empty-state illustrations are not yet specified in DESIGN_SYSTEM — text-only for now, flag for design.

## Acceptance criteria
- [ ] Header shows the "INÍCIO" display title, a notification bell, and a theme toggle — **no avatar and no greeting**.
- [ ] The "Bora pra quadra?" card renders "Criar partida" (gradient) above "Procurar partidas" (outline).
- [ ] Tapping "Criar partida" navigates to S11 (`/matches/create`); the central "Jogar" FAB does the same.
- [ ] Tapping "Procurar partidas" and "Ver todas" navigate to S6 (`/explore`).
- [ ] "PRÓXIMAS PARTIDAS" renders a horizontal scroll of `MatchCardCompact` from `useUpcomingMatches`; tapping a card navigates to S12 with its id.
- [ ] "JOGOS PERTO DE VOCÊ" renders a 2-col grid of dark `MatchCard` from `useNearbyMatches`; tapping a card navigates to S12 with its id.
- [ ] "Mapa" navigates to S17 (`/explore/map`).
- [ ] Each section shows its own loading placeholder while pending, its own empty state when its list is empty, and its own retry row on error — independently.
- [ ] The bottom tab bar (4 tabs + central FAB) persists across navigation and Home is the active tab.
- [ ] No location permission prompt fires on Home; no stories/feed/weather/ads render.
- [ ] All criteria are verifiable via RNTL against the mocked queries (no MSW / no network) and mocked navigation.

## Out of scope (be explicit)
- Avatar / "Olá, NOME" greeting — that header is S8 Profile, not Home (SCOPE S5).
- Functional dark-mode theme toggle — dark tokens are unspecified (DESIGN_SYSTEM); the toggle is a no-op until S10 + dark tokens land.
- Notifications screen / bell badge / push preview — no notifications screen in SCOPE; bell is a no-op (push prefs are NOT-in-MVP).
- Stories / social feed (Layer 3), weather widget, ads — SCOPE S5 OUT.
- Real match data wiring — both reads are mocked; the human wires real F1.7 nearby and F1.1/F1.6 lists later behind the unchanged hook signatures.
- Live device location read — deferred to S17's permission flow; Home uses placeholder params while mocked.
- A dedicated "all my matches" screen — none in MVP; "Ver todas" routes to Explore.

## Files to create
- `app/(tabs)/index.tsx` — the Home screen (replaces the `<Text>Home</Text>` placeholder).
- `src/components/domain/MatchCard.tsx` — dark image-forward match card.
- `src/components/domain/MatchCardCompact.tsx` — compact horizontal match card.
- `src/features/matches/api/getUpcoming.ts` — `useUpcomingMatches` (**MOCK** `queryFn`, `// TODO(real-api):` F1.1/F1.6).
- `src/features/matches/api/getNearby.ts` — `useNearbyMatches` (**MOCK** `queryFn`, `// TODO(real-api):` F1.7).
- `src/features/matches/types/match.ts` — shared `Match`/`MatchSummary` types consumed by the cards and hooks (TypeScript only — no `any`).

## Files to modify
- `docs/COMPONENTS.md` — add entries for `MatchCard` and `MatchCardCompact` (first `domain/` components).
- `app/(tabs)/_layout.tsx` — replace the default tab bar with the custom bottom bar from the mockup: 4 labeled tabs (Início / Explorar / Rede / Perfil, using the brand SVG icons from DESIGN_SYSTEM iconography + their `-selecionado` states) and the central lime "Jogar" FAB (`shadow-fab`) wired to `/matches/create`. This is the first tab spec, so it establishes the bar for all four tabs.

## New npm dependencies
- **NONE — no stack change.** Mocked reads use `@tanstack/react-query` (locked). Cards use `expo-image` (locked) for cover photos, `expo-linear-gradient` (locked) for the dark card overlay, `lucide-react-native` (locked) for header/meta icons, and `react-native-svg` (locked) for the brand tab icons. No `expo-location` is pulled in this iteration (nearby is mocked; location lands with S17).

## Implementation notes
- **Brand tab icons + FAB**: port the prototype's `Home.svg`/`Explorar.svg`/`Rede.svg`/`Perfil.svg` (+ `-selecionado`/`-active`) and `jogar.svg` into `src/components/icons/` per DESIGN_SYSTEM iconography (no inline PNG). The central FAB uses `rounded-full` + `bg-gradient-cta` (or lime per the mockup) with `shadow-fab`. Build the custom bar via the `Tabs` `tabBar` render prop so the FAB can overlap the bar.
- **Display type**: "INÍCIO", "PRÓXIMAS PARTIDAS", "JOGOS PERTO DE VOCÊ" use `font-display` + `uppercase` (Climate Crisis is display-only/uppercase per CLAUDE.md). Prices/distances/scores use `font-num` (Russo One); format/level pills use `font-mono`/`text-mono`.
- **Mocks**: keep `queryFn` bodies trivial and deterministic (fixed latency, fixed stub arrays, no randomness) so RNTL can assert lists, empty states, and navigation without flakiness; allow latency to be zeroed under test. Do not import or reference `EXPO_PUBLIC_API_URL` in these mock files. Leave `// MOCK:` / `// TODO(real-api):` markers exactly where the real F1.7 / F1.1 / F1.6 calls slot in, behind the unchanged hook signatures — mirroring `src/features/auth/api/requestOtp.ts` and `src/features/profile/api/createProfile.ts`.
- **Performance**: the horizontal "Próximas partidas" uses `FlatList horizontal`; the nearby grid is small (mock ≤10) so a `flex-wrap` map is fine, but switch to a 2-column `FlatList` (`numColumns={2}`) if the real F1.7 returns >10 (ARCHITECTURE performance default). Cover images via `expo-image` for caching.
- **Accessibility**: bell and theme toggle expose `accessibilityRole="button"` + labels even while no-op; each card is a single `accessibilityRole="button"` target announcing the match name + datetime; section "Ver todas"/"Mapa" links are distinct accessible targets. Empty/error rows use `accessibilityLiveRegion="polite"`.
- Do not call any API from the screen — both reads go through `src/features/matches/api/` hooks (CLAUDE.md rule 6), even while mocked. Card components receive plain data via props and never fetch.
- Keep the theme toggle a pure no-op (or a `router.push('/profile/settings')` shortcut) — do **not** introduce dark-mode tokens or a theme store here; that is gated on DESIGN_SYSTEM adding dark tokens (S10's responsibility).
