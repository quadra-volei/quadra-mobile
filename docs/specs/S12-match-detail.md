# Screen Spec: S12 — Match Detail

> Revised after scope-guardian REJECTION (round 1) + a round-2 token-note addition. Three round-1 fixes applied (DrawModeCard dropped; Button variants reconciled; Regular-vs-DropIn acceptance criteria) — all confirmed resolved — plus a round-2 note clarifying the opacity-modifier utilities are NativeWind modifiers over already-registered tokens (no new tokens, no change to the three resolved items).

## Origin
- Screen from SCOPE: S12 — Match Detail
- Layer: 1 (Match Core) — F1.2 (read match), F1.3 (teams setup), F1.4 (presence/score reach-through), F1.5 (MVP reach-through), F1.6 (history reach-through)
- Requested by: human (renanortega.dev@gmail.com)

## Reference assets read
- [x] `docs/references/screens/S12-match-detail/partida-visa-paricipante.png` (participant view) — read in full
- [x] `docs/references/screens/S12-match-detail/partida-visao-organizador.png` (organizer view) — read in full

Both PNGs exist on disk and were read. No prototype source exists; the PNGs are the only layout reference.

What `partida-visa-paricipante.png` (participant view) shows, top to bottom:
1. **Dark hero header** (navy `HERO_GRADIENT`) with a back chevron (top-left) and a share icon (top-right); a translucent format mono pill **"6X6"** + a lime **"INTERMEDIÁRIO"** pill; the display title **"RACHA DE DOMINGO"**; a `MapPin` line **"Arena Quadra · 1,2 km"**.
2. **White info card** with a 2×2 metadata grid: **QUANDO** "Hoje · 19h30", **MODO** "6x6", **VAGAS** "6/12", **NÍVEL** "Intermediário"; below it an **organizer row** — avatar + "Organizado por **Érica Moraes**" + a position pill **CENTRAL**.
3. **"CONFIRMADOS 6/12"** — an avatar grid of confirmed players (name under each) plus empty dashed **"vaga"** placeholder slots.
4. **Footer bar** — **"Valor R$ 25"** on the left + a **"Confirmar presença"** gradient CTA on the right.

What `partida-visao-organizador.png` (organizer view) adds/changes:
1. Header is light (not the navy hero): back chevron + **"SUA PARTIDA"** display title.
2. A navy card with a lime **"VOCÊ ORGANIZA"** badge + "Sua partida" + venue/date/format lines.
3. **"CONFIRMADOS · 8"** with a **"Convidar"** outline button (top-right of the section).
4. Avatar grid where each player shows an **OVR 87 / OVR 85 …** label under the name.
5. **"CONFIGURAÇÃO DOS TIMES"** — segmented **"2 times / 3 times / 4 times"** chips (2 times selected).
6. **"Jogadores por time"** — a stepper "− 4 +" with caption "8 confirmados no total".
7. **"COMO SORTEAR OS TIMES"** — two selectable rows: **Manual** ("Você escolhe quem joga em cada time, na mão") selected + **Automático** ("Times equilibrados automaticamente por nível e overall").
8. Footer: **"Montar os times"** gradient CTA.

## Notable divergences from the prototype
SCOPE wins on behavior/in-out; the PNG wins on layout. Each divergence below is per SCOPE S12:

- **Per-player OVR labels (OVR 87 / OVR 85 …) in the organizer avatar grid — NOT included.** SCOPE S12 OUT: "per-player OVR ratings shown in the mockup (Layer 3)". The avatar grid shows avatar + name only, no overall number, in **both** views. (The participant view in the print already omits OVR; the organizer view shows it — the spec drops it everywhere.)
- **Chat — NOT included.** SCOPE S12 OUT ("chat, Layer 3"). No message UI, no chat entry.
- **No tab bar / no "Info | Times | Placar | Resumo" internal tabs.** SCOPE S12 NOTE is explicit: the earlier tab model is **dropped**; S13 (teams), S14 (scoreboard), S16 (summary) are reached as **separate navigated screens** from here, not as tabs. This screen is a single scroll on a stack route (no `(tabs)` bottom bar).
- **Team-setup block lives inside the organizer view (not a separate screen).** Per SCOPE S12, the team count (2/3/4), players-per-team stepper, and draw-mode (Manual/Automático) are **embedded here**; "Montar os times" navigates to **S13**. S13 has no dedicated screenshot — the organizer PNG is its visual reference too (per SCOPE S13).
- **"Convidar" (organizer) opens no inline invite UI in MVP.** SCOPE S11 already established there is no invite flow/route in MVP. Decision (definitive): the "Convidar" button triggers the **system share sheet** via React Native core `Share.share()` (needs no dependency) sharing a match link/text. No new screen, no contact picker, no Layer-3 friend system.

## Mock-first data note (read this first)
S12 reads a match and writes presence/teams. The backend match module (F1.2–F1.6) has **no concrete paths aligned** in quadra-api yet. Following the locked convention (S5–S11: `getNearby.ts`, `getUpcoming.ts`, `createMatch.ts`, `createProfile.ts`), this iteration ships **fully mocked, deterministic, test-friendly** hooks — **no network, no `EXPO_PUBLIC_API_URL` fetch, no asserted backend path**. Each `queryFn`/`mutationFn` resolves a fixed stub after a short fake latency (overridable to 0 under test), marked `// MOCK:` with `// TODO(real-api):` pointing at the relevant F-number, replaceable behind the unchanged hook signatures once the backend lands. The **payload/type shapes are final**; only transport is mocked.

## Goal
Let an authenticated user open a match to see its details (cover, format/level, name, datetime, venue, distance, organizer) and the confirmed-players list with open slots; confirm or decline presence (or join an open drop-in slot); and — if they organize it — invite players, configure teams (count, players-per-team, draw mode), and proceed to build the teams (S13).

## Route
`app/matches/[id].tsx` — replaces the current placeholder (`<Text>Detalhes da Partida</Text>` at `app/matches/[id].tsx:1-9`). Reached via `router.push({ pathname: '/matches/[id]', params: { id } })` from S5 Home cards (`MatchCard` / `MatchCardCompact`), S6 Explore grid, S17 map sheet, and the S11 success CTAs. Presented as a **stack** screen (outside the `(tabs)` group) — **no tab bar** (per SCOPE S12 NOTE). The `id` is read via `useLocalSearchParams<{ id: string }>()`. `headerShown: false` (the header is inlined, matching S11).

## Backend dependencies

> ### ⚠️ Scope override (owner-approved) — same posture as S5–S11
> Per agent rule #10, undefined backend endpoints would normally STOP the spec. The owner (renanortega.dev@gmail.com) has, for the match screens, consciously approved shipping **fully mocked** ahead of backend alignment. S12 follows that locked convention.
> - **(a) Not yet in backend SCOPE:** concrete paths for **F1.2** (match detail), **F1.3** (teams config), **F1.4** (presence confirm/decline/join) are not yet aligned in quadra-api.
> - **(b) Conscious decision:** the owner approves shipping S12's reads + presence writes **fully mocked** this iteration.
> - **(c) Explicit follow-up:** real wiring swaps each mocked `queryFn`/`mutationFn` behind its unchanged hook signature once the backend match module lands. Structured-venue/geo remains the unresolved question (same as S11).

**NONE asserted this iteration — all hooks MOCKED.** No real endpoint path is referenced; no backend behavior is claimed to exist. Mapping to SCOPE F-numbers (for the real swap later):
- **F1.2** → `useMatchDetail(id)` (read the match: header, metadata, organizer, presence list, slots, countdown source).
- **F1.4** → `useConfirmPresence(id)` / `useDeclinePresence(id)` / `useJoinMatch(id)` (presence mutations).
- **F1.3** → `useUpdateTeamConfig(id)` (organizer team count + players-per-team + draw mode); also read for S13.
- **F1.5 / F1.6** → no call on this screen; reached as navigation to S15/S16 from the scoreboard/summary flow.

## No assumed primitives — header / safe-area shell
The catalog (COMPONENTS.md) has **no** `Screen`, `Header`, or `IconButton` component; S5/S8/S11 deliberately inline their shell + header. S12 reuses that **same inline pattern** — no undeclared primitives, no new shell components:
- **Screen shell**: `<View className="flex-1 bg-bg-light">` wrapping `<SafeAreaView edges={['top']} className="flex-1">` (identical to S5/S8/S11).
- **Header actions** (back chevron, share): inline `<Pressable accessibilityRole="button" accessibilityLabel="…">` wrapping a lucide icon colored via `colors.*` — the same pattern S11 uses. No `IconButton` introduced.

## Existing components reused
- `Avatar` (`src/components/ui/Avatar.tsx`) — confirmed-players grid (`size="md"`/`sm`) and the organizer row (`size="sm"`). Catalog note already lists S12 as an intended reuser.
- `Button` (`src/components/ui/Button.tsx`):
  - `variant="primary"` (navy→blue `bg-gradient-primary`) for the **participant affirmative CTAs** — **"Confirmar presença"** and **"Entrar na partida"**. DESIGN_SYSTEM.md uses "Confirmar presença" as the literal canonical example of the `primary` variant, so this is the correct token (the navy→blue gradient, not the blue→lime `grad`).
  - `variant="grad"` (blue→lime `bg-gradient-cta`) reserved for the **organizer forward CTA "Montar os times"** only — DESIGN_SYSTEM lists "Começar partida"/forward-progress CTAs as the `grad` role.
  - `variant="outline"` for "Convidar" (organizer) and the participant secondary "Recusar".
  - `variant="ghost"` where a low-emphasis link is needed (e.g. the "Recusar" link on an already-confirmed row).
- `FilterChip` (`src/components/ui/FilterChip.tsx`) — the **"2 times / 3 times / 4 times"** team-count segmented control (single-select), reusing the exact pattern from S11's FORMATO/NÍVEL groups. Catalog note already lists it as designed for single-select chip groups.
- `StepperField` (`src/components/ui/StepperField.tsx`, shipped by S11) — **"Jogadores por time"** numeric stepper in the organizer team-config block.
- `ToggleField` (`src/components/ui/ToggleField.tsx`, shipped by S11) — provides the **"icon + title + caption on a `bg-white rounded-card border` row"** chrome reused by the Manual/Automático draw-mode rows (see "New components proposed" → why no new component is needed). Used here in its row presentation; for the radio-style single-select the implementer either (a) inlines two small `<Pressable>` rows that mirror `ToggleField`'s exact row layout with a trailing lucide `Check` instead of a `Switch`, or (b) renders the pair as two `ToggleField`s wired as a mutually-exclusive pair. Option (a) is preferred (a radio is semantically single-select, not two booleans).
- `colors` / `HERO_GRADIENT` / `CTA_GRADIENT` (`src/theme/colors.ts`) — runtime color values for lucide icon `color` props (ChevronLeft, Share2, MapPin, Clock, Users, Check, X, UserPlus) and the navy `LinearGradient` of the hero header / dark cards. No inline hex.

> **Opacity-modifier note (token compliance):** the translucent utilities used on this screen — `bg-white/15` (hero format pill), `text-text-on-dark/80` (hero "venue · distance" subtitle), and `bg-primary/5` / `bg-primary/10` (selected draw-mode row highlight / organizer position pill) — are **NativeWind 4 opacity modifiers applied to already-registered DESIGN_SYSTEM color tokens** (`white`, `text-on-dark`, `primary`), **not** raw/sampled values and **not** new tokens. This matches an established, shipped convention in the codebase: `bg-white/15` on a `rounded-pill` format chip in `src/components/domain/MatchCard.tsx:44` (the exact format pill S12 reuses; also `app/index.tsx:96`, `app/(auth)/onboarding.tsx:804`); `text-text-on-dark/80` in `app/matches/create.tsx:51` and `text-text-on-dark/70` in `onboarding.tsx:738,814` (backing the `text-on-dark/NN` idiom); and `bg-primary/10` in `src/components/domain/RankingRow.tsx:65` (asserted in `tests/components/domain/RankingRow.test.tsx:69`), with `bg-primary/20` in `app/(tabs)/profile.tsx:188`. `bg-primary/5` is the **same idiom** as the shipped `bg-primary/10`/`/20`, just a lighter selected-row highlight. No hardcoded hex, no `StyleSheet.create`.

## New components proposed
The catalog has no presence/slot grid. Evaluated against "reuse before create" and the catalog's "extract only when reuse happens" rule:

- `PresenceGrid` — *why nothing fits*: the confirmed-players grid is a wrapping grid of `Avatar` + name with interleaved **dashed empty "vaga" slots** up to capacity, plus a per-player status (Confirmado/Recusado/Pendente). No catalog component renders a capacity-aware avatar+slot grid.
  - Path: `src/components/domain/PresenceGrid.tsx`
  - Props:
    ```ts
    type PresencePlayer = {
      id: string; name: string; avatarUrl?: string;
      status: 'CONFIRMADO' | 'RECUSADO' | 'PENDENTE';
      position?: 'LEV' | 'PON' | 'OPO' | 'CEN' | 'LIB' | 'COR';
    };
    type PresenceGridProps = {
      players: PresencePlayer[];
      capacity: number;        // total slots; empties beyond players.length render as "vaga"
      testID?: string;
    };
    ```
  - Presentational; receives plain data, never fetches. Renders `Avatar` for each player + dashed `View` placeholders for `capacity - confirmedCount` empty slots. **No OVR** (Layer-3 cut).
  - Reused by S13 (team rosters share the avatar+slot idiom) — justifies extraction.

**Draw-mode (Manual / Automático) rows — NO new component.** The earlier `DrawModeCard` proposal is **dropped**. The Manual/Automático pair is a **two-option single-select appearing only on this one screen**, so the catalog's single-use rule ("a component does NOT go here when it's a one-off layout piece for a specific screen") forbids extracting it. Concretely:
- Neither `FilterChip` (a compact `h-9` pill — no room for the title + description copy the rows need) nor a bare extension of it fits the row layout.
- `ToggleField` **already** renders the exact required chrome — a leading icon + title + caption on a `bg-white rounded-card border border-line` row — so the row idiom is **already in the catalog**. The only delta is single-select-radio semantics (a trailing `Check` instead of a `Switch`), which is a one-screen presentational variation, not a reusable abstraction.
- Therefore the two rows are **inlined** on S12 as `<Pressable>` rows mirroring `ToggleField`'s layout (icon + title + caption + trailing `Check` when `selected`, `bg-primary/5` selected highlight), with **no catalog entry**. If S13 later needs the same radio-row, extraction happens then (per "extract only when reuse happens").

**"VOCÊ ORGANIZA" badge + position pill** — rendered **inline**, no new component (single-use; the catalog already foresees a future `PositionBadge`/`Badge` in its backlog — defer extraction):
- Badge: `<View className="bg-accent rounded-pill px-3 py-1"><Text className="font-mono text-mono text-text-primary uppercase">Você organiza</Text></View>`.
- Position pill (light surface) per DESIGN_SYSTEM's position-badge rule: `primary` text/bg; on dark it would be `white`.

`PresenceGrid` is the **only** component the implementer adds to COMPONENTS.md.

## Layout structure

Token references only; NativeWind classes; no hex; no `StyleSheet.create`. Opacity modifiers (`/15`, `/80`, `/5`, `/10`) are NativeWind modifiers over registered tokens — see the opacity-modifier note under "Existing components reused". Two role-conditioned variants share one scroll shell. `isOrganizer` comes from `match.organizerId === useAuthStore.userId`.

```
<View className="flex-1 bg-bg-light">
  <SafeAreaView edges={['top']} className="flex-1">
    <ScrollView contentContainerClassName="pb-32">

      # ── Dark hero header (navy HERO_GRADIENT LinearGradient, rounded-b-card) ──
      <LinearGradient colors={HERO_GRADIENT} className="px-4 pt-2 pb-6 rounded-b-card">
        <View className="flex-row items-center justify-between">
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={router.back}>
            <ChevronLeft color={colors.textOnDark} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Compartilhar partida" onPress={onShare}>
            <Share2 color={colors.textOnDark} />
          </Pressable>
        </View>

        {isOrganizer && (
          <View className="bg-accent rounded-pill px-3 py-1 self-start mt-4">
            <Text className="font-mono text-mono text-text-primary uppercase">Você organiza</Text>
          </View>
        )}

        <View className="flex-row gap-2 mt-4">
          <View className="bg-white/15 rounded-pill px-3 py-1">  {/* /15 = NativeWind opacity modifier over `white` token (cf. MatchCard.tsx:44) */}
            <Text className="font-mono text-mono text-text-on-dark uppercase">{match.format}</Text>
          </View>
          <View className="bg-accent rounded-pill px-3 py-1">
            <Text className="font-mono text-mono text-text-primary uppercase">{levelLabel}</Text>
          </View>
        </View>

        <Text className="font-display text-h1 text-text-on-dark uppercase mt-3">{match.name}</Text>
        <View className="flex-row items-center gap-1 mt-2">
          <MapPin color={colors.textOnDark} size={16} />
          <Text className="font-body text-body text-text-on-dark/80">{match.venue} · {distanceLabel}</Text>  {/* /80 modifier over `text-on-dark` (cf. create.tsx:51) */}
        </View>
      </LinearGradient>

      # ── White info card: 2×2 metadata grid + organizer row ──
      <View className="bg-white rounded-card shadow-card mx-4 -mt-4 p-4">
        <View className="flex-row flex-wrap">
          <MetaCell label="QUANDO" value={whenLabel} />   {/* "Hoje · 19h30" */}
          <MetaCell label="MODO"   value={match.format} />
          <MetaCell label="VAGAS"  value={`${confirmedCount}/${match.capacity}`} />
          <MetaCell label="NÍVEL"  value={levelLabel} />
        </View>
        <View className="h-px bg-line my-4" />
        <View className="flex-row items-center gap-3">
          <Avatar uri={match.organizer.avatarUrl} name={match.organizer.name} size="sm" />
          <View className="flex-1">
            <Text className="text-caption text-text-muted">Organizado por</Text>
            <Text className="text-body-bold text-text-primary">{match.organizer.name}</Text>
          </View>
          {match.organizer.position && (
            <View className="bg-primary/10 rounded-pill px-3 py-1">  {/* /10 modifier over `primary` (cf. RankingRow.tsx:65) */}
              <Text className="font-mono text-mono text-primary uppercase">{positionLabel}</Text>
            </View>
          )}
        </View>
      </View>

      # ── Countdown strip (game start OR confirmation-window close) ──
      <View className="mx-4 mt-4">
        <Text className="text-caption text-text-muted text-center">{countdownLabel}</Text>
        {/* "Começa em 2h 14min" OR "Confirmações fecham em 1h 30min" — pure formatter */}
      </View>

      # ── CONFIRMADOS section ──
      <View className="mx-4 mt-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-eyebrow text-text-primary">CONFIRMADOS · {confirmedCount}/{match.capacity}</Text>
          {isOrganizer && (
            <Button variant="outline" onPress={onShare} leftIcon={<UserPlus color={colors.primary} size={18} />}>
              Convidar
            </Button>
          )}
        </View>
        <PresenceGrid players={match.players} capacity={match.capacity} testID="presence-grid" />
      </View>

      # ── Organizer-only: team configuration (→ S13) ──
      {isOrganizer && (
        <View className="mx-4 mt-8">
          <Text className="text-eyebrow text-text-primary">CONFIGURAÇÃO DOS TIMES</Text>
          <View className="flex-row gap-2 mt-2">
            <FilterChip label="2 times" selected={teamCount===2} onPress={() => setTeamCount(2)} />
            <FilterChip label="3 times" selected={teamCount===3} onPress={() => setTeamCount(3)} />
            <FilterChip label="4 times" selected={teamCount===4} onPress={() => setTeamCount(4)} />
          </View>

          <StepperField label="Jogadores por time" value={perTeam} onChange={setPerTeam} min={1}
                        testID="per-team-stepper" />
          <Text className="text-caption text-text-muted mt-1">{confirmedCount} confirmados no total</Text>

          <Text className="text-eyebrow text-text-primary mt-6">COMO SORTEAR OS TIMES</Text>
          {/* Inlined radio rows mirroring ToggleField's chrome (icon + title + caption on a
              bg-white rounded-card border row), with a trailing Check when selected. NO new component.
              bg-primary/5 = NativeWind opacity modifier over `primary` (same idiom as the shipped bg-primary/10,/20). */}
          <Pressable accessibilityRole="radio" accessibilityState={{ checked: drawMode==='MANUAL' }}
                     onPress={() => setDrawMode('MANUAL')}
                     className={`flex-row items-center gap-3 bg-white rounded-card border p-4 mt-2 ${drawMode==='MANUAL' ? 'border-primary bg-primary/5' : 'border-line'}`}>
            <Hand color={colors.primary} />
            <View className="flex-1">
              <Text className="text-h3 text-text-primary">Manual</Text>
              <Text className="text-caption text-text-muted">Você escolhe quem joga em cada time, na mão</Text>
            </View>
            {drawMode==='MANUAL' && <Check color={colors.primary} />}
          </Pressable>
          <Pressable accessibilityRole="radio" accessibilityState={{ checked: drawMode==='AUTO' }}
                     onPress={() => setDrawMode('AUTO')}
                     className={`flex-row items-center gap-3 bg-white rounded-card border p-4 mt-2 ${drawMode==='AUTO' ? 'border-primary bg-primary/5' : 'border-line'}`}>
            <Wand2 color={colors.primary} />
            <View className="flex-1">
              <Text className="text-h3 text-text-primary">Automático</Text>
              <Text className="text-caption text-text-muted">Times equilibrados automaticamente por nível e overall</Text>
            </View>
            {drawMode==='AUTO' && <Check color={colors.primary} />}
          </Pressable>
        </View>
      )}
    </ScrollView>

    # ── Fixed footer (absolute, above safe-area inset) ──
    <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-line px-4 pt-3 pb-6">
      {isOrganizer ? (
        # Organizer forward CTA → grad (blue→lime)
        <Button variant="grad" onPress={goToTeams} testID="build-teams">Montar os times</Button>
      ) : (
        <View className="flex-row items-center gap-3">
          <View>
            <Text className="text-caption text-text-muted">Valor</Text>
            <Text className="font-num text-h3 text-text-primary">{match.priceLabel}</Text>
          </View>
          {participantCta /* see "Footer CTA logic" below — affirmative CTAs are variant="primary" */}
        </View>
      )}
    </View>
  </SafeAreaView>
</View>
```

`MetaCell` is a tiny inline `<View className="w-1/2 mb-3">` with an eyebrow label + value — inlined, not extracted (single-use, per catalog rule).

### Footer CTA logic (participant, SCOPE-driven)
Per SCOPE S12: confirm/decline for the current user **if Regular** (invited); **Join** if there are **DropIn** slots open **and** the confirmation window is **closed**. Variant mapping reconciled per DESIGN_SYSTEM ("Confirmar presença" = the canonical `primary` example):
- **Invited Regular participant**, `myStatus === 'PENDENTE'` (window open) → **"Confirmar presença"** (`variant="primary"`, navy→blue) + a secondary **"Recusar"** (`variant="outline"`).
- **Invited Regular participant**, `myStatus === 'CONFIRMADO'` → a confirmed pill ("Presença confirmada", lime) + a low-emphasis "Recusar" (`variant="ghost"`).
- **Invited Regular participant**, `myStatus === 'RECUSADO'` → **"Confirmar presença"** (`variant="primary"`) re-enabled.
- **Not a Regular participant AND open DropIn slots exist AND the confirmation window is closed** → **"Entrar na partida"** (`variant="primary"`, navy→blue affirmative, calls `useJoinMatch`).
- Not a participant and (no open slots **or** window still open) → disabled "Partida cheia" / "Aguarde a janela de confirmação" state (no actionable CTA).

> `variant="grad"` is NOT used for any participant affirmative CTA — it is reserved for the organizer "Montar os times" forward CTA. The dark hero/cards use navy `HERO_GRADIENT` + `text-on-dark`; the lime `bg-accent` "VOCÊ ORGANIZA" badge; display title in `font-display` + `uppercase`; scores/values in `font-num`; chips/tags in `font-mono`/`text-mono`. Tokens only — NO inline hex; NO `StyleSheet.create`. Translucent surfaces use NativeWind opacity modifiers over registered tokens (see the opacity-modifier note).

## State

### Server state (TanStack Query hooks)
- `useMatchDetail(id)` — `src/features/matches/api/getMatchDetail.ts` (**MOCK**; F1.2 later). `useQuery` keyed `['matches', id, 'detail']`, fixed-latency stub returning the full match shape (header, metadata, organizer, players[], capacity, priceLabel, `myStatus`, `myParticipationType` ('REGULAR' | 'DROPIN' | null), confirmation window timestamps + `confirmationWindowClosed` flag, open DropIn slot count, teamConfig). `// MOCK:` / `// TODO(real-api):` F1.2.
- `useConfirmPresence(id)` / `useDeclinePresence(id)` / `useJoinMatch(id)` — `src/features/matches/api/presence.ts` (**MOCK**; F1.4 later). `useMutation`s; on success `queryClient.invalidateQueries({ queryKey: ['matches', id, 'detail'] })` (and `['matches']` so Home lists refresh).
- `useUpdateTeamConfig(id)` — `src/features/matches/api/updateTeamConfig.ts` (**MOCK**; F1.3 later). Persists `{ teamCount, perTeam, drawMode }`; invalidates the detail query. (Optional this iteration: the config may live in local state and be passed to S13 via params; if so, defer this hook — see Implementation notes.)

> No mock imports `EXPO_PUBLIC_API_URL`. All `queryFn`/`mutationFn` are deterministic with latency overridable to 0 under test (mirroring `getNearby.ts` / `createMatch.ts`).

### Client state (Zustand)
- `useAuthStore` (`src/stores/auth.ts`, exists) — read-only; `userId` determines `isOrganizer` (`match.organizerId === userId`); `myStatus` + `myParticipationType` are read from the match payload for the current user. No new store.

### Local state (organizer team-config, ephemeral)
- `teamCount: 2 | 3 | 4` — default from `match.teamConfig.teamCount` (or 2).
- `perTeam: number` — default from `match.teamConfig.perTeam` (or derived from format).
- `drawMode: 'MANUAL' | 'AUTO'` — default `'MANUAL'` (per the print's selected row).

> These are plain `useState` ephemeral UI state (not API data) until "Montar os times" is pressed, at which point they're either persisted via `useUpdateTeamConfig` or passed to S13 as params. Not RHF (no form, no validation).

### Forms (if any)
- **None** — S12 has no form (presence is button-driven; team-config is chips/stepper/radio rows, not validated input).

## Navigation triggers
- Back chevron → `router.back()`.
- "Montar os times" (organizer) → `router.push({ pathname: '/matches/[id]/teams', params: { id, teamCount, perTeam, drawMode } })` (**S13**).
  - ⚠️ **Route gap**: `app/matches/[id]/teams.tsx` (S13) does not exist yet and is not in ARCHITECTURE's route tree. S13 is a separate SCOPE screen with its own spec; this spec **references** the S13 route but does not create it. The implementer must confirm the S13 route name with the S13 spec before wiring (kept as `/matches/[id]/teams` here to match the `[id]/mvp-vote` sibling convention).
- Tapping a confirmed player avatar → **no navigation** (no player-profile screen in MVP; player search is Layer 3). Avatars are display-only.
- "Convidar" (organizer) / share icon → `Share.share({ message, url })` (system share sheet) — not a navigation.

> **Typed-routes note:** `typedRoutes: true`. Typed hrefs; groups transparent (`/matches/[id]`, `/matches/[id]/teams`). All hrefs must pass `npm run typecheck`. No legacy `navigation.navigate`.

## Permissions / external integrations
- **System share** via React Native core `Share.share()` (no dependency, no permission). Used by the organizer "Convidar" + the hero share icon. Shares a match link/text. No contact picker, no `expo-sharing` (not in locked stack), no Layer-3 invite system.
- No location permission (distance comes from the match payload, computed upstream). No camera/image picker on this screen.

## Real-time subscriptions (if any)
- **None on this screen.** Live score (SignalR) belongs to **S14** (scoreboard), reached as a separate screen. Presence updates here are refreshed via TanStack Query invalidation after the user's own mutation, not via a live subscription (no SCOPE requirement for live presence on S12).

## Loading / error / empty states
- **Loading**: while `useMatchDetail` is pending, render a lightweight skeleton (hero block + card + grid placeholders using `bg-bg-light-alt` shapes). DESIGN_SYSTEM lists skeleton shapes as "not yet specified" → use neutral `bg-bg-light-alt` blocks (no new token), consistent with prior screens' loading treatment.
- **Error**: "Não foi possível carregar a partida." centered, with a "Tentar de novo" `outline` button calling `refetch()`. No toast primitive.
- **Empty**: N/A for the screen as a whole (a match always exists if the id resolves); the presence grid renders its own empty-slot "vaga" placeholders when `confirmedCount < capacity` (this is the normal state, not an error/empty screen).
- **Mutation loading**: the footer CTA shows `Button loading` (ActivityIndicator, press disabled) during confirm/decline/join.

## Acceptance criteria
- [ ] The screen reads `id` from `useLocalSearchParams` and renders via `useMatchDetail(id)` (mocked); a loading skeleton shows while pending and an error state with retry shows on failure.
- [ ] The hero header shows the back chevron (`accessibilityLabel="Voltar"` → `router.back()`), the share icon, the format mono pill, the level lime pill, the match name (`font-display`, uppercase), and the "venue · distance" line.
- [ ] The white info card shows the QUANDO / MODO / VAGAS / NÍVEL grid and the "Organizado por {name}" row with the organizer's avatar and (when present) a position pill — colored `primary` on the light card per DESIGN_SYSTEM's position-badge rule.
- [ ] The confirmed-players grid (`PresenceGrid`) shows one `Avatar` + name per confirmed player and dashed "vaga" placeholders for the remaining `capacity - confirmedCount` slots; the section header reads "CONFIRMADOS · N/M".
- [ ] **No per-player OVR number is rendered anywhere** (Layer-3 cut), in either the participant or organizer view.
- [ ] A countdown line renders **"countdown to game start OR confirmation window close"** (SCOPE S12 wording): when the confirmation window is still open it shows the time until the window closes (e.g. "Confirmações fecham em …"), and when the window is closed it shows the time until game start (e.g. "Começa em …"). Both branches are required and asserted via a pure formatter over the payload timestamps (a fixed "now" is injected so the string is deterministic).
- [ ] **Participant confirm/decline is shown only when the current user is an invited Regular participant** (`myParticipationType === 'REGULAR'`), not merely because `myStatus` is Pendente/Recusado. For a Regular participant with `myStatus` Pendente/Recusado, **"Confirmar presença"** (`Button variant="primary"`, navy→blue) is shown and tapping it calls `useConfirmPresence` (mocked), shows the loading state, and invalidates the match detail query; **"Recusar"** calls `useDeclinePresence`. A user who is not a Regular participant is **not** shown confirm/decline.
- [ ] **Participant DropIn join** ("Entrar na partida", `Button variant="primary"`) is shown **only when the user is NOT a Regular participant AND open DropIn slots exist AND the confirmation window is closed** (SCOPE S12 verbatim). When any of those three conditions is false, the join CTA is **not** shown; tapping it (when shown) calls `useJoinMatch` (mocked) and invalidates the detail query.
- [ ] **`Button variant="grad"` is used only for the organizer "Montar os times" CTA**; the participant affirmative CTAs ("Confirmar presença" / "Entrar na partida") use `variant="primary"`. (Verifiable via the rendered variant/testID.)
- [ ] **Organizer view** (`match.organizerId === useAuthStore.userId`): the "VOCÊ ORGANIZA" badge, the "Convidar" button, and the team-config block (2/3/4 times chips, "Jogadores por time" stepper with "N confirmados no total" caption, Manual/Automático radio rows) are shown; the participant footer CTA is replaced by "Montar os times" (`variant="grad"`).
- [ ] Team-count chips are single-select (default 2); the players-per-team stepper enforces its min; the draw-mode rows are single-select (default Manual) and expose `accessibilityRole="radio"` + `accessibilityState={{ checked }}`.
- [ ] "Montar os times" navigates to S13 (`/matches/[id]/teams`) carrying `{ id, teamCount, perTeam, drawMode }`.
- [ ] The "Convidar" button and the hero share icon invoke `Share.share` (mocked at the module boundary) — no navigation, no contact picker.
- [ ] Confirmed-player avatars are display-only (no navigation on tap).
- [ ] No bottom tab bar is shown (stack screen); the screen is a single scroll with a fixed footer.
- [ ] No chat UI is present.
- [ ] All criteria are verifiable via RNTL against the mocked hooks (no MSW / no network), mocked `Share`, and mocked navigation/params.

## Out of scope (be explicit)
- **Per-player OVR ratings** (shown in the organizer print) — Layer 3 (SCOPE S12 OUT).
- **Chat** — Layer 3 (SCOPE S12 OUT).
- **Internal "Info | Times | Placar | Resumo" tabs** — dropped per SCOPE S12 NOTE; S13/S14/S16 are separate navigated screens.
- **Inline player invitation / contact picker / friend system** — not in MVP (SCOPE S11/S12); "Convidar" uses the system share sheet only.
- **Player profile navigation** from avatars — no player screen in MVP (player search is Layer 3).
- **Live presence subscription** — not required by SCOPE S12; live updates belong to S14 (scoreboard) via SignalR.
- **Real F1.2–F1.4 wiring** — reads + presence + team-config are mocked; the human wires real endpoints later behind the unchanged hook signatures (blocked by the same backend-alignment / structured-venue question as S11).
- **The actual team-building / drag-to-swap / draw execution** — that is S13 (this screen only configures and navigates).

## Files to create
- `app/matches/[id].tsx` — replace the placeholder with the screen (the file exists as a placeholder; this is a modify-in-place — listed here as the primary screen artifact).
- `src/features/matches/api/getMatchDetail.ts` — `useMatchDetail(id)` query hook (**MOCK** `queryFn`, `// TODO(real-api):` F1.2). Final `MatchDetail` type.
- `src/features/matches/api/presence.ts` — `useConfirmPresence` / `useDeclinePresence` / `useJoinMatch` mutation hooks (**MOCK**, `// TODO(real-api):` F1.4).
- `src/features/matches/api/updateTeamConfig.ts` — `useUpdateTeamConfig(id)` mutation hook (**MOCK**, `// TODO(real-api):` F1.3) — **or** defer if team-config is passed to S13 via params (see Implementation notes).
- `src/features/matches/types/matchDetail.ts` — `MatchDetail`, `PresencePlayer`, `PresenceStatus`, `ParticipationType` ('REGULAR' | 'DROPIN'), `TeamConfig`, `DrawMode` types (reuse `MatchFormat` + `LEVELS`; no `any`).
- `src/components/domain/PresenceGrid.tsx` — the **only** new component.

> The Manual/Automático draw-mode rows are **inlined** in `app/matches/[id].tsx` (no new file). No `DrawModeCard` file is created.

## Files to modify
- `app/matches/[id].tsx` — replace the placeholder with the screen (same file as "create"; in-place replacement of the stub).
- `docs/COMPONENTS.md` — add **only** `PresenceGrid`; note that `FilterChip` now also serves S12's team-count group, `StepperField` serves S12's "Jogadores por time", and `ToggleField`'s row chrome informs S12's inlined draw-mode rows (no API change to any of the three; no `DrawModeCard` entry).

## New npm dependencies
- **NONE — no stack change.** Reads/mutations via `@tanstack/react-query` (locked). Gradients via `expo-linear-gradient`, images via `expo-image` (locked, used by `Avatar`). Icons via `lucide-react-native` (locked). Share via React Native core `Share` (no package). No new design token (team-count chips reuse `FilterChip`; draw-mode rows reuse the existing row chrome; translucent surfaces use NativeWind opacity modifiers over registered tokens).

## Implementation notes
- **Role split**: compute `isOrganizer = match.organizerId === useAuthStore((s) => s.userId)` once; gate the team-config block, the "VOCÊ ORGANIZA" badge, the "Convidar" button, and the footer CTA on it. `myStatus` + `myParticipationType` for the participant footer come from the match payload.
- **Button variants (token-correct)**: participant affirmative CTAs ("Confirmar presença" / "Entrar na partida") are `variant="primary"` (navy→blue `bg-gradient-primary`) — DESIGN_SYSTEM's canonical `primary` example is literally "Confirmar presença". `variant="grad"` (blue→lime) is reserved for the organizer forward CTA "Montar os times". Do not mix these up.
- **Opacity modifiers**: `bg-white/15`, `text-text-on-dark/80`, `bg-primary/5`, `bg-primary/10` are NativeWind 4 opacity modifiers over registered DESIGN_SYSTEM tokens (`white`, `text-on-dark`, `primary`) — established convention (`MatchCard.tsx:44`, `RankingRow.tsx:65`, `onboarding.tsx`, `create.tsx:51`). Do NOT replace them with raw `rgba()` / hex; do NOT add new tokens. `bg-primary/5` is the lighter sibling of the shipped `bg-primary/10`/`/20`.
- **Regular vs DropIn gating**: drive the footer purely off `myParticipationType` + `myStatus` + `confirmationWindowClosed` + open-slot count from the payload — confirm/decline only for `REGULAR`; join only for non-Regular AND open DropIn slots AND closed window. Keep these as explicit booleans so RNTL can assert each branch.
- **Draw-mode rows — inlined, no component**: two `<Pressable>` rows mirroring `ToggleField`'s chrome (icon + title + caption on a `bg-white rounded-card border` row) with a trailing lucide `Check` + `bg-primary/5` + `border-primary` when selected; `accessibilityRole="radio"` + `accessibilityState={{ checked }}`; single-select (`drawMode` state). No `DrawModeCard` file, no catalog entry (single-use; extract only if S13 reuses it).
- **Team-config destination**: prefer passing `{ teamCount, perTeam, drawMode }` to S13 via route params (no persistence needed before the teams are built) to avoid a premature F1.3 write; only ship `useUpdateTeamConfig` if S13's spec requires the config pre-persisted. Document the chosen path in the implementation PR.
- **Share seam**: `jest.mock` React Native `Share` and assert `Share.share` is called with a message containing the match name/id. No OS side-effect asserted.
- **Countdown**: render from a pure formatter over the payload timestamps (confirmation-window close timestamp and match-start timestamp). Inject a fixed "now" so RNTL asserts both branches ("fecham em …" while open, "começa em …" once closed) deterministically. A live-ticking timer is optional polish, not required by SCOPE.
- **PresenceGrid**: render `capacity` cells; the first `confirmedCount` are `Avatar` + name, the rest are dashed `border-line` "vaga" placeholders. Presentational — no fetching, no OVR.
- **Position-badge color**: the organizer-row position pill sits on the **light** white card → `primary` per DESIGN_SYSTEM; on the dark hero it would be `white`. No per-position colors.
- **No assumed primitives**: header/footer are inline `<View>`/`<Pressable>` + lucide, matching S5/S8/S11; no `Screen`/`Header`/`IconButton`.
- **Display type**: match name uses `font-display` + `uppercase`; section labels `text-eyebrow`; values/prices `font-num`; chips/pills `font-mono`/`text-mono`.
- **No API from the screen** — all reads/writes go through `src/features/matches/api/*` (CLAUDE.md rule 6), even mocked.
- **Performance**: the presence grid is small (≤ capacity, typically ≤ 12) → a wrapping `View` grid is fine; no `FlatList` needed (below the ~10 threshold for a horizontally-wrapping fixed grid).
- **Accessibility**: back/share/Convidar `Pressable`s expose `accessibilityRole="button"` + labels; team-count chips expose `accessibilityState={{ selected }}`; draw-mode rows expose `accessibilityRole="radio"` + `accessibilityState={{ checked }}`; the footer CTA announces its action; the loading state uses `accessibilityState={{ busy }}` (Button already does).
