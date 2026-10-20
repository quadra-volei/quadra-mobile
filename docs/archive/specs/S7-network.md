# Screen Spec: S7 — Network (placeholder for MVP)

## Origin
- Screen from SCOPE: S7 — Network (placeholder for MVP)
- Layer: 2 (Retention) — tab shipped, but the feature itself (social feed) is Layer 3 and explicitly deferred
- Requested by: human (renanortega.dev@gmail.com)

## Reference assets read
- [x] `docs/references/screens/S7-network/rede.png` (the only PNG under S7's Reference line in SCOPE.md)

The reference is a **single screenshot of the full social feed** (post cards with avatars, like/comment/participate actions, a "SUGESTÃO DE AMIGOS" carousel with "Ver tudo", and "Participar" CTAs). Per SCOPE this is provided *only to understand what is NOT being built*. The header pattern (title "REDE" + notification bell + theme toggle on the top-right) is the only element carried into the placeholder.

## Notable divergences from the prototype
- Prototype shows a full social feed (post cards: results, ranking call-outs, MVP shout-outs, "Participar" buttons) — **NOT included**; social feed / posts are Layer 3 per SCOPE ("OUT: any actual feed/posts (Layer 3)").
- Prototype shows a "SUGESTÃO DE AMIGOS" friend-suggestion carousel with "Ver tudo" — **NOT included**; friend system is Layer 3 / explicitly in the "What is NOT in MVP" list ("Friend system (US 5.1, 5.2)").
- Prototype shows like / comment / share interactions on posts — **NOT included**; no social graph in MVP.
- The entire screen body is **replaced with a single empty/coming-soon state** ("Em breve: rede social de jogadores") per SCOPE S7 IN. SCOPE S7's IN list authorizes **only** the empty-state message — no CTA. There is no "explore" button or any other action on this screen.
- The header (title + bell + theme toggle) **is** kept, to match the convention established by S5 Home and S6 Explore so the tab doesn't look broken.

## Goal
Show the user that the "Rede" tab exists and that a player social network is coming, via a clear empty/placeholder state — with no feed, posts, friend features, or CTAs.

## Route
`app/(tabs)/network.tsx` — Expo Router. The `network` tab is **already registered** in `app/(tabs)/_layout.tsx` (verified) and the `TabNetworkIcon` already exists; this spec only fills the screen body. The file already exists as a minimal stub and will be **replaced** (see "Files to modify").

## Backend dependencies
- NONE. (SCOPE S7: "Backend deps: none".) This screen makes zero API calls.

## Existing components reused
- Header is **not** an extracted component yet (the catalog has no `Header`/`Screen` layout component), so it is inlined the same way S5 Home and S6 Explore inline it — `SafeAreaView` + a `flex-row` title/actions row using `Bell` and `Sun` from `lucide-react-native` with `colors.surfaceDark`. This keeps S7 consistent with the two shipped tab screens without inventing a component for a placeholder.
- No interactive components (no `Button`) — the screen renders the empty state only, per SCOPE S7 IN.

## New components proposed
NONE.

A shared `EmptyState` component is tempting, but: (1) no existing empty state has been extracted yet (S5 inlines its per-section empty states), and (2) the decision log requires reuse in ≥ 2 screens before extraction. Extracting now for a single placeholder screen would be premature. The empty state here is a small inline `View` of an icon + two `Text` lines. Revisit extraction when a second screen needs the same shape.

## Layout structure

NativeWind classes only; tokens from DESIGN_SYSTEM.md. No hex, no `StyleSheet.create`.

```
<View className="flex-1 bg-bg-light">
  <SafeAreaView edges={['top']} className="flex-1">

    {/* Header — mirrors S5 Home / S6 Explore */}
    <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
      <Text className="font-display text-h1 text-text-primary uppercase">REDE</Text>
      <View className="flex-row items-center gap-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Notificações" onPress={() => {}}>
          <Bell size={24} color={colors.surfaceDark} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Alternar tema" onPress={() => {}}>
          <Sun size={24} color={colors.surfaceDark} />
        </Pressable>
      </View>
    </View>

    {/* Placeholder / empty state — vertically centered in remaining space */}
    <View className="flex-1 items-center justify-center px-8" accessibilityLiveRegion="polite">
      {/* Decorative icon — reuse the existing TabNetworkIcon (brand) OR a lucide Users.
          Spec default: lucide Users at size 40, color colors.textMuted, inside a
          bg-white rounded-full shadow-card circle for a soft "badge" look. */}
      <View className="bg-white rounded-full shadow-card w-20 h-20 items-center justify-center">
        <Users size={40} color={colors.textMuted} />
      </View>

      <Text className="font-body text-h3 text-text-primary text-center mt-6">
        Em breve: rede social de jogadores
      </Text>
      <Text className="font-body text-caption text-text-muted text-center mt-2">
        Aqui você vai acompanhar a galera, ver resultados e novidades das suas quadras.
      </Text>
    </View>

  </SafeAreaView>
</View>
```

> The **mandatory, primary** string per SCOPE S7 IN is the title line `"Em breve: rede social de jogadores"` (verbatim). The secondary subtitle line is a spec-author addition that renders the empty state with polish — it is not a CTA and adds no behavior. If PM wants the bare minimum, the subtitle may be dropped; the title line must always remain.

## State

### Server state (TanStack Query hooks)
- None. This screen fetches nothing.

### Client state (Zustand)
- None.

### Local state
- None. (Pure static render. The bell/theme handlers are no-ops here, identical to S5/S6 — theme toggle wiring is owned by S10 Settings, not this screen.)

### Forms (if any)
- None.

## Navigation triggers
- NONE on this screen. The screen renders the empty state only — there is no CTA and no programmatic navigation. Switching tabs is handled entirely by the bottom tab bar in `app/(tabs)/_layout.tsx`.
- Bell / theme toggle: **no-op on this screen** (consistent with S5/S6 — both currently render these as `onPress={() => {}}`). Real notification screen and theme switching are out of S7's scope.

## Permissions / external integrations
- NONE.

## Real-time subscriptions (if any)
- None.

## Loading / error / empty states
- Loading: N/A (no async work).
- Error: N/A (no async work).
- Empty: the screen **is** the empty/placeholder state — always rendered, never data-driven.

## Acceptance criteria
- [ ] The "Rede" tab opens `app/(tabs)/network.tsx` and renders without errors.
- [ ] Header shows the title "REDE" (uppercase, `font-display`/`text-h1`) plus a notification bell and a theme-toggle icon, matching S5/S6.
- [ ] The body shows the message "Em breve: rede social de jogadores" (verbatim, per SCOPE S7 IN) as the primary text.
- [ ] No feed, posts, like/comment/share controls, friend-suggestion carousel, or CTAs/buttons are present (per SCOPE S7 OUT — Layer 3; SCOPE S7 IN authorizes only the empty-state message).
- [ ] The screen makes zero network requests (SCOPE S7: backend deps none).
- [ ] The bottom tab bar (4 tabs + central FAB) remains visible and the "Rede" tab shows as selected.
- [ ] The placeholder message is announced to screen readers (`accessibilityLiveRegion` / accessible text).

## Out of scope (be explicit)
- Social feed / posts / stories (Layer 3) — the prototype's post cards are not built.
- Friend system and "Sugestão de amigos" suggestions (Layer 3; explicitly in SCOPE's "What is NOT in MVP" list).
- Like / comment / share interactions.
- "Participar" CTAs on feed items.
- Any CTA / button on this screen (e.g. an "explore" exit) — SCOPE S7 IN authorizes the empty-state message only; the screen is intentionally a static placeholder.
- Notification screen behind the bell (push target TBD; not part of S7).
- Theme switching from the toggle (owned by S10 Settings).

## Files to create
- NONE. (`app/(tabs)/network.tsx` already exists — see "Files to modify".)

## Files to modify
- `app/(tabs)/network.tsx` — **replace** the existing minimal stub with the placeholder screen described above.
- `app/(tabs)/_layout.tsx` — **no change needed**; the `network` tab is already registered there (verified). Listed only to record it was checked.
- `docs/COMPONENTS.md` — **no change**; no new component proposed.

## New npm dependencies
- NONE. (`lucide-react-native` for `Bell`/`Sun`/`Users` and the existing `TabNetworkIcon` are already in the locked stack / codebase.)

## Implementation notes
- Mirror the header markup from `app/(tabs)/index.tsx` exactly (same `SafeAreaView edges={['top']}`, same icon sizes/colors via `@/theme/colors`) so the three tab screens stay visually consistent. Do **not** extract a `Header` component just for this — that's a separate refactor decision.
- Keep the screen body vertically centered using `flex-1 items-center justify-center`; the tab bar's safe-area padding is handled by `_layout.tsx`, so this screen does not need bottom inset padding.
- Decorative icon choice: `lucide`'s `Users` is the safe default (already used by `MatchCard`/`MatchCardCompact` for the player count). Alternatively reuse the brand `TabNetworkIcon` — but that component is tuned for the tab bar (focused/muted states) and may not render cleanly at large sizes; prefer `Users` unless design says otherwise.
- Accessibility: the placeholder is the primary content, so ensure the message text is reachable by screen readers; `accessibilityLiveRegion="polite"` on the container matches the empty-state pattern already used in S5.
- Do not wire the bell or theme toggle here — leaving them as no-ops matches the current shipped behavior of S5/S6 and avoids leaking S10/notification scope into this placeholder.
- Resist adding "while we're here" feed scaffolding **or any CTA**. This is a deliberate, action-free placeholder; the next agent should ship the minimum.
