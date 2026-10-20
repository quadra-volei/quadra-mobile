# Screen Spec: S8 — Profile

> ## Amendment — 2026-10-06: real profile API (supersedes the mock-first notes below)
>
> Johny decided the backend follows the mobile profile shape, so the "Backend alignment gate" is resolved and the S8 header and "Seu progresso" card talks to the real backend (F2.1). Where this amendment and the original text disagree, the amendment wins.
>
> - **`useMyProfile` is real**: name, avatar, GERAL and the ACE/BLK/ATA/DEF grid come from `GET /api/v1/profiles/me`. The ratings are derived by the backend from the declared level and position; they do not grow with play yet.
> - **Still placeholders**: the "Level N · XP" bar shows Level 1 / 0 XP (the backend has no XP system yet), and the player card's SRV/REC cells show GERAL (the backend rates four skills). "MINHAS PARTIDAS" is still mocked.

> ### 🔄 Scope update — 2026-07-08 (owner decision)
> The owner re-included three prototype elements that this spec originally cut as
> "Layer 3", to match `Quadra.html`. Now shipped (with code + tests):
> 1. **ACE/BLK/ATA/DEF stats grid** in "Seu progresso" (2×2, beside the GERAL box).
> 2. **"Ver a sua carta" CTA** → new player-card screen **S8b** (`app/profile/card.tsx`):
>    GERAL + position tag, photo, name/@handle·posição, 6-stat grid (adds SRV/REC),
>    "Compartilhar carta" (native share), premium note.
> 3. **"Ver tudo" on MINHAS PARTIDAS** — rendered but **inert** (no full-history
>    screen in MVP; the prototype's handler is likewise empty).
> Also: the "Ranking semanal" right-side number is now the player's **OVR** (same
> value as GERAL) instead of weekly points — applied to both this preview and S9.
>
> **Ranking-card parity (2026-07-08):** the dark card was aligned to the prototype:
> outer section title **"Meus amigos"** with an inner brightLime **"Ranking semanal"**
> label; **solid navy** background (not a gradient); per-row colors (only the "me"
> row is lime — position + score — everyone else white, with a dimmed position and
> a bordered highlight); lime-outlined "Ver tudo" (new `Button` `outlineLime`
> variant); and **tier-colored level badges** on the avatars (`Avatar level` prop +
> `src/theme/levelTier.ts`), also shown on the header avatar and on S9.
>
> The acceptance criteria and "Out of scope" list below are updated to match; the
> "Notable divergences" section reflects the *original* cut and is kept for history.

✅ **scope-guardian: APPROVED** — all 11 checklist items pass. Item 3 (backend gate, rule #10) cleared via the owner-approved S5/S6 mocked posture. The three "Open questions" are resolved to the spec's documented defaults: (1) hide the destination-less MINHAS PARTIDAS "Ver tudo" and render mocked rows inline; (2) add a header settings affordance → `/profile/settings` for S10 reachability; (3) title the dark card "Ranking semanal".

## Origin
- Screen from SCOPE: S8 — Profile
- Layer: 2 (Retention) — F2.1/F2.2 profile read, F2.3 group ranking, F1.6 match history. The fourth and last data-display tab.
- Requested by: human (renanortega.dev@gmail.com)

## Reference assets read
- [x] `docs/references/screens/S8-profile/perfil.png` (the only PNG under S8's `Reference:` line in SCOPE.md — read in full: header + middle + bottom). The PNG exists on disk and was read; it is the only layout reference (no prototype source code).

What the screenshot shows, top to bottom:
1. **Header** — circular avatar (top-left) + "Olá," (small) over "RENAN" (display) + a notification bell and a sun/moon theme icon (top-right).
2. **"Seu progresso" card** (white) — a left "GERAL" block with a large number "68" (`font-num`) and a 2×2 grid of small stats **ACE 30 / BLK 25 / ATA 20 / DEF 30**; below it a full-width **"Ver a sua carta"** gradient CTA; below that a **"Level 15"** row with an XP progress bar and "XP: 2.450 / 5.000".
3. **"MINHAS PARTIDAS"** — a list of 3 recent matches, each: small icon, match name + date·format subtitle, a right-aligned result label (VITÓRIA/DERROTA) over a set score (3–1 / 1–3 / 3–0), and a chevron; then a **"Ver tudo"** button.
4. **"MEUS AMIGOS"** — a dark navy card titled "Ranking semanal" with ranked rows (position, avatar, name + subtitle, score), the current user's row highlighted ("Você … 68"), and a **"Ver tudo"** button.
5. **"SUGESTÃO DE AMIGOS"** — a horizontal strip of player cards (avatar + position badge + name) with "Ver tudo".
6. **"CONQUISTAS"** — achievement cards ("Sequência de 5", "Saque de Ferro", … "DESBLOQUEADA").
7. Bottom tab bar (Perfil active).

## Notable divergences from the prototype
SCOPE wins on behavior/in-out; the PNG wins on layout. Divergences (each cut is per SCOPE):

- **ACE / BLK / ATA / DEF stats grid — NOT included.** SCOPE S8 is explicit: those four stats are Layer 3; "Display GERAL only." The "Seu progresso" card keeps **only the GERAL number** (and the Level/XP row). The 2×2 stats grid from the print is omitted. (SCOPE offers "static placeholder values with 'Em breve' overlay OR hide the row entirely" — this spec **hides the row**, the cleaner of the two sanctioned options, to avoid shipping fake numbers.)
- **"Ver a sua carta" CTA / player card — NOT included.** SCOPE S8 OUT: "hide the button for MVP" (`CardScreen` is Layer 3). The gradient CTA from the print is removed.
- **"SUGESTÃO DE AMIGOS" friend-suggestion strip — NOT included.** SCOPE S8 OUT ("friend suggestions, Layer 3") and in the global NOT-in-MVP list ("Friend system US 5.1, 5.2"). No friends carousel.
- **"CONQUISTAS" achievements gallery — NOT included.** SCOPE S8 OUT ("achievement gallery, Layer 3") and global NOT-in-MVP ("Achievements gallery US 1.2").
- **"MEUS AMIGOS" card title is a misnomer.** SCOPE S8 clarifies this is **not a friends system** — it renders the **group / weekly ranking** (F2.3), the same data as S9. This spec keeps the dark ranking card but treats it as a **ranking preview** (top rows + the user's row), with "Ver tudo" → **S9 full ranking**. The card title follows the mockup's inner "Ranking semanal" rather than the misleading outer "Meus amigos" label. (SCOPE note: "clarify with PM if blocking" — not blocking; rendered as ranking, not friends.)
- **No inline-editable fields.** SCOPE S8 OUT: editing lives in S10 Settings. The header avatar is display-only here; profile editing is reached via S10 (a settings/gear entry — see Navigation).
- **Header keeps avatar + greeting** — unlike S5/S6/S7 (which are title-only per their SCOPE), S8 SCOPE explicitly includes "avatar + greeting ('Olá, NOME')". This is the one tab whose header carries identity.

## Goal
Give the onboarded user their identity hub: see their overall (GERAL) score and level/XP progress, glance at recent match results, preview their weekly group ranking, and jump to the full ranking — all read-only.

## Route
`app/(tabs)/profile.tsx` — replaces the current placeholder (`<Text>Perfil</Text>` at `app/(tabs)/profile.tsx:1-9`). The fourth tab in the `(tabs)` group; the `profile` tab + `TabProfileIcon` are already registered in `app/(tabs)/_layout.tsx` (verified). `headerShown: false` is already set group-wide. The custom bottom bar + FAB are owned by `_layout.tsx`, not this screen.

## Backend dependencies

> ### ⚠️ Scope override (owner-approved) — same posture as S5
> Per CLAUDE/agent rule #10, an undefined backend endpoint would normally STOP the spec. The project owner (renanortega.dev@gmail.com) has already, for the data-display tabs (S5/S6), **consciously approved shipping fully mocked** ahead of backend alignment. S8 follows that same locked convention.
> - **(a) Not yet in backend SCOPE:** concrete endpoint paths for **F2.1/F2.2** (profile + progress/level), **F2.3** (group ranking), and **F1.6** (match history) are **not yet aligned** in quadra-api.
> - **(b) Conscious decision:** the owner approves shipping S8 **fully mocked** this iteration (consistent with S5/S6).
> - **(c) Explicit follow-up (gating real wiring):** backend alignment for **F2.1 / F2.2 / F2.3 / F1.6** in quadra-api is a required follow-up that **must** precede replacing the mocks. Hook signatures are designed so the swap is path-only behind the unchanged interface.

**NONE asserted this iteration — all reads are mocked.** No real endpoint path is referenced and no backend behavior is claimed to exist. Three `useQuery` hooks resolve locally (mirroring `src/features/matches/api/getUpcoming.ts`: fixed latency, fixed stub, `// MOCK:` / `// TODO(real-api):` markers, no `EXPO_PUBLIC_API_URL`, latency overridable for tests):

- `src/features/profile/api/getMyProfile.ts` — `useMyProfile()`. Returns the header identity + progress: `{ firstName, avatarUrl, overall (GERAL), level, xp, xpToNext }`. `// TODO(real-api):` → **F2.1/F2.2**. Feeds the header + "Seu progresso" card.
- `src/features/profile/api/getRecentMatches.ts` — `useRecentMatches()`. Returns the read-only history rows: `{ id, name, playedAt, format, result: 'VITORIA' | 'DERROTA', setScore }`. `// TODO(real-api):` → **F1.6**. Feeds "MINHAS PARTIDAS".
- `src/features/ranking/api/getGroupRanking.ts` — `useGroupRanking({ preview: true })`. Returns ranking rows `{ position, playerId, name, subtitle, score, isMe }`. `// TODO(real-api):` → **F2.3**. Feeds the dark "Ranking semanal" preview card. **Same hook S9 reuses** (S9 passes `preview: false` / full list) — defined here so S9 imports it.

> Query keys (ARCHITECTURE convention): `['profile', 'me']`, `['profile', 'recentMatches']`, `['ranking', 'group', { preview: true }]`. `staleTime` ~60s on ranking.

## Existing components reused
- `MatchCardCompact` (`src/components/domain/MatchCardCompact.tsx`) — **NOT** a fit for the "MINHAS PARTIDAS" rows. The print shows a **slim result row** (name + date·format + win/loss + set score + chevron), not the cover-strip compact card (which carries datetime/vagas/price/avatars, not a result). Its COMPONENTS.md entry says "Reused by S8 (recent matches strip)", but the mockup's S8 history rows are a different shape (result-oriented). This spec proposes a dedicated `MatchHistoryRow` and **flags the COMPONENTS.md note as stale** for the implementer to correct (see Files to modify). `MatchCardCompact` is therefore not used on S8.
- `Button` (`src/components/ui/Button.tsx`) — `variant="ghost"` for the two "Ver tudo" links and the optional retry link; `variant="outlineW"` is available if a "Ver tudo" needs to sit **inside** the dark ranking card (white border on navy) per the print's button-on-dark.
- `colors` / `HERO_GRADIENT` (`src/theme/colors.ts`) — runtime color values for lucide icon `color` props (bell, sun, chevron, settings) and the navy `LinearGradient` of the dark ranking card. No inline hex.
- Header pattern — inlined the same way S5/S6/S7 inline it (no shared `Header` component exists yet in the catalog). S8 adds the avatar + greeting variant.

## New components proposed
The catalog has no avatar, no XP/level bar, no ranking row, and no result-row primitive. Three domain pieces are reused across screens and earn extraction; everything else stays inline.

- `Avatar` — *why nothing fits*: the catalog has no avatar primitive; the header avatar (and the ranking rows, and S9/S10/S12/S15) all need a circular `expo-image` avatar with a fallback initial. First needed here.
  - Path: `src/components/ui/Avatar.tsx`
  - Props:
    ```ts
    type AvatarProps = {
      uri?: string;            // expo-image source; falls back to initials when absent
      name?: string;           // for the initial fallback + a11y label
      size?: 'sm' | 'md' | 'lg'; // sm=header rows, md=header, lg=podium (S9)
      testID?: string;
    };
    ```
  - Reused by S8 header + ranking rows, S9 podium/rows, S10 summary, S12 presence, S15 vote. Will be added to COMPONENTS.md by the implementer.

- `LevelBar` — *why nothing fits*: no progress/level primitive exists; the "Level 15 — XP 2.450 / 5.000" row is a labeled XP progress bar reused on the ranking/profile surfaces.
  - Path: `src/components/domain/LevelBar.tsx`
  - Props:
    ```ts
    type LevelBarProps = {
      level: number;     // "Level 15"
      xp: number;        // 2450
      xpToNext: number;  // 5000
      testID?: string;
    };
    ```
  - Renders the level label (`font-num` for the number), a track + fill bar (`bg-bg-light-alt` track, `bg-accent` or `bg-gradient-cta` fill per DESIGN_SYSTEM), and the "XP a/b" caption. The fill color follows the **player level scale** only if the design later asks for tier coloring; for MVP use the lime/`bg-gradient-cta` fill the print shows. Will be added to COMPONENTS.md.

- `MatchHistoryRow` — *why nothing fits*: `MatchCardCompact` is a cover-strip upcoming-match card, not a result row. The history rows show name + date·format + Vitória/Derrota + set score + chevron.
  - Path: `src/components/domain/MatchHistoryRow.tsx`
  - Props:
    ```ts
    type MatchHistoryRowProps = {
      match: {
        id: string;
        name: string;
        playedAt: string;          // ISO; rendered "Ontem · 19h30" / "20/06"
        format: '2X2' | '4X4' | '6X6';
        result: 'VITORIA' | 'DERROTA';
        setScore: string;          // "3-1" | "1-3"
      };
      onPress: (id: string) => void;
      testID?: string;
    };
    ```
  - Result label colored `success` (Vitória) / `danger` (Derrota); set score `font-num`. Single `accessibilityRole="button"`. Reused by S9-adjacent history if it appears; primarily S8. Will be added to COMPONENTS.md.

Inline (not extracted): the **header** (avatar + greeting + bell + sun — the avatar/greeting variant is one-off vs the title-only headers; extract a shared `Header` only when a second avatar-header consumer lands), the **"Seu progresso" card** (one-off composition), the **section header rows** ("MINHAS PARTIDAS" + "Ver tudo" — same tiny inline `flex-row` as S5), and the **dark ranking preview card** wrapper (the rows inside reuse `Avatar`; the ranking **row** is extracted to `RankingRow` **by S9**, the screen that owns the full ranking — S8 may use a minimal inline preview row OR `RankingRow` once S9 ships it; this spec keeps S8's preview rows inline to avoid coupling S8's delivery to S9, and notes `RankingRow` as S9's component).

## Layout structure

Token references only; NativeWind classes; no hex; no `StyleSheet.create`. Mirrors the S5 inline-header + `ScrollView` shell.

```
<View className="flex-1 bg-bg-light">
  <SafeAreaView edges={['top']} className="flex-1">

    # ── Header (inline; avatar + greeting variant) ──
    <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
      <View className="flex-row items-center gap-3">
        <Avatar uri={profile.avatarUrl} name={profile.firstName} size="md" />
        <View>
          <Text className="font-body text-caption text-text-muted">Olá,</Text>
          <Text className="font-display text-h1 text-text-primary uppercase">{profile.firstName}</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Notificações"> <Bell color={colors.surfaceDark} /> </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Alternar tema"> <Sun color={colors.surfaceDark} /> </Pressable>
      </View>
    </View>

    <ScrollView contentContainerClassName="pb-24">

      # ── "Seu progresso" card (GERAL + Level/XP only — stats grid & "Ver a sua carta" cut) ──
      <View className="mx-4 bg-white rounded-card shadow-card p-4">
        <Text className="font-display text-h1 text-text-primary uppercase">Seu progresso</Text>
        <View className="flex-row items-center gap-3 mt-3">
          <Text className="font-mono text-mono text-text-muted uppercase">Geral</Text>
          <Text className="font-num text-primary text-5xl">{profile.overall}</Text>
        </View>
        <View className="mt-4">
          <LevelBar level={profile.level} xp={profile.xp} xpToNext={profile.xpToNext} />
        </View>
      </View>

      # ── Section: MINHAS PARTIDAS ──
      <View className="flex-row items-center justify-between px-4 mt-6">
        <Text className="font-display text-h1 text-text-primary uppercase">MINHAS PARTIDAS</Text>
        <Button variant="ghost" onPress={goRanking /* see note: "Ver tudo" here → history; routes to S9 ranking? */}>Ver tudo</Button>
      </View>
      <View className="mx-4 bg-white rounded-card shadow-card divide-y divide-line">
        {recent.data.map((m) => (
          <MatchHistoryRow key={m.id} match={m} onPress={goMatch} />
        ))}
      </View>

      # ── Section: Ranking semanal (dark preview card; "Meus amigos" relabeled) ──
      <View className="flex-row items-center justify-between px-4 mt-6">
        <Text className="font-display text-h1 text-text-primary uppercase">Ranking semanal</Text>
        <Button variant="ghost" onPress={goRanking}>Ver tudo</Button>
      </View>
      <View className="mx-4 rounded-card overflow-hidden">
        <LinearGradient colors={HERO_GRADIENT} ...>      # navy hero card
          {ranking.data.map((row) => (
            <View key={row.playerId} className={`flex-row items-center px-4 py-3 ${row.isMe ? 'bg-primary/20 rounded-pill' : ''}`}>
              <Text className="font-num text-text-on-dark w-6">{row.position}</Text>
              <Avatar uri={...} name={row.name} size="sm" />
              <View className="flex-1 ml-3">
                <Text className="font-body text-body-bold text-text-on-dark">{row.name}{row.isMe ? ' · você' : ''}</Text>
                <Text className="font-body text-caption text-text-muted">{row.subtitle}</Text>
              </View>
              <Text className="font-num text-accent">{row.score}</Text>
            </View>
          ))}
          <Button variant="outlineW" onPress={goRanking}>Ver tudo</Button>   # button-on-dark, optional (header link already exists)
        </LinearGradient>
      </View>

    </ScrollView>
  </SafeAreaView>
</View>
```

> Display titles ("RENAN", "Seu progresso", "MINHAS PARTIDAS", "Ranking semanal") use `font-display` + `uppercase` (Climate Crisis is display-only/uppercase per CLAUDE.md). GERAL/scores/level/XP use `font-num` (Russo One). "Geral"/format pills use `font-mono`/`text-mono`. The dark card uses `HERO_GRADIENT` (`src/theme/colors.ts`) with `text-on-dark`; the user's row highlight uses a `primary` tint + lime `text-accent` score. No inline hex; no `StyleSheet.create`.

## State

### Server state (TanStack Query hooks)
- `useMyProfile()` — `src/features/profile/api/getMyProfile.ts` (MOCK; F2.1/F2.2 later). Key `['profile', 'me']`.
- `useRecentMatches()` — `src/features/profile/api/getRecentMatches.ts` (MOCK; F1.6 later). Key `['profile', 'recentMatches']`.
- `useGroupRanking({ preview: true })` — `src/features/ranking/api/getGroupRanking.ts` (MOCK; F2.3 later). Key `['ranking', 'group', { preview: true }]`, `staleTime: 60_000`. Shared with S9.

### Client state (Zustand)
- `useAuthStore` (`src/stores/auth.ts`) already holds `isAuthenticated`/`hasProfile`/`userId` — used by the route guard and to derive `isMe` matching against `userId` in the ranking rows. **No new store.** The theme toggle stays a no-op (dark tokens unspecified — S10's responsibility), so no `useThemeStore` here.

### Local state
- None required. The screen is read-only data display: no form, no toggles with persisted effect.

### Forms (if any)
- None. S8 has no form (editing lives in S10).

## Navigation triggers
- "Ver tudo" (Ranking semanal, both the header link and the in-card link) → `router.push('/profile/ranking')` (S9 full group ranking).
- "Ver tudo" (MINHAS PARTIDAS) → **there is no dedicated full-history screen in MVP.** Per SCOPE S8 the history is "read-only via F1.6" with a "Ver tudo"; SCOPE lists no S-number for an all-history screen. Route this "Ver tudo" to **S9 ranking** is wrong (different data). Options: (a) hide the "MINHAS PARTIDAS" "Ver tudo" for MVP, or (b) make it a no-op. This spec **hides "Ver tudo" on MINHAS PARTIDAS** (no target screen exists) and shows all mocked rows inline — flagged below under "Open question for scope-guardian".
- Each history row tap → `router.push({ pathname: '/matches/[id]', params: { id } })` (S12).
- Avatar / a profile-edit entry → **S10 Settings** (`router.push('/profile/settings')`). SCOPE S8 OUT: "editable fields inline (separate Settings screen, S10)". The print shows no explicit gear, but S10 must be reachable; the avatar (or a settings icon added to the header) is the entry. This spec adds a **settings affordance** wired to S10 (documented divergence — minimal, required for S10 reachability). If design prefers a gear icon over a tappable avatar, that's a header-icon swap only.
- Bell / theme toggle → no-op this iteration (documented; consistent with S5/S6/S7).

> **Typed-routes note:** `typedRoutes: true` is enabled. Use typed hrefs — groups are transparent (`/profile/ranking`, `/profile/settings`, `/matches/[id]`). All hrefs must pass `npm run typecheck` (PR gate). No legacy `navigation.navigate`.

## Permissions / external integrations
- **NONE.** No location, camera, contacts, or Google on this screen. Avatars load over the network via `expo-image` (no permission needed). Photo editing (which would touch the image picker) is S10, not here.

## Real-time subscriptions (if any)
- None. Profile/ranking/history are static reads; live subscriptions belong to S14.

## Loading / error / empty states
- **Loading**: each of the three sections renders its own neutral skeleton while `isPending` (a `bg-bg-light-alt rounded-card` block matching the section footprint — DESIGN_SYSTEM "Skeleton/loading shapes" is listed as not-yet-specified, so use the same neutral placeholder S5 established; flag for design). Sections load independently (no full-screen blocker). The header avatar/greeting falls back to an `Avatar` initial + a muted placeholder name until `useMyProfile` resolves.
- **Error**: per-section inline error row — `text-body text-text-muted` "Não foi possível carregar" + `Button variant="ghost"` "Tentar novamente" calling `refetch()` (mirrors S5's `ErrorRow`). No toast primitive introduced. The other sections still render.
- **Empty**:
  - MINHAS PARTIDAS empty → "Você ainda não jogou nenhuma partida" (inline `text-caption text-text-muted`, centered).
  - Ranking semanal empty (user in no group yet) → inside the dark card, "Entre em uma partida recorrente para aparecer no ranking" (`text-on-dark`/muted-on-dark caption).
  - Empty-state illustrations not yet specified in DESIGN_SYSTEM — text-only for now; flag for design.

## Acceptance criteria
- [ ] Header shows the authenticated user's avatar, "Olá," and their first name (display type) — plus a notification bell and a theme toggle.
- [ ] The "Seu progresso" card shows the **GERAL** number (`font-num`), the **ACE/BLK/ATA/DEF** stats grid (2×2), and a Level/XP bar ("Level N", "XP a / b").
- [ ] The "Ver a sua carta" gradient CTA is present and navigates to the player card (`/profile/card`, S8b).
- [ ] MINHAS PARTIDAS renders a "Ver tudo" button that is inert (no full-history screen in MVP).
- [ ] The "Ranking semanal" right-side number shows each player's OVR (same scale as GERAL).
- [ ] "MINHAS PARTIDAS" renders the recent matches from `useRecentMatches`, each row showing name, date·format, Vitória/Derrota (success/danger colored) and set score; tapping a row navigates to S12 with its id.
- [ ] The dark "Ranking semanal" card renders ranking rows from `useGroupRanking({ preview: true })` with position, avatar, name, subtitle, score; the current user's row is highlighted with "· você".
- [ ] "Ver tudo" on the ranking section navigates to S9 (`/profile/ranking`).
- [ ] A settings affordance navigates to S10 (`/profile/settings`).
- [ ] No "SUGESTÃO DE AMIGOS" friends strip and no "CONQUISTAS" achievements gallery render.
- [ ] Each section shows its own loading placeholder, empty state, and retry-on-error independently.
- [ ] The bottom tab bar (4 tabs + central FAB) persists and Perfil is the active tab.
- [ ] No permission prompt fires on Profile.
- [ ] All criteria are verifiable via RNTL against the mocked queries (no MSW / no network) and mocked navigation.

## Out of scope (be explicit)
- "SUGESTÃO DE AMIGOS" friend suggestions / any friends system (Layer 3 — SCOPE OUT + global NOT-in-MVP).
- "CONQUISTAS" achievements gallery (Layer 3 — SCOPE OUT + global NOT-in-MVP).
- Inline editable profile fields (S10 Settings owns editing — SCOPE OUT).
- Functional dark-mode theme toggle (dark tokens unspecified; toggle is a no-op until S10 + dark tokens).
- Notifications screen / bell badge / push preview (no notifications screen in SCOPE; bell is a no-op).
- A dedicated full match-history screen (none in MVP; the MINHAS PARTIDAS "Ver tudo" is rendered but inert until one exists).
- Real data wiring — all three reads are mocked; the human wires real F2.1/F2.2/F2.3/F1.6 behind the unchanged hook signatures.

## Open questions for scope-guardian / PM
1. **MINHAS PARTIDAS "Ver tudo" has no destination.** SCOPE S8 lists the "Ver tudo" but no S-number for a full-history screen (S9 is the *ranking*, not history). Default taken: **hide that "Ver tudo"** and render all mocked rows inline. Confirm, or add a history screen to SCOPE.
2. **S10 reachability.** The print has no visible gear; SCOPE requires editing to live in S10. Default taken: a **settings affordance** in the S8 header (tappable avatar or a settings icon) → `/profile/settings`. Confirm the affordance shape with design.
3. **"Meus amigos" label.** Rendered as "Ranking semanal" (the print's inner title) since SCOPE says it's group ranking, not friends. Confirm copy with PM.

## Files to create
- `app/(tabs)/profile.tsx` — the Profile screen (replaces the `<Text>Perfil</Text>` placeholder).
- `src/components/ui/Avatar.tsx` — circular avatar (`expo-image` + initials fallback).
- `src/components/domain/LevelBar.tsx` — level + XP progress bar.
- `src/components/domain/MatchHistoryRow.tsx` — recent-match result row.
- `src/features/profile/api/getMyProfile.ts` — `useMyProfile` (**MOCK** queryFn, `// TODO(real-api):` F2.1/F2.2).
- `src/features/profile/api/getRecentMatches.ts` — `useRecentMatches` (**MOCK**, `// TODO(real-api):` F1.6).
- `src/features/ranking/api/getGroupRanking.ts` — `useGroupRanking` (**MOCK**, `// TODO(real-api):` F2.3); shared with S9.
- `src/features/profile/types/profile.ts` — `MyProfile`, `RecentMatch` types (TypeScript only — no `any`).
- `src/features/ranking/types/ranking.ts` — `RankingRow` type (shared with S9).

## Files to modify
- `docs/COMPONENTS.md` — add entries for `Avatar`, `LevelBar`, `MatchHistoryRow`; **correct the stale `MatchCardCompact` "Used in" note** that claims "Reused by S8 (recent matches strip)" (S8 uses `MatchHistoryRow` instead — the S8 rows are result rows, not compact cover cards).
- (No change needed to `app/(tabs)/_layout.tsx` — the `profile` tab + icon are already registered.)

## New npm dependencies
- **NONE — no stack change.** Mocked reads use `@tanstack/react-query` (locked). `Avatar` uses `expo-image` (locked); the dark card uses `expo-linear-gradient` (locked); header/meta icons use `lucide-react-native` (locked). No new packages.

## Implementation notes
- **Display type**: "RENAN", "Seu progresso", "MINHAS PARTIDAS", "Ranking semanal" use `font-display` + `uppercase`. GERAL/level/XP/scores use `font-num` (Russo One). "Geral"/format pills use `font-mono`/`text-mono`. The "quadra" wordmark / Baloo 2 is **not** used here.
- **Mocks**: keep `queryFn` bodies trivial and deterministic (fixed latency, fixed stub arrays, no randomness), latency overridable to 0 under test — exactly like `src/features/matches/api/getUpcoming.ts`. Mark each `// MOCK:` / `// TODO(real-api):` at the F2.1/F2.2/F2.3/F1.6 swap points behind the unchanged hook signatures. Do not import `EXPO_PUBLIC_API_URL` in these mock files.
- **`isMe` highlight**: derive from `useAuthStore().userId` matched against each ranking row's `playerId` (don't trust a mock `isMe` flag in production — but the mock may set it for convenience; the screen logic should prefer the `userId` match).
- **Result colors**: Vitória → `success`, Derrota → `danger` (DESIGN_SYSTEM semantic tokens), via NativeWind classes — no inline hex.
- **Accessibility**: bell and theme toggle expose `accessibilityRole="button"` + labels even while no-op; each history row and the settings affordance are single accessible `button` targets; the avatar exposes the user's name; empty/error rows use `accessibilityLiveRegion="polite"`; the highlighted ranking row announces "você".
- **No API from the screen** — all three reads go through `src/features/*/api/` hooks (CLAUDE.md rule 6), even mocked. `Avatar`, `LevelBar`, `MatchHistoryRow` receive plain data via props and never fetch.
- Keep the theme toggle a pure no-op (or a `/profile/settings` shortcut). Do **not** introduce dark-mode tokens or a theme store here — gated on DESIGN_SYSTEM adding dark tokens (S10).
- **Performance**: the three lists are small (mocked ≤10). A `ScrollView` + `map` is fine (ARCHITECTURE's `FlatList` threshold is ~10); switch MINHAS PARTIDAS to a `FlatList` only if real F1.6 returns many rows. Avatars via `expo-image` for caching.
