# Screen Spec: S17 — Map of Nearby Matches

## Origin
- Screen from SCOPE: `S17 — Map of Nearby Matches`
- Layer: 1 (Match Core — consumes F1.7 nearby matches)
- Requested by: human (renanortega.dev@gmail.com)

## Human decisions (resolved 2026-07-02)
- **Gate 1 — `NearbyMatch` coordinates:** APPROVED (mock-only for now). Add `lat: number; lon: number` to the `NearbyMatch` type and to the mocked F1.7 entries in `quadra-mobile`. The `quadra-api` F1.7 payload is aligned separately later; no backend confirmation required to build this screen.
- **Gate 2 — `expo-location`:** APPROVED. Now locked in `CLAUDE.md`'s stack table; install via `npx expo install expo-location`.

## Reference assets read
- [x] `docs/references/screens/S17-map/explorar.png` — **confirmed a byte-for-byte copy of the S6 Explore screen**, not a dedicated full-screen map (as SCOPE warns).
- [x] `docs/references/screens/S6-explore/explorar.png` — used per SCOPE for pin/card visual style (the inline map preview: floating count badge top-left, teardrop pins with venue-label pills, and a floating bottom card with a CTA).

> No dedicated full-screen-map screenshot exists. Per SCOPE's source-of-truth hierarchy, the inline S6 map drives pin + bottom-card visual style; SCOPE drives behavior, in/out, and backend deps.

## Notable divergences from the prototype
- The prototype's inline map is a **static preview** inside the S6 Explore scroll (with search bar, filter chips, and a results grid around it). S17 is a **full-screen live `react-native-maps` view** with none of that surrounding chrome — search/filter/grid belong to S6, not here.
- Prototype's floating bottom card shows **venue rating "★ 4.9 (341)"** and venue name — **NOT included**. That is Layer-3 venue data absent from `NearbyMatch`. The S17 bottom sheet renders the reusable dark **`MatchCard`** (match data: format, level, distance, confirmed/capacity, price) instead, per COMPONENTS.md ("Reused by ... S17 map bottom sheet").
- Prototype's **"N jogos ao vivo"** badge implies live-match status — **replaced** with a neutral **"N partidas por perto"** count badge. `NearbyMatch` has no `live` flag; live status is the S14 scoreboard domain (SignalR), not F1.7.
- Prototype shows filter chips (Todos/Perto/Hoje/Iniciante/6x6) — **NOT included**; SCOPE S17 out-of-scope: "filtering by anything other than radius and slot availability."

## Goal
Let the user browse nearby matches on a full-screen map, tap a color-coded pin to preview a match, and jump to its detail.

## Route
`app/explore/map.tsx` — reached from S6 Explore via the already-wired `router.push('/explore/map')` (see `app/(tabs)/explore.tsx` `goMap`). The file currently exists as a bare `"Mapa"` placeholder and is **replaced** by this spec. Rendered as a stacked screen outside the tab bar (Expo Router `app/explore/` group), so no bottom tab bar on this screen.

## Backend dependencies
- `F1.7` (nearby matches) — consumed via the existing `useNearbyMatches({ lat, lon, radiusKm })` hook (`src/features/matches/api/getNearby.ts`, currently mocked).

> ⚠️ **Data-model gap (must align before build, within F1.7's scope):** rendering a map pin requires each match to carry geographic coordinates. The current `NearbyMatch` type (`src/features/matches/types/match.ts`) has **no `lat`/`lon`**. A geo-nearby endpoint inherently returns per-match coordinates, so this stays within F1.7 (not a new endpoint), but the payload/type must gain `lat: number; lon: number`. This addition is **additive and safe** for S5/S6/`MatchCard` (none render coordinates). See "Files to modify."

## Existing components reused
- `MatchCard` (`src/components/domain/MatchCard.tsx`) — the tapped-pin bottom sheet content. Its whole surface is the "Ver detalhes" affordance (`onPress(id)` → navigate to S12). Renders full-width here.
- `Button` (`variant: 'primary'` for "Permitir localização"; `variant: 'ghost'` for "Abrir configurações" / "Tentar novamente"; `variant: 'outlineW'` if a control sits over dark) — permission and error/retry CTAs.

## New components proposed
NONE.

- The **map view**, the **custom pin markers** (color-coded `<Marker>` children), the **count badge**, and the **bottom-card overlay** are one-off screen composition inlined in `app/explore/map.tsx`. Per the COMPONENTS.md decision log, these are single-screen pieces (the S6 inline preview is a static placeholder, not a shared real map) → inline, do not extract.
- No bottom-sheet library is introduced. The preview is a simple absolutely-positioned bottom card (mirroring the S6 inline pattern), optionally animated with `react-native-reanimated` (already in the stack) — **not** a draggable gesture sheet, to avoid a new dependency.

## Layout structure

```
<View className="flex-1 bg-bg-light">              // root (map fills)
  <MapView className="flex-1" ...>                  // react-native-maps, full screen
    {matches.map(m =>
      <Marker coordinate={{ latitude, longitude }} onPress={() => select(m.id)}>
        // custom pin: color-coded by slot availability
        <View className="rounded-full p-2 {pinTone}">   // bg-accent | bg-warning | bg-text-muted
          <Volleyball size={16} color={colors.textOnDark} />
        </View>
      </Marker>
    )}
  </MapView>

  // Back control (safe-area top-left, floats over the map)
  <SafeAreaView edges={['top']} className="absolute top-0 left-0">
    <Pressable className="m-4 h-10 w-10 rounded-full bg-white shadow-card items-center justify-center">
      <ChevronLeft size={24} color={colors.surfaceDark} />
    </Pressable>
  </SafeAreaView>

  // Count badge (floats top area, lime)
  <View className="absolute top-16 left-4 bg-accent rounded-pill px-3 py-1 shadow-card">
    <Text className="font-mono text-mono text-text-primary uppercase">
      {matches.length} partidas por perto
    </Text>
  </View>

  // Bottom preview card — only when a pin is selected
  {selected && (
    <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0">
      <View className="px-4 pb-4">
        <MatchCard match={selected} onPress={goMatch} />
      </View>
    </SafeAreaView>
  )}
</View>
```

Permission / loading / error / empty overlays replace the map body (see "Loading / error / empty states"). All colors via tokens (`bg-accent`, `bg-warning`, `bg-text-muted`, `bg-white`, `text-text-primary`); runtime colors for lucide/marker come from `src/theme/colors.ts` — no inline hex.

### Pin color-coding (slot availability — the only encoding SCOPE allows)
Derived from `confirmed` / `capacity` (`openSlots = capacity - confirmed`), all tokens:
- `openSlots >= 2` → `bg-accent` (lime) — vagas abertas
- `openSlots === 1` → `bg-warning` (amber) — última vaga
- `openSlots <= 0` → `bg-text-muted` (grey) — lotada

## State

### Server state (TanStack Query hooks)
- `useNearbyMatches({ lat, lon, radiusKm: 5 })` — existing, `src/features/matches/api/getNearby.ts`. Params come from the resolved device location; while F1.7 is mocked the params are accepted but ignored.

### Client state (Zustand)
- None. Device permission/location is ephemeral to this screen, not cross-screen shared.

### Local state
- `useState` only for:
  - `selectedMatchId: string | null` — which pin's preview card is shown (null = none / dismissed)
  - `permission: 'undetermined' | 'granted' | 'denied'` — foreground location permission status (from `expo-location`)
  - `region` / `userLocation: { latitude; longitude } | null` — resolved device location for map centering (device state, not server data → `useState` is correct per ARCHITECTURE "component-local ephemeral")

### Forms (if any)
- None.

## Navigation triggers
- Back button → `router.back()`
- `MatchCard` tap (selected pin preview → "Ver detalhes") → `router.push({ pathname: '/matches/[id]', params: { id } })` (S12)
- "Abrir configurações" (denied state) → `Linking.openSettings()`

## Permissions / external integrations
- **Location** via `expo-location` (**NEW dependency — see "New npm dependencies"**):
  - Request **foreground** permission lazily on mount, behind a rationale screen (pre-permission explanation + "Permitir localização" CTA), then `requestForegroundPermissionsAsync()`.
  - On grant → `getCurrentPositionAsync()` to center the map; feed `lat`/`lon` into `useNearbyMatches`.
  - On denial → explanation + "Abrir configurações" (deep-link to OS settings via `Linking.openSettings()`).
- **`react-native-maps`** (already in the locked stack, `1.27.2`) — the map surface. Requires native map config (see "Files to modify").

## Real-time subscriptions (if any)
- None. Live scoring is S14; the map reads a static F1.7 snapshot (with query `staleTime` refresh).

## Loading / error / empty states
- **Permission undetermined**: full-screen rationale card — "Veja partidas perto de você" + body + `Button variant="primary"` "Permitir localização".
- **Permission denied**: full-screen explanation — "Precisamos da sua localização para mostrar o mapa" + `Button variant="ghost"` "Abrir configurações".
- **Loading** (resolving location or nearby fetch `isPending`): centered spinner / neutral placeholder over `bg-bg-light` (DESIGN_SYSTEM skeleton shapes are TBD — flag, mirror S6's `SkeletonBlock` precedent).
- **Error** (nearby fetch `isError`): centered "Não foi possível carregar" + `Button variant="ghost"` "Tentar novamente" → `refetch()`.
- **Empty** (granted, zero matches in radius): map still renders centered on the user, with an overlay pill/card "Nenhuma partida perto de você ainda" and no pins.

## Acceptance criteria
- [ ] Full-screen `react-native-maps` view renders when location permission is granted
- [ ] When permission is undetermined, a rationale with "Permitir localização" is shown; pressing it requests permission
- [ ] When permission is denied, an explanation with "Abrir configurações" is shown and pressing it calls `Linking.openSettings()`
- [ ] One pin renders per match returned within the radius
- [ ] Pins are color-coded by slot availability (vagas abertas / última vaga / lotada) using DESIGN_SYSTEM tokens
- [ ] Tapping a pin shows a bottom preview card (`MatchCard`) with that match's summary
- [ ] Tapping the preview card navigates to the match detail (S12)
- [ ] Back control returns to S6 Explore
- [ ] When granted but no matches are in radius, an empty-state message is shown and no pins render
- [ ] Nearby fetch error shows a retry affordance that refetches

> RNTL note: `react-native-maps` is mocked in tests; assertions target the permission states, count badge, pin color logic (pure helper), the bottom card presence on pin select, navigation, and empty/error overlays — not native map rendering.

## Out of scope (be explicit)
- Venue rating / reviews / venue name in the preview card (prototype shows "★ 4.9 (341)" — Layer-3 venue data, per SCOPE)
- "N jogos ao vivo" live-status badge (replaced with a static count; live status is S14/SignalR)
- Search bar, filter chips, and grade/lista results grid (those are S6 Explore; SCOPE S17: "no filtering other than radius and slot availability")
- Marker clustering (only needed >50 visible markers per ARCHITECTURE; MVP nearby set is small — defer)
- Draggable/gesture bottom sheet (a simple bottom card suffices; no new sheet dependency)
- Background location / continuous tracking (foreground one-shot only)

## Files to create
- NONE new — `app/explore/map.tsx` already exists (placeholder) and is rewritten (see below).

## Files to modify
- `app/explore/map.tsx` — replace the placeholder with the full map screen.
- `src/features/matches/types/match.ts` — add `lat: number; lon: number` to `NearbyMatch` (F1.7 payload; additive, safe for S5/S6/`MatchCard`).
- `src/features/matches/api/getNearby.ts` — add `lat`/`lon` to the mock `MATCH` entries so pins render while F1.7 is mocked.
- `CLAUDE.md` — add `expo-location` to the locked stack table (stack change per repo rules).
- `app.json` / `app.config.*` — location permission strings (iOS `NSLocationWhenInUseUsageDescription`, Android `ACCESS_FINE/COARSE_LOCATION`) and `react-native-maps` native config (e.g. Google Maps API key entries) if not already present.
- `docs/COMPONENTS.md` — no new component, so no catalog entry required (confirm `MatchCard`'s "Used in" already lists S17 — it does).

## New npm dependencies
- `expo-location` — install via `npx expo install expo-location` (resolves the SDK-56-compatible version). **Justification:** device foreground location is required to center the map and supply `lat`/`lon` to F1.7; no alternative in the current stack. **This is a stack change** → `CLAUDE.md` must be updated before implementation (flag to human; the DESIGN_SYSTEM/CLAUDE rules require locking new packages first).
- `react-native-maps` — already installed (`1.27.2`), no action.

## Implementation notes
- Request location **lazily** behind a rationale, never silently on mount before the user understands why (accessibility + App Store review friendliness).
- Keep the pin color-coding as a **pure exported helper** (e.g. `pinToneFor(openSlots)`) so RNTL can unit-test the mapping without the native map.
- Mock `react-native-maps` and `expo-location` in tests (per ARCHITECTURE testing strategy: mock native modules; assert states, not the map canvas).
- The bottom card reuses the dark `MatchCard` as-is — it renders full-width here (it was designed for a `w-[48%]` grid cell but has no fixed width). Wrap in `px-4` + `SafeAreaView edges={['bottom']}`.
- No `StyleSheet.create`; the only non-className style permitted is `MapView`/`Marker` native props and the existing `MatchCard` `borderRadius` inline (already in that component). Marker/lucide colors come from `src/theme/colors.ts` (`bg-warning`/`bg-text-muted` may need corresponding entries in `colors.ts` if used as runtime lucide/marker colors — currently `colors.ts` lacks `warning`; add it there mirroring the token, or drive marker tone purely via NativeWind `className` on the wrapper `View` to avoid touching `colors.ts`). Prefer the NativeWind-className route for marker tone.
- Dark-mode tokens are still unspecified (DESIGN_SYSTEM "What is NOT yet specified") — this screen is light-first like the rest of MVP; the theme toggle is not present here.
