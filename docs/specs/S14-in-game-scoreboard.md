# Screen Spec: S14 — In-Game Scoreboard

## Origin
- Screen from SCOPE: S14 — In-Game Scoreboard
- Layer: 1 (Match Core) — F1.4 (read/write set score) + Realtime (SignalR)
- Requested by: SCOPE.md (MVP)

## Reference assets read
- [x] `docs/references/screens/S14-scoreboard/partida-placar.png` (live scoreboard UI with team scores, point controls, elapsed timer)

The PNG exists on disk and was read. No prototype source code; the PNG is the only layout reference.

## Notable divergences from the prototype
- **NONE — spec matches prototype 1:1.** The reference screenshot is the authoritative visual layout.

## Goal
Allow the match organizer to live-enter points for each team during play. Non-organizers watch the score update in real-time via SignalR. Once the set ends (a team wins by the required margin), the flow continues to MVP Vote (S15) if the match is over, or back to set selection (S13.5 for 3+ teams) or team confirmation (S13 for 2 teams) to start the next set.

## Route
`app/matches/[id]/scoreboard.tsx` (same route as S13.5; rendered conditionally)

**Conditional rendering logic:**
- When navigated to `/matches/[id]/scoreboard` with route params `{ id, setNumber, bestOf }`
- If `teams.length >= 3 && selectedTeamIds.length < 2`: render S13.5 team picker
- If `selectedTeamIds.length === 2` or `teams.length === 2`: render S14 scoreboard

**Route params:**
- `id: string` — match id
- `setNumber: number` — current set number (1, 2, 3, …)
- `bestOf: number` — best-of series (e.g. 3 for "melhor de 3")

## Backend dependencies

> ### ⚠️ Scope override (owner-approved) — same posture as S5–S13
> Per agent rule #10, undefined backend endpoints would normally STOP the spec. The owner (renanortega.dev@gmail.com) has, for the match screens, consciously approved shipping **fully mocked** ahead of backend alignment. S14 follows that locked convention.
> - **(a) Not yet in backend SCOPE:** concrete paths for **F1.4** (set score read/write) and **Realtime** (SignalR match hub) are not yet aligned in quadra-api.
> - **(b) Conscious decision:** the owner approves shipping S14's score reads/writes and subscriptions **fully mocked** this iteration.
> - **(c) Explicit follow-up:** real wiring swaps each mocked `queryFn`/`mutationFn` behind its unchanged hook signature once the backend match module lands.

**NONE asserted this iteration — all hooks MOCKED.** No real endpoint path is referenced; no backend behavior is claimed to exist. Mapping to SCOPE F-numbers (for the real swap later):
- **F1.4 (read set state)** → `useCurrentSet(matchId, setNumber)` — fetch scores, elapsed time, set status, team rosters.
- **F1.4 (write score)** → `useAddPointMutation(matchId, setNumber)` — POST point (path TBD).
- **F1.4 (undo)** → `useUndoPointMutation(matchId, setNumber)` — POST undo request (path TBD).
- **Realtime (SignalR subscription)** → `useScoreSubscription(matchId, setNumber)` — `src/features/matches/realtime/useScoreSubscription.ts` — listen for `ScoreUpdated` events from the match hub.

## Existing components reused
- `Button` (`src/components/ui/Button.tsx`):
  - `variant="outline"` for **"Desfazer"** (organizer only, secondary action).
  - `variant="grad"` for **"Encerrar set"** (organizer only, primary action).
- `Avatar` (`src/components/ui/Avatar.tsx`) — optional for team roster indicators (if displayed).

## New components proposed
- **NONE.** The scoreboard layout (team names, large score display, point controls) is inlined on the screen.

## Layout structure

```
<Screen className="flex-1 bg-surface-dark">
  <SafeAreaView edges={['top']} className="flex-1">

    {/* Header bar — AO VIVO badge, elapsed timer, set info */}
    <View className="flex-row items-center justify-between px-4 py-3 border-b border-line/10">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <ChevronLeft size={24} color={colors.textOnDark} />
      </Pressable>

      <View className="flex-col items-center">
        <View className="flex-row items-center gap-1 mb-1">
          <View className="h-2 w-2 rounded-full bg-danger" />
          <Text className="text-eyebrow text-danger uppercase">AO VIVO</Text>
          <Text className="text-caption text-text-muted">{elapsedTime}</Text>
        </View>
        <Text className="text-caption text-text-muted">
          Sua partida · Set {setNumber} melhor de {bestOf}
        </Text>
      </View>

      <Pressable
        onPress={toggleTheme}
        accessibilityRole="button"
        accessibilityLabel="Alternar tema"
      >
        <Sun size={24} color={colors.textOnDark} />
      </Pressable>
    </View>

    {/* Main score display — two teams side by side */}
    <View className="flex-1 flex-row gap-4 px-4 py-8">

      {/* Team 1 */}
      <View className="flex-1 flex-col items-center">
        <Text className="text-h1 text-text-on-dark uppercase mb-4">
          {team1.name}
        </Text>

        {/* Large score box */}
        <View className="h-24 w-24 bg-white rounded-card flex items-center justify-center mb-4">
          <Text className="font-num text-primary" style={{ fontSize: 40 }}>
            {team1.score}
          </Text>
        </View>

        {/* Point control or indicator */}
        {isOrganizer ? (
          <Pressable
            onPress={() => addPoint(team1.id)}
            accessibilityRole="button"
            accessibilityLabel="Adicionar ponto para Time 1"
            className="py-2"
          >
            <Text className="text-body-bold text-accent">+ ponto</Text>
          </Pressable>
        ) : (
          <View className="flex-col items-center gap-1">
            <Text className="text-caption text-text-muted">
              ao vivo
            </Text>
          </View>
        )}
      </View>

      {/* Center divider */}
      <View className="flex items-center justify-center">
        <Text className="text-body text-text-muted">vs</Text>
      </View>

      {/* Team 2 */}
      <View className="flex-1 flex-col items-center">
        <Text className="text-h1 text-text-on-dark uppercase mb-4">
          {team2.name}
        </Text>

        {/* Large score box */}
        <View className="h-24 w-24 bg-white rounded-card flex items-center justify-center mb-4">
          <Text className="font-num text-primary" style={{ fontSize: 40 }}>
            {team2.score}
          </Text>
        </View>

        {/* Point control or indicator */}
        {isOrganizer ? (
          <Pressable
            onPress={() => addPoint(team2.id)}
            accessibilityRole="button"
            accessibilityLabel="Adicionar ponto para Time 2"
            className="py-2"
          >
            <Text className="text-body-bold text-accent">+ ponto</Text>
          </Pressable>
        ) : (
          <View className="flex-col items-center gap-1">
            <Text className="text-caption text-text-muted">
              ao vivo
            </Text>
          </View>
        )}
      </View>

    </View>

    {/* Footer action buttons — organizer only */}
    {isOrganizer && (
      <View className="flex-row gap-3 px-4 pb-4">
        <Button
          variant="outline"
          onPress={onUndo}
          disabled={!canUndo}
          testID="undo-button"
          className="flex-1"
        >
          Desfazer
        </Button>
        <Button
          variant="grad"
          onPress={onEndSet}
          testID="end-set-button"
          className="flex-1"
        >
          Encerrar set
        </Button>
      </View>
    )}

    {/* Thin progress bar */}
    <View className="h-1 bg-accent opacity-40" />

  </SafeAreaView>
</Screen>
```

## State

### Server state (TanStack Query hooks)
- `useCurrentSet(matchId, setNumber)` — `src/features/matches/api/getCurrentSet.ts` — fetch:
  - Team IDs and names for the two playing teams
  - Current scores for both teams
  - Elapsed time since set start (calculated from backend's `startedAt` timestamp)
  - Organizer check (current user's role)

### Real-time subscriptions
- `useScoreSubscription(matchId, setNumber)` — `src/features/matches/realtime/useScoreSubscription.ts` (non-organizers only):
  - Listen to SignalR hub for `ScoreUpdated` events
  - Update query cache when scores change
  - Auto-reconnect on disconnect
  - Cleanup (unsubscribe) on screen unmount

### Client state (Zustand)
- **NONE required.** Organizer's optimistic updates can live in component `useState`.

### Local state
- `useState({ team1Score, team2Score })` — running display scores (organizer only; applies optimistically)
- `useState(elapsedSeconds)` — increment every 1s via `setInterval`; format as "MM:SS"
- `useState(canUndo)` — boolean, true if at least one point has been scored
- `useState(isEndingSet)` — boolean to prevent double-tap and show loading state

## Mutations (organizer only)
- `useAddPointMutation(matchId, setNumber)` — POST `/api/v1/matches/{matchId}/sets/{setNumber}/score` (path TBD)
  - Request: `{ teamId: string }`
  - Response: `{ team1Score, team2Score, setEndedAt?, setWinnerId?, matchOver? }`
  - On success: update query cache
  - On error: undo local optimistic state, show toast
  
- `useUndoPointMutation(matchId, setNumber)` — POST `/api/v1/matches/{matchId}/sets/{setNumber}/undo` (path TBD)
  - Request: (empty)
  - Response: `{ team1Score, team2Score }`
  - On success: sync display with backend state

## Navigation triggers
- Back button → `router.back()` (return to S12)
- "Encerrar set" → organizer POST set-end request:
  - On success, check match state:
    - **Match is over** (`matchOver === true`): `router.push({ pathname: '/matches/[id]/mvp-vote', params: { id } })` → S15
    - **More sets** (`matchOver === false` and `teams.length === 2`): stay on S14, reset UI for next set
    - **More sets** (`matchOver === false` and `teams.length >= 3`): navigate to S13.5 to pick teams for next set

## Permissions / external integrations
- **NONE**

## Real-time subscriptions (if any)
- **Non-organizer**: SignalR listener for `ScoreUpdated` events
  - Join match room on mount: `conn.invoke('JoinMatchRoom', matchId)`
  - Listen: `conn.on('ScoreUpdated', (event) => { queryClient.setQueryData(...) })`
  - Leave on unmount
- **Organizer**: Does NOT subscribe

## Loading / error / empty states
- **Loading**: While fetching `useCurrentSet`:
  - Show skeleton boxes where scores will be
- **Error**: If set fetch fails:
  - Show "Não foi possível carregar a partida" + **Tentar novamente**
- **Post error**: If point POST fails:
  - Show toast "Erro ao registrar ponto"
  - Undo local state (decrement displayed score)

## Acceptance criteria
- [ ] Header shows "AO VIVO" badge (danger/red color) with elapsed timer (MM:SS)
- [ ] Header shows "Set N - melhor de M" subtitle
- [ ] Large score display (font-num, 40px size) for each team
- [ ] Team names in all-uppercase above scores
- [ ] Organizer sees "+ ponto" button per team
- [ ] Tapping "+ ponto" increments the score 1 point (optimistic update)
- [ ] Organizer sees "Desfazer" button (disabled if no points scored yet)
- [ ] Non-organizer sees read-only score display (no buttons)
- [ ] Non-organizer scores update in real-time (via SignalR)
- [ ] "Encerrar set" button visible (organizer only)
- [ ] Tapping "Encerrar set":
  - Shows loading state on button
  - On success: checks match state and navigates accordingly
  - On error: shows toast, button remains enabled
- [ ] Back button returns to S12
- [ ] Score state persists via query cache if screen backgrounded
- [ ] Timer increments every 1 second

## Out of scope (be explicit)
- **Per-player stats** (Layer 3) — no stat entry per point
- **Point-by-point history** (Layer 3)
- **Timeout / challenge system** (not in SCOPE)
- **Set results summary (S14.5)** — MVP goes directly from "Encerrar set" to S15 or next set

## Files to create
- `src/features/matches/api/getCurrentSet.ts` — query hook
- `src/features/matches/api/mutations/addPoint.ts` — mutation hook
- `src/features/matches/api/mutations/undoPoint.ts` — mutation hook
- `src/features/matches/realtime/useScoreSubscription.ts` — SignalR subscription hook
- (Update) `app/matches/[id]/scoreboard.tsx` — implement S14 (may exist as S13.5-only)

## Files to modify
- `src/features/matches/types/matchDetail.ts` — add `CurrentSetState` type if needed
- `src/lib/realtime/connection.ts` — ensure SignalR is initialized

## New npm dependencies
- **NONE** — all in CLAUDE.md

## Implementation notes

### Organizer vs non-organizer
- **Organizer**: Full control via mutations. Optimistic local updates. If POST fails, rollback + error toast.
- **Non-organizer**: Read-only. Updates via SignalR subscription.

### Timer
- Calculate `elapsedSeconds = now - currentSet.startedAt`
- Increment every 1s
- Format as "MM:SS"
- Clean up `setInterval` on unmount

### Set-ending condition
- Confirm with backend team: is 25 points (standard volleyball) or 15 the win threshold?
- Minimum 2-point margin?
- Backend enforces rules; frontend just displays the scores

### Real-time architecture
- Root-level SignalR connection (initialized in `app/_layout.tsx`)
- Screen-level subscription: `useScoreSubscription(matchId, setNumber)` on mount
- SignalR event → `queryClient.setQueryData(...)` → React re-render
- Unsubscribe on unmount

### Common pitfalls
- **Undo when no points scored**: Disable "Desfazer" until at least 1 point awarded
- **Multi-organizer edits**: Assume single organizer per match; if multiple edit simultaneously, first wins
- **Set-ending validation**: Backend enforces win condition (25 points, 2-point margin, etc.); frontend doesn't validate
