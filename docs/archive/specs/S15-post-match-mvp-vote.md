# Screen Spec: S15 — Post-Match MVP Vote

## Origin
- Screen from SCOPE: S15 — Post-Match MVP Vote
- Layer: 1 (Match Core) — F1.5 (MVP voting)
- Requested by: SCOPE.md (MVP)

## Reference assets read
- [x] `docs/references/screens/S15-mvp-vote/partida-votacao-mvp.png` (MVP vote screen with player list and selection state)

The PNG exists on disk and was read. No prototype source code; the PNG is the only layout reference.

## Notable divergences from the prototype
- **Per-player stats (PON/BLO/DEF/ACE) shown on each card in the mockup — NOT included.** SCOPE S15 OUT: "per-player stats (PON/BLO/DEF/ACE) shown on each card in the mockup (Layer 3) — hide for MVP". The player cards display avatar, name, @handle, and position only. All stat columns (PON, BLO, DEF, ACE) are omitted entirely per MVP scope.

## Goal
After a match ends (best-of condition met), all participants vote for which player was the MVP. The voter selects one player from the match roster (excluding themselves) and submits their vote. They then see a confirmation state awaiting other players' votes.

## Route
`app/matches/[id]/mvp-vote.tsx` — a separate nested route under the match stack, reached from S14 (scoreboard) when the match ends and the best-of series concludes. Presented as a **stack** screen (no tab bar). The `id` is read via `useLocalSearchParams<{ id: string }>()`. `headerShown: false` (header inlined, matching S11/S12).

**Route params:**
- `id: string` — match id (from parent route)

**Navigation trigger:**
- From S14 (scoreboard): when the final set ends and the match is over (organizer taps "Encerrar partida"), the app navigates to `router.push({ pathname: '/matches/[id]/mvp-vote', params: { id } })`
- After voting: state changes to post-vote (stays on screen) or navigates to S16 per flow TBD with backend implementation.

## Backend dependencies

> ### ⚠️ Scope override (owner-approved) — same posture as S5–S14
> Per agent rule #10, undefined backend endpoints would normally STOP the spec. The owner (renanortega.dev@gmail.com) has, for the match screens, consciously approved shipping **fully mocked** ahead of backend alignment. S15 follows that locked convention.
> - **(a) Not yet in backend SCOPE:** concrete paths for **F1.5** (MVP voting) are not yet aligned in quadra-api.
> - **(b) Conscious decision:** the owner approves shipping S15's MVP vote read + write **fully mocked** this iteration.
> - **(c) Explicit follow-up:** real wiring swaps each mocked `queryFn`/`mutationFn` behind its unchanged hook signature once the backend match module lands.

**NONE asserted this iteration — all hooks MOCKED.** No real endpoint path is referenced; no backend behavior is claimed to exist. Mapping to SCOPE F-numbers (for the real swap later):
- **F1.5 (read eligible voters)** → `useMatchPlayers(matchId)` — fetch the list of players from the match (likely already cached from S12/S14).
- **F1.5 (write vote)** → `useVoteMVPMutation(matchId)` — POST vote for a player; returns success/error confirmation.

## Existing components reused
- `Avatar` (`src/components/ui/Avatar.tsx`) — player card avatars (`size="md"`). Catalog lists it for S15 use.
- `Button` (`src/components/ui/Button.tsx`):
  - `variant="grad"` (blue→lime `bg-gradient-cta`) for the **"Selecionar MVP"** / **"Confirmar voto"** primary CTA (main action of the screen).
  - `variant="outline"` for secondary/cancel actions if needed (e.g., future "Voltar" button variant).

No `FilterChip` or complex selection components — voting is a simple radio-style single-select (one player only). Selection managed via local `useState`.

## New components proposed
**NONE.** Player card structure is simple enough to inline as a `<Pressable>` with conditional styling:
- Interior: `<Avatar>` + player name (`text-h3`) + @handle · position subtitle (`text-caption`) + conditional radio indicator
- Styling via NativeWind classes: `bg-white rounded-card shadow-card` base; `border-2 border-primary` when selected; `opacity-50` when current user (disabled)
- No reusable component created — single-screen, one-off use case

## Layout structure

```
<Screen> (bg-surface-dark, full-height dark background)
  <SafeAreaView edges={['top']} className="flex-1">
    <!-- Header bar: back chevron + title -->
    <View className="flex-row items-center px-4 py-4">
      <Pressable onPress={router.back} accessibilityRole="button" accessibilityLabel="Voltar">
        <ChevronLeft size={24} color={colors.textOnDark} />
      </Pressable>
      <Text className="text-body text-text-on-dark ml-3">Resultado da partida</Text>
    </View>

    <!-- Hero section: eyebrow + headline -->
    <View className="px-4 py-8 items-center">
      <Text className="text-eyebrow text-accent uppercase">MVP DA PARTIDA</Text>
      <Text className="text-display text-text-on-dark uppercase font-display mt-2">QUEM BRILHOU?</Text>
    </View>

    <!-- Match indicator pill -->
    <View className="px-4 mb-6 items-center">
      <View className="bg-white/10 rounded-pill border border-white/20 px-4 py-2 self-center">
        <Text className="text-body text-text-on-dark">Sua partida</Text>
      </View>
    </View>

    <!-- Scrollable content: player list or post-vote state -->
    <ScrollView className="flex-1">
      {!hasVoted ? (
        <!-- Pre-vote: selectable player cards -->
        <View className="px-4 gap-3 pb-4">
          {players.map((player) => (
            <Pressable
              key={player.id}
              onPress={() => player.id !== currentUserId && selectPlayer(player.id)}
              disabled={player.id === currentUserId}
              accessibilityRole="radio"
              accessibilityState={{
                selected: selectedPlayerId === player.id,
                disabled: player.id === currentUserId,
              }}
              className={`
                flex-row items-center gap-4 p-4 rounded-card
                ${
                  selectedPlayerId === player.id
                    ? 'bg-white border-2 border-primary shadow-card'
                    : player.id === currentUserId
                    ? 'bg-white/5 opacity-50 border border-white/20'
                    : 'bg-white border border-line shadow-card'
                }
              `}
            >
              <Avatar uri={player.avatarUrl} name={player.name} size="md" />
              <View className="flex-1">
                <Text className="text-h3 text-text-on-dark">{player.name}</Text>
                <Text className="text-caption text-text-muted">@{player.handle} · {player.position}</Text>
              </View>
              {selectedPlayerId === player.id && (
                <View className="w-6 h-6 rounded-full border-2 border-primary bg-primary" />
              )}
              {player.id === currentUserId && (
                <Text className="text-caption text-accent font-mono">você</Text>
              )}
            </Pressable>
          ))}
        </View>
      ) : (
        <!-- Post-vote: confirmation state -->
        <View className="px-4 py-12 items-center justify-center flex-1">
          <Text className="text-h3 text-text-on-dark text-center">
            Você votou em {votedForPlayer.name}.
          </Text>
          <Text className="text-body text-text-muted text-center mt-6">
            Aguardando outros jogadores...
          </Text>
        </View>
      )}
    </ScrollView>

    <!-- Bottom CTA (only shown when pre-vote) -->
    {!hasVoted && (
      <View className="px-4 py-6 bg-surface-dark border-t border-white/10">
        <Button
          variant="grad"
          onPress={submitVote}
          disabled={!selectedPlayerId}
          loading={isSubmittingVote}
          testID="mvp-submit-button"
        >
          Selecionar MVP
        </Button>
      </View>
    )}
  </SafeAreaView>
</Screen>
```

**Design tokens used:**
- Colors: `surface-dark` (navy background), `text-on-dark` (white text on dark), `text-accent` (lime eyebrow), `primary` (blue selection ring), `text-muted` (secondary text), `line` (border divider)
- Typography: `text-display` (Climate Crisis, uppercase, "QUEM BRILHOU?"), `text-eyebrow` (uppercase, "MVP DA PARTIDA"), `text-h3` (player names), `text-body` (match indicator), `text-caption` (subtitles), `text-mono` ("você" badge)
- Spacing: `px-4`, `py-6`, `gap-3`, `mt-2`, `mb-6` (all from Tailwind scale)
- Radius: `rounded-card` (player cards, 20px), `rounded-pill` (match indicator, 20px+), `rounded-full` (radio button, 9999px)
- Shadows: `shadow-card` (cards at rest)

All via NativeWind. No hardcoded hex values.

## State

### Server state (TanStack Query hooks)
- `useMatchPlayers(matchId)` — fetch eligible voters from the match. Returns `MatchPlayer[]`:
  ```typescript
  { id: string; name: string; handle: string; position: 'LEV' | 'PON' | 'OPO' | 'CEN' | 'LIB' | 'COR'; avatarUrl?: string }
  ```
  Mocked in `src/features/matches/api/useMVPVote.ts`; real endpoint is F1.5.

- `useVoteMVPMutation(matchId)` — mutation to POST vote:
  ```typescript
  // Input
  { votedForPlayerId: string }
  // Output
  { success: true; votedForPlayerId: string; votedForName: string }
  ```
  Mocked; real endpoint is F1.5.

### Client state (Zustand)
- **NONE.** No cross-screen state needed; voting result is scoped to this screen and navigation/cache update.

### Local state (component useState)
- `selectedPlayerId: string | null` — which player is highlighted for voting. Initially `null`. Toggled by card press; deselects on second press.
- `hasVoted: boolean` — controls conditional rendering of post-vote state. Initially `false`. Set to `true` on mutation success.
- `votedForPlayer: MatchPlayer | null` — caches the submitted vote (name, id) for display in post-vote confirmation message. Set on mutation success.
- `isSubmittingVote: boolean` — submission pending state (for loading indicator). Derived from `useVoteMVPMutation.isPending`.

### Forms
- **NONE.** Voting is a single selection + submission, not a form. No Zod schema, no React Hook Form.

## Navigation triggers
- **Back chevron** → `router.back()` — returns to S14 (scoreboard) or previous screen in stack.
- **"Selecionar MVP" button** → `submitVote()` calls the `useVoteMVPMutation.mutate({ votedForPlayerId: selectedPlayerId })`. On success, set `hasVoted = true` and display post-vote state. After a timeout (~5s, TBD with backend) or external trigger, **optionally** navigate to S16 (match summary) — spec assumes state change for MVP, real flow TBD.

## Permissions / external integrations
- **NONE.** MVP voting requires no location, camera, or external service access.

## Real-time subscriptions
- **NONE for MVP.** Post-MVP may add SignalR subscription to watch other players' votes come in on the post-vote state. Out of scope for L1.

## Loading / error / empty states

### Loading state
- **Player list loads:** While `useMatchPlayers` is pending, render a shimmer/skeleton placeholder (4–6 placeholder cards, `h-20 rounded-card bg-white/10` animated opacity pulse).
- **Vote submission:** Button shows `loading={true}`, swapping text to spinner. Button disabled during submission. Prevent double-submit.

### Error state
- **Player list failure:** Centered **"Não foi possível carregar os jogadores"** message with a **"Tentar novamente"** outline button → `queryClient.invalidateQueries(['matches', matchId, 'players'])`.
- **Vote submission failure:** Show a **"Seu voto não foi registrado. Tente novamente."** alert/toast. User remains on pre-vote list; can retry selection + submission.

### Empty state
- **Unlikely in MVP context** (a match always has participants). If `players.length === 0`, show **"Nenhum jogador disponível"** centered message (architectural artifact).

## Acceptance criteria
- [ ] Screen displays dark navy background (`surface-dark`)
- [ ] Hero headline **"QUEM BRILHOU?"** (Climate Crisis, uppercase) with lime eyebrow **"MVP DA PARTIDA"** renders correctly
- [ ] All players from the match are listed with avatar, name, @handle, and position
- [ ] Per-player stats (PON/BLO/DEF/ACE) are **NOT visible** — confirms Layer 3 cut per SCOPE
- [ ] Current user ("você") is shown in the list but **cannot be selected** — `disabled` Pressable, visual mute (opacity-50), label "você" affixed
- [ ] Tapping another player's card selects them and displays a blue filled radio indicator
- [ ] Only one player can be selected at a time (tapping a new card deselects the previous one)
- [ ] "Selecionar MVP" button is **disabled** when no player is selected; **enabled** once a player is chosen
- [ ] Tapping "Selecionar MVP" submits the vote via `useVoteMVPMutation`
- [ ] On submission success, screen transitions to post-vote state: **"Você votou em [Name]. Aguardando outros jogadores."**
- [ ] Post-vote state is non-interactive (no selections, no edits) — voting is locked per SCOPE OUT
- [ ] Back chevron navigates back to S14 or previous screen
- [ ] Player list loads via `useMatchPlayers(matchId)` query (mocked)
- [ ] Error states (load/submit failures) display recoverable error messages with "Tentar novamente" button
- [ ] Button loading state shows spinner + disabled state while submitting
- [ ] Accessibility: each card has `accessibilityRole="radio"` + `accessibilityState`; button has `accessibilityLabel`

## Out of scope (be explicit)
- **Per-player stats display (PON/BLO/DEF/ACE)** — Layer 3 per SCOPE S15 OUT. Not shown on cards; not an input form.
- **Changing vote after submitting** — SCOPE S15 OUT: "change vote after submitting (locked)". Once `hasVoted === true`, UI does not allow re-selection or edit.
- **Real-time vote updates / vote count leaderboard** — Watching other players' votes come in. Realtime subscription is post-MVP.
- **Auto-navigation to S16** — The spec assumes post-vote state stays on S15. Real flow (timeout → S16, or "Ver resumo" button, or wait for all voters) is TBD with backend implementation.
- **Multi-language** — Portuguese only for MVP.

## Files to create
- `app/matches/[id]/mvp-vote.tsx` — the screen component (React Native Expo Router screen)

## Files to modify
- `src/features/matches/api/` — add or extend MVP voting hook:
  - **File:** `src/features/matches/api/useMVPVote.ts` (new file, following S11/S12 precedent)
  - **Exports:**
    ```typescript
    export const useMatchPlayers = (matchId: string) =>
      useQuery({
        queryKey: ['matches', matchId, 'players'],
        queryFn: () => getMatchPlayers(matchId), // mocked
      });

    export const useVoteMVPMutation = (matchId: string) =>
      useMutation({
        mutationFn: (votedForPlayerId: string) =>
          submitMVPVote(matchId, votedForPlayerId), // mocked
      });
    ```
  - Both functions are **fully mocked** this iteration (deterministic stubs with 300ms latency). Marked with `// MOCK:` + `// TODO(real-api): F1.5 path TBD` for backend alignment.

- `docs/COMPONENTS.md` — **NO UPDATE NEEDED.** No new components proposed; reuses `Avatar` and `Button` only.

## New npm dependencies
- **NONE.** All dependencies already in CLAUDE.md locked stack.

## Implementation notes

1. **Self-selection lock:** The current user is fetched via `useAuthStore()` (from `src/stores/auth.ts`). The player card for the current user gets `disabled={player.id === currentUserId}`, visual styling (`opacity-50`, `border-white/20`), and a small **"você"** label (`text-accent text-caption`). Tapping it is a no-op.

2. **Single-select radio:** `selectedPlayerId` state tracks which player is highlighted. Tapping a card calls `selectPlayer(id)` → `setSelectedPlayerId(id === selectedPlayerId ? null : id)` (toggle: select or deselect). Styles update reactively; the radio indicator appears/disappears.

3. **Post-vote state transition:** Once the mutation succeeds, extract the voted-for player name from the response and set `hasVoted = true` + `votedForPlayer = response`. The screen re-renders conditionally: the player list hides, and a centered confirmation message appears. No navigation away (spec assumes state-based flow; real backend may dictate a timeout/auto-advance).

4. **Error recovery:** If `useMatchPlayers` fails initially, a centered error block with **"Tentar novamente"** button invokes `queryClient.invalidateQueries(['matches', matchId, 'players'])`. If the mutation fails, an alert surfaces the error; the user remains on the pre-vote list and can retry selection + submission.

5. **Skeleton loading:** While `useMatchPlayers` is pending, render a FlatList of 5 skeleton card placeholders. Each placeholder is a `h-20 rounded-card bg-white/10` with an animated opacity pulse (no shimmer library needed; simple opacity animation via `react-native-reanimated` shared value or CSS animation equivalence in NativeWind).

6. **Button disabled state:** The "Selecionar MVP" button has `disabled={!selectedPlayerId || isSubmittingVote}`. When disabled, the button uses `bg-bg-light-alt` fill (per Button component spec in COMPONENTS.md) with no shadow. When enabled and pressed, it shows the loading spinner and blocks further presses.

7. **Accessibility:** Each player card is a `<Pressable>` with `accessibilityRole="radio"` and full `accessibilityState` (selected, disabled). The button has `accessibilityLabel="Votação para MVP"` and `accessibilityHint="Selecione um jogador para votar"`. The post-vote message is announced via `accessibilityLiveRegion="polite"`.

8. **Font tokens:** Strictly use DESIGN_SYSTEM tokens:
   - `text-display` (Climate Crisis, uppercase) for "QUEM BRILHOU?"
   - `text-eyebrow` (DM Sans, uppercase, weight 700) for "MVP DA PARTIDA"
   - `text-h3` (DM Sans, weight 800) for player names
   - `text-body` (DM Sans, weight 400) for match indicator text
   - `text-caption` (DM Sans, weight 400) for @handle · position
   - `text-mono` (DM Mono, weight 500, uppercase) for "você" label

9. **Color contrast on dark surface:** All text on `surface-dark` uses `text-on-dark` (white) or `text-muted` (secondary gray). The lime accent (`accent` / `text-accent`) is used only for the eyebrow and "você" label — provides clear contrast and visual emphasis. No hardcoded colors.
