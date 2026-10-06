# Screen Spec: S16 — Match Summary

## Origin
- Screen from SCOPE: S16 — Match Summary
- Layer: 1 (Match Core) — F1.6 (match history/summary read)
- Requested by: renanortega.dev@gmail.com (owner)

## Reference assets read
- [x] `docs/references/screens/S16-match-summary/partida-resumo.png` (summary — result header, final score, per-set pills, MVP card + vote ranking, "MEU DESEMPENHO" block, bottom CTA)
- [x] `docs/references/screens/S16-match-summary/partida-encerrar-estatisticas.png` (post-game per-player self-reported stats input — Pontos/Blocks/Defesas/Aces steppers)

Both PNGs exist on disk and were read. No prototype source code; the PNGs are the only layout reference.

## Notable divergences from the prototype
- **`partida-encerrar-estatisticas.png` (entire screen) — NOT built.** It is a per-player self-reported stats input (Pontos/Blocks/Defesas/Aces with `−`/`+` steppers + "Confirmar estatísticas" CTA). SCOPE S16 default decision is **keep OUT** — this feeds Layer-3 ratings and directly contradicts the "Editable advanced stats (ACE/BLK/ATA/DEF input)" item in the SCOPE "What is NOT in MVP" list. No route, no screen, no hook is created for it. (Flip only if PM explicitly moves self-reported stats into MVP — not assumed here.)
- **"MEU DESEMPENHO" block on `partida-resumo.png` — INCLUDED (display-only).** Decision flipped by PM 2026-07-04. Renders the lower half of the summary screenshot: the "XP ganho nesta partida +24" card and the four stat tiles (Pontos / Blocks / Defesas / Aces). Values are **read-only**, fed by the (server-computed) `summary.myPerformance` — there is no self-reported input (the `partida-encerrar-estatisticas.png` stepper screen above stays OUT).
- **Bottom CTA.** The bottom "Voltar para o perfil" gradient CTA is the screen's primary action (kept as-is; it closes the match flow and returns to Profile/S8).
- **Per-set count in the score row is data-driven, not fixed at 4.** The prototype shows a 3–1 win over 4 set pills; the layout renders exactly `setScores.length` pills.
- **Team compositions & match duration — NOT shown** (SCOPE S16 OUT; also absent from the mockup).
- **Generated shareable image — NOT built.** SCOPE S16 OUT ("generated shareable image (post-MVP)"). The share button opens the OS share sheet with text only.

## Goal
After a match ends and MVP voting concludes, show the read-only match result: format + Vitória/Derrota, final set score with per-set breakdown, the most-voted MVP, and the vote ranking — with a system share action and a CTA back to the profile.

## Route
`app/matches/[id]/summary.tsx` — a separate nested stack screen under the match stack (matching the S15 `app/matches/[id]/mvp-vote.tsx` precedent). Not a tab. `headerShown: false` (header inlined, matching S12/S14/S15). `id` read via `useLocalSearchParams<{ id: string }>()`.

**Route params:**
- `id: string` — match id (from parent route)

**How it is reached:**
- Per SCOPE S12 NOTE, S16 is a separately navigated screen from the match flow (not a tab).
- Natural runtime flow: S15 (MVP vote, post-vote state) → S16. S15's spec leaves the S15→S16 transition "TBD with backend"; this spec assumes the entry point is `router.replace({ pathname: '/matches/[id]/summary', params: { id } })` once voting resolves. It is also directly linkable from S12/S8 match-history for a concluded match.

## Backend dependencies

> ### ⚠️ Scope override (owner-approved) — same posture as S5–S15
> Per agent rule #10, undefined backend endpoints would normally STOP the spec. The owner (renanortega.dev@gmail.com) has, for the match screens, consciously approved shipping **fully mocked** ahead of backend alignment. S16 follows that locked convention.
> - **(a) Not yet in backend SCOPE:** a concrete path for **F1.6** (match summary/result read) is not yet aligned in quadra-api.
> - **(b) Conscious decision:** the owner approves shipping S16's summary read **fully mocked** this iteration.
> - **(c) Explicit follow-up:** real wiring swaps the mocked `queryFn` behind its unchanged hook signature once the backend match module lands.

**NONE asserted this iteration — the summary hook is MOCKED.** No real endpoint path is referenced; no backend behavior is claimed to exist. Mapping to SCOPE F-numbers (for the real swap later):
- **F1.6 (read match summary)** → `useMatchSummary(matchId)` — `src/features/matches/api/getMatchSummary.ts` — returns result, final score, per-set scores, MVP + vote ranking.
  - Real endpoint (later): `GET /api/v1/matches/{matchId}/summary` → `MatchSummary`.

## Existing components reused
- `Avatar` (`src/components/ui/Avatar.tsx`) — MVP highlight card avatar (`size="lg"`) and vote-ranking row avatars (`size="sm"`). Catalog lists it as designed for reuse by S12/S15; S16 extends that.
- `Button` (`src/components/ui/Button.tsx`):
  - `variant="grad"` (blue→lime `bg-gradient-cta`) for the bottom **"Voltar para o perfil"** primary CTA (main action of the screen).

## New components proposed
**NONE.**
- **Share button**: inlined `<Pressable>` with a lucide `Share2` icon in the header (same inline-icon-button idiom S14/S15 use for the back chevron). No `IconButton` primitive exists in the catalog and none is warranted for a single-screen use.
- **Result header, per-set pills, MVP highlight card, and vote-ranking bars** are one-off compositions for this screen (`<View>`/`<Text>`/`<Pressable>` + NativeWind + reused `Avatar`). Per the COMPONENTS.md decision log, these are inlined (single screen, no ≥2-screen reuse case). `LevelBar` is NOT reused for the vote bars — its semantics (Level/XP labels) don't fit vote counts; the vote bar is a plain track+fill `View` with the fill width as the sole inline style (runtime %, same escape hatch `LevelBar` documents).

## Layout structure

Dark hero screen (navy), light copy — the "dark hero for key data moments" pattern from DESIGN_SYSTEM.

```
<Screen className="flex-1 bg-surface-dark">
  <SafeAreaView edges={['top']} className="flex-1">

    {/* Header: back + title + share */}
    <View className="flex-row items-center justify-between px-4 py-3">
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
        <ChevronLeft size={24} color={colors.textOnDark} />
      </Pressable>
      <Text className="text-body-bold text-text-on-dark">Resumo da partida</Text>
      <Pressable onPress={onShare} accessibilityRole="button" accessibilityLabel="Compartilhar resumo">
        <Share2 size={22} color={colors.textOnDark} />
      </Pressable>
    </View>

    <ScrollView className="flex-1" contentContainerClassName="pb-6">

      {/* Result header */}
      <View className="items-center px-4 pt-2">
        <View className="flex-row items-center gap-2 mb-3">
          {/* format mono pill */}
          <View className="bg-white/10 rounded-pill px-3 py-1">
            <Text className="text-mono text-text-on-dark uppercase">{summary.format}</Text>
          </View>
          {/* Vitória / Derrota pill — accent(lime) for win, danger for loss */}
          <View className={summary.result === 'VITORIA' ? 'bg-accent rounded-pill px-3 py-1' : 'bg-danger rounded-pill px-3 py-1'}>
            <Text className={summary.result === 'VITORIA' ? 'text-mono text-text-primary uppercase' : 'text-mono text-text-on-dark uppercase'}>
              {summary.result === 'VITORIA' ? 'Vitória' : 'Derrota'}
            </Text>
          </View>
        </View>

        <Text className="text-display text-text-on-dark uppercase font-display text-center">{summary.name}</Text>

        <View className="flex-row items-center gap-1 mt-2">
          <MapPin size={14} color={colors.textMuted} />
          <Text className="text-caption text-text-muted">{summary.venue} · {summary.dateLabel}</Text>
        </View>

        {/* Final set score */}
        <Text className="font-num text-accent mt-4" style={{ fontSize: 56 }}>
          {summary.finalScore[0]}–{summary.finalScore[1]}
        </Text>

        {/* Per-set pills — exactly summary.setScores.length */}
        <View className="flex-row flex-wrap justify-center gap-2 mt-4">
          {summary.setScores.map((s, i) => (
            <View key={i} className="bg-white/10 rounded-chip px-3 py-1">
              <Text className="font-num text-text-on-dark text-caption">{s[0]}-{s[1]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* MVP MAIS VOTADO */}
      <View className="px-4 mt-8">
        <View className="flex-row items-center gap-2 mb-3">
          <Trophy size={16} color={colors.accent} />
          <Text className="text-eyebrow text-accent uppercase">MVP mais votado</Text>
        </View>

        {/* Highlighted MVP card */}
        <View className="flex-row items-center gap-4 p-4 rounded-card border-2 border-accent bg-white/5">
          <Avatar uri={summary.mvp.avatarUrl} name={summary.mvp.name} size="lg" />
          <View className="flex-1">
            <Text className="text-h3 text-text-on-dark">{summary.mvp.name}</Text>
            <Text className="text-caption text-text-muted">@{summary.mvp.handle} · {summary.mvp.position}</Text>
            <Text className="font-num text-text-on-dark mt-1">
              {summary.mvp.votes} <Text className="text-caption text-text-muted">de {summary.totalVotes} votos</Text>
            </Text>
          </View>
        </View>

        {/* Vote ranking (top-voted rows) */}
        <View className="mt-4 gap-3">
          {summary.voteRanking.map((row, i) => (
            <View key={row.id} className="flex-row items-center gap-3">
              <Text className="font-num text-text-muted w-4">{i + 1}</Text>
              <Avatar uri={row.avatarUrl} name={row.name} size="sm" />
              <View className="flex-1">
                <Text className="text-body-bold text-text-on-dark">{row.name}</Text>
                {/* vote bar: track + lime fill; fill width is the only inline style (runtime %) */}
                <View className="h-2 rounded-pill bg-white/10 mt-1">
                  <View className="h-2 rounded-pill bg-accent" style={{ width: `${(row.votes / summary.maxVotes) * 100}%` }} />
                </View>
              </View>
              <Text className="font-num text-text-on-dark">{row.votes}</Text>
            </View>
          ))}
        </View>
      </View>

    </ScrollView>

    {/* Bottom CTA */}
    <View className="px-4 pb-4">
      <Button variant="grad" onPress={onBackToProfile} testID="summary-back-to-profile">
        Voltar para o perfil
      </Button>
    </View>

  </SafeAreaView>
</Screen>
```

**Design tokens used:** `surface-dark` (bg), `text-on-dark` / `text-muted` (copy), `accent` (lime — win pill, MVP border, vote-bar fill, MVP number accent, Trophy), `danger` (loss pill), `text-primary` (label on lime pill). Typography: `text-display` (Climate Crisis, uppercase — match name), `font-num` (Russo One — scores, set pills, vote counts), `text-eyebrow` / `text-mono` (labels/pills), `text-h3` / `text-body-bold` / `text-caption`. Radius `rounded-card` / `rounded-chip` / `rounded-pill`. All via NativeWind — no hardcoded hex (icon colors from `src/theme/colors.ts`).

## State

### Server state (TanStack Query hooks)
- `useMatchSummary(matchId)` — `src/features/matches/api/getMatchSummary.ts` — returns the full `MatchSummary` (result, final score, per-set scores, MVP, vote ranking). Mocked this iteration; real endpoint is F1.6. Query key `['matches', matchId, 'summary']`.

### Client state (Zustand)
- `useAuthStore` (existing, `src/stores/auth.ts`) — only to resolve the current user id (for "· você" highlighting in the vote ranking, if a row is the current user). No writes.

### Local state (component useState)
- `isSharing: boolean` — guards the share invocation against double-tap. That is the only local state.

### Forms (if any)
- **NONE.** This is a read-only summary. No inputs (the per-player stats form from `partida-encerrar-estatisticas.png` is OUT — see divergences).

## Navigation triggers
- **Back chevron** → `router.back()`.
- **Share button** → opens the OS share sheet via React Native core `Share.share({ message })` (text only; no image). No navigation.
- **"Voltar para o perfil"** → `router.replace('/(tabs)/profile')` — resets out of the match stack back to Profile (S8), ending the match flow so the summary isn't re-reachable via back.

## Permissions / external integrations
- **NONE.** The OS share sheet (`Share` from `react-native` core) requires no permission and is already in the locked stack (part of `react-native`). No `expo-sharing`, no image generation.

## Real-time subscriptions (if any)
- **NONE.** The match is over; the summary is a static read. (Live vote-count streaming during voting is S15/post-MVP, not here.)

## Loading / error / empty states
- **Loading:** while `useMatchSummary` is pending — skeleton placeholders: a shimmer block where the score sits, a placeholder MVP card (`h-24 rounded-card bg-white/10` pulse), and 3 placeholder ranking rows.
- **Error:** if the summary read fails — centered **"Não foi possível carregar o resumo"** + a **"Tentar novamente"** button → `queryClient.invalidateQueries(['matches', matchId, 'summary'])`.
- **Empty (edge):** if `voteRanking` is empty (no MVP votes were cast) — hide the "MVP mais votado" section entirely and show a muted **"Sem votação de MVP nesta partida"** caption in its place. The result header + score always render.

## Acceptance criteria
- [ ] Header shows back chevron, "Resumo da partida" title, and a share icon button
- [ ] Result header shows a format pill (e.g. "6X6") and a Vitória/Derrota pill (Vitória = lime `accent`, Derrota = `danger`)
- [ ] Match name renders in Climate Crisis uppercase (`text-display`)
- [ ] "Venue · date" line renders with a MapPin icon (`text-muted`)
- [ ] Final set score renders large in `font-num` (e.g. "3–1")
- [ ] Per-set score pills render exactly `setScores.length` items (e.g. 25-19, 23-25, 25-21, 25-18)
- [ ] "MVP MAIS VOTADO" section shows the top-voted player in a lime-bordered highlight card with avatar, name, @handle · position, and "N de M votos"
- [ ] Vote ranking lists top-voted players with position number, avatar, name, a proportional lime vote bar, and vote count
- [ ] Share button opens the OS share sheet (text only) via `Share.share`
- [ ] "MEU DESEMPENHO" block renders the read-only XP-gained card + Pontos/Blocks/Defesas/Aces stat tiles from `summary.myPerformance`
- [ ] No per-player stats **input** screen/form (steppers) is reachable from S16 — the block is display-only
- [ ] "Voltar para o perfil" navigates to the Profile tab (S8) and resets the match stack
- [ ] Summary loads via `useMatchSummary(matchId)` (mocked)
- [ ] Loading shows skeletons; load failure shows a recoverable error with "Tentar novamente"
- [ ] Accessibility: back/share/CTA expose `accessibilityRole="button"` + labels; the result is announced

## Out of scope (be explicit)
- **Per-player self-reported stats input** (the entire `partida-encerrar-estatisticas.png` screen) — Layer 3; contradicts the SCOPE "NOT in MVP: Editable advanced stats (ACE/BLK/ATA/DEF input)". Not built.
- **Per-player stats _input_** (self-reported ACE/BLK/ATA/DEF steppers) — the read-only "MEU DESEMPENHO" display block is IN (PM flip 2026-07-04), but the values come from the backend, not a user-editable form.
- **Team compositions** and **match duration** — SCOPE S16 OUT; absent from mockup.
- **Generated shareable image** — SCOPE S16 OUT; share is text-only via the OS sheet.
- **Editing the result / re-voting** — read-only screen.
- **Multi-language** — Portuguese only for MVP.

## Files to create
- `app/matches/[id]/summary.tsx` — the screen component
- `src/features/matches/api/getMatchSummary.ts` — mocked `useMatchSummary` query hook + `MatchSummary` types (mirrors the `getCurrentSet.ts` / `useMVPVote.ts` mock precedent: fixed latency, `// MOCK:` + `// TODO(real-api): F1.6 path TBD`)

## Files to modify
- **`docs/COMPONENTS.md`** — **NO UPDATE NEEDED.** No new reusable components proposed (reuses `Avatar` + `Button`; share/result/pills/vote-bars inlined).
- (Optional) `src/features/matches/types/matchDetail.ts` — only if the `MatchSummary` type is co-located there instead of in `getMatchSummary.ts`; the `MatchPlayer` shape from `useMVPVote.ts` (`{ id, name, handle, position, avatarUrl? }`) should be reused for MVP/ranking rows to avoid a parallel type.

## New npm dependencies
- **NONE.** `Share` is part of `react-native` core; `Share2`/`Trophy`/`MapPin`/`ChevronLeft` are in `lucide-react-native` (locked). All other deps already in CLAUDE.md.

## Implementation notes
- **`MatchSummary` shape (proposed):**
  ```typescript
  type MatchSummary = {
    format: '2X2' | '4X4' | '6X6';
    result: 'VITORIA' | 'DERROTA';
    name: string;
    venue: string;
    dateLabel: string;                 // pre-formatted pt-BR, e.g. "10 jun 2026"
    finalScore: [number, number];      // sets won [mine, theirs]
    setScores: Array<[number, number]>;// per-set point scores
    mvp: MatchPlayer & { votes: number };
    totalVotes: number;                // denominator for "N de M votos"
    voteRanking: Array<MatchPlayer & { votes: number }>; // sorted desc
    maxVotes: number;                  // = voteRanking[0].votes, for bar scaling
  };
  ```
  Reuse `MatchPlayer` (from `useMVPVote.ts`) and the `VITORIA | DERROTA` / format literals already used by `MatchHistoryRow` (S8) to stay consistent.
- **Vote-bar width** is the only inline style permitted (runtime percentage NativeWind can't express) — same documented escape hatch as `LevelBar`. Clamp the ratio to `[0, 1]`.
- **Win/loss color semantics:** Vitória → `accent` (lime) fill with `text-primary` label (dark text on lime for contrast per DESIGN_SYSTEM position-badge contrast rule); Derrota → `danger` fill with `text-on-dark` label.
- **Share payload:** build a plain-text message (e.g. `"{name} — {result} {finalScore[0]}–{finalScore[1]}. MVP: {mvp.name}."`). No deep link / image in MVP.
- **Accessibility:** the result region should carry a single `accessibilityLabel` summarizing "Vitória/Derrota, placar X a Y, MVP Nome" so screen readers announce the outcome without traversing every pill.
- **"MEU DESEMPENHO" block (display-only):** render the read-only XP-gained card + Pontos/Blocks/Defesas/Aces stat tiles from `summary.myPerformance`. Do **not** add stepper/`−`/`+` inputs or a "Confirmar estatísticas" CTA — the values are server-computed, never user-edited.
