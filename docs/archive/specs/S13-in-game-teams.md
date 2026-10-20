# Screen Spec: S13 — In-Game Teams

## Origin
- Screen from SCOPE: S13 — In-Game Teams
- Layer: 1 (Match Core) — F1.3 (team assignment/draw)
- Requested by: SCOPE.md (MVP)

## Reference assets read
- [x] `docs/references/screens/S12-match-detail/partida-visao-organizador.png` — team-setup UI shown in organizer view (team count chips "2/3/4 times", players-per-team stepper, draw mode radio buttons "Manual" / "Automático", "Montar os times" CTA). S13 has no dedicated screenshot per SCOPE; this organizer section is the visual reference.

Both PNGs exist on disk and were read. No prototype source code; the PNG is the only layout reference.

## Notable divergences from the prototype
- **Team-setup inline on S12** → **S13 is a separate navigated screen** per SCOPE, reached by tapping "Montar os times" from S12.
- **Prototype shows team-config controls (count, players-per-team, draw mode)** — these are configured in S12; S13 **consumes the route params** (`teamCount`, `perTeam`, `drawMode`) and displays the resulting team rosters.
- **Prototype does NOT show S13's full layout** (team columns with avatars, "Sortear" button, manual drag UI) — this is **inferred from SCOPE** and rendered as N columns of teams with player avatars and positions.
- **No per-player OVR ratings** displayed (Layer 3 cut, per SCOPE S12).

## Mock-first data note (read this first)

S13 reads the match and may call a draw endpoint. The backend match-teams endpoints (F1.3) have **no concrete paths aligned** in quadra-api yet. Following the locked convention (S2–S12: fully mocked, deterministic, test-friendly), this iteration ships **fully mocked** — **no network, no `EXPO_PUBLIC_API_URL` fetch, no asserted backend path**. The `queryFn`/`mutationFn` resolves a fixed stub after a short fake latency (overridable to 0 under test), marked `// MOCK:` with `// TODO(real-api):` pointing at F1.3, replaceable behind the unchanged hook signatures once the backend lands. The **payload/type shapes are final**; only transport is mocked.

## Goal
Allow the match organizer to assign players to teams via auto-draw (if `drawMode=AUTO`) or manual drag-to-swap (if `drawMode=MANUAL`), then confirm and start the match. The flow continues to S13.5 (set picker for 3+ teams) or S14 (scoreboard for 2 teams) after confirmation.

## Route
`app/matches/[id]/teams.tsx` (Expo Router) — reached from S12's "Montar os times" button with route params:
- `id: string` — match id
- `teamCount: string` — "2" | "3" | "4" (parsed to number)
- `perTeam: string` — players per team (parsed to number)
- `drawMode: string` — "MANUAL" | "AUTO" (parsed to DrawMode)

Presented as a **stack** screen (not inside `(tabs)`), so no tab bar shows. Header (back chevron + "MONTAR OS TIMES" title) is **inlined** per the S11/S12 pattern.

## Backend dependencies

> ### ⚠️ Scope override (owner-approved) — same posture as S5–S12
> Per agent rule #10, undefined backend endpoints would normally STOP the spec. The owner (renanortega.dev@gmail.com) has approved shipping **fully mocked** ahead of backend alignment. S13 follows that locked convention.
> - **(a) Not yet in backend SCOPE:** concrete paths for **F1.3** (draw teams, assign teams) are not yet aligned in quadra-api.
> - **(b) Conscious decision:** the owner approves shipping S13's draw/assign calls **fully mocked** this iteration.
> - **(c) Explicit follow-up:** real wiring swaps each mocked `queryFn`/`mutationFn` behind its unchanged hook signature once the backend match module lands.

**NONE asserted this iteration — all hooks MOCKED.** No real endpoint path is referenced; no backend behavior is claimed to exist. Mapping to SCOPE F-numbers (for the real swap later):
- **F1.3 (draw)** → `useDrawTeams(id, { teamCount, perTeam, drawMode })` — called on mount if `drawMode=AUTO`, or on user tap "Sortear" if `drawMode=MANUAL`.
- **F1.3 (assign)** → `useAssignTeam(id, { assignments: { playerId, teamId }[] })` — called on each manual drag-to-swap.
- **F1.2** (match detail) → `useMatchDetail(id)` — **reused from S12's cache**; read-only.

## No assumed primitives — header / safe-area shell
The catalog (COMPONENTS.md) has **no** `Screen`, `Header`, or `IconButton` component; S5/S8/S11/S12 deliberately inline their shell + header. S13 reuses that **same inline pattern**:
- **Screen shell**: `<View className="flex-1 bg-bg-light">` wrapping `<SafeAreaView edges={['top']} className="flex-1">`.
- **Header**: inline `<View className="flex-row items-center gap-3 px-4 pt-2 pb-4">` with back affordance + title. Back affordance is an inline `<Pressable accessibilityRole="button" accessibilityLabel="Voltar">` wrapping a lucide `ChevronLeft` — same pattern S11/S12 use. No `IconButton` introduced.

## Existing components reused
- `Avatar` (`src/components/ui/Avatar.tsx`) — player avatars in team rosters (`size="sm"`).
- `Button` (`src/components/ui/Button.tsx`):
  - `variant="grad"` (blue→lime `bg-gradient-cta`) for "Começar partida" (main forward CTA).
  - `variant="outline"` for "Sortear" button (MANUAL mode only) — reuses `outline` for secondary actions.
- `colors` (`src/theme/colors.ts`) — runtime color values for lucide icons (ChevronLeft) and team display. No inline hex.

## New components proposed
The catalog has no team-roster column display. Evaluated against "reuse before create":

- `TeamRoster` — *why nothing fits*: S12's `PresenceGrid` renders a **wrapping grid** of confirmed avatars + empty "vaga" slots up to capacity (for the presence-confirmation view). S13's **team rosters are N separate vertical columns**, each representing one team with a header and a vertical stack of avatars + position badges. Layout is columnar (not wrapping grid), and semantics is "team roster" not "presence confirmation".
  - Path: `src/components/domain/TeamRoster.tsx`
  - Props:
    ```ts
    type TeamRosterProps = {
      teamId: string;
      teamName?: string;  // e.g. "Time 1", "Time Azul", etc.
      players: PresencePlayer[];  // reuse from matchDetail.ts
      testID?: string;
    };
    ```
  - Presentational; receives plain data, never fetches. Renders team header + vertical stack of `<Avatar>` + position badges (no empty slots like `PresenceGrid`).
  - Reused by S13 (and possibly S14 scoreboard if it needs team rosters) — justifies extraction.

If the implementer finds the team-roster layout too simple to extract (just a `View` wrapping avatars), it may be inlined per the catalog's "extract only when reuse happens" rule. The above proposal assumes the design wants a reusable abstraction; the final decision is the implementer's.

## Layout structure

Token references only; NativeWind classes; no hex; no `StyleSheet.create`.

```
<View className="flex-1 bg-bg-light">
  <SafeAreaView edges={['top']} className="flex-1">

    # ── Inline header ──
    <View className="flex-row items-center gap-3 px-4 pt-2 pb-4">
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={router.back}>
        <ChevronLeft color={colors.surfaceDark} />
      </Pressable>
      <Text className="font-display text-h1 text-text-primary uppercase flex-1">Montar os times</Text>
    </View>

    <ScrollView contentContainerClassName="pb-32" showsVerticalScrollIndicator={false}>

      # ── Subtitle: mode + team config ──
      <View className="px-4 mt-2">
        <Text className="font-body text-caption text-text-muted">
          {teamCount} times de {perTeam} jogadores cada • Modo {drawMode === 'MANUAL' ? 'Manual' : 'Automático'}
        </Text>
      </View>

      # ── Team rosters: N columns (2, 3, or 4 teams) ──
      {drawMode === 'AUTO' && !teams.length ? (
        <View className="px-4 mt-6">
          {/* Loading skeleton: pulse or shimmer on the team columns */}
        </View>
      ) : (
        <View className="flex-row gap-4 px-4 mt-6">
          {teams.map(team => (
            <TeamRoster
              key={team.id}
              teamId={team.id}
              teamName={team.name || `Time ${team.number}`}
              players={team.players}
            />
          ))}
        </View>
      )}

      # ── Sortear button (MANUAL mode only; appears if teams are not yet drawn) ──
      {drawMode === 'MANUAL' && !teams.length && (
        <View className="px-4 mt-8">
          <Button variant="outline" onPress={onDraw} testID="draw-teams">
            Sortear
          </Button>
        </View>
      )}

      # ── Confirmation text ──
      <View className="px-4 mt-8">
        <Text className="font-body text-body text-text-muted text-center">
          Revise os times abaixo e toque em "Começar partida" para iniciar.
        </Text>
      </View>

    </ScrollView>

    # ── Fixed footer CTA ──
    <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-white px-4 pt-3 pb-6">
      <Button variant="grad" onPress={onStartMatch} loading={isStarting} testID="start-match">
        Começar partida
      </Button>
    </View>

  </SafeAreaView>
</View>
```

## State

### Server state (TanStack Query hooks)
- `useMatchDetail(id)` — **reused from S12's cache**; read-only (players list, format, confirmed count).
- `useDrawTeams(id, { teamCount, perTeam, drawMode })` — **new hook** — calls mock `POST /api/.../teams/draw`.
  - Request shape: `{ teamCount: 2|3|4; perTeam: number; drawMode: 'MANUAL'|'AUTO' }`
  - Response shape: `{ teams: { id: string; name?: string; number: number; players: PresencePlayer[] }[] }`
  - Used when: user taps "Sortear" (MANUAL) or page mounts (AUTO).
- `useAssignTeam(id)` — **new hook** — calls mock `POST /api/.../teams/assign`.
  - Request shape: `{ assignments: { playerId: string; teamId: string }[] }`
  - Response shape: `{ teams: { id: string; name?: string; number: number; players: PresencePlayer[] }[] }`
  - Used when: user drags a player to a new team column.

### Client state (Zustand)
- None — use local useState for ephemeral UI state.

### Local state
- `teams: Team[]` — current team rosters (seeded by draw or manual drag).
- `draggedPlayer: PresencePlayer | null` — the player being dragged (MANUAL mode, if drag is implemented this iteration).
- `sourceTeamId: string | null` — the team the dragged player came from.
- `isStarting: boolean` — loading state while confirming start.

### Forms (if any)
- None — this screen has no form; it's purely presentational with interactive drag/draw.

## Navigation triggers
- Back button (chevron) → `router.back()` to S12 (no team assignments are persisted until "Começar partida" is confirmed).
- "Começar partida" → confirmation dialog:
  - After user confirms: route to `/matches/[id]/scoreboard` for all team counts.
  - S14 (scoreboard route) handles conditional rendering: if `teamCount >= 3`, it displays S13.5 (set picker) as the initial state; if `teamCount === 2`, it displays the scoreboard directly.

## Permissions / external integrations
- None.

## Real-time subscriptions (if any)
- None for this screen.

## Loading / error / empty states
- **Loading**: Show skeleton team columns with shimmer placeholders on mount (if AUTO mode).
- **Error**: Toast or inline alert "Não foi possível montar os times. Tente novamente." with retry button.
- **Empty**: Not applicable — screen always has confirmed players from S12.

## Acceptance criteria
- [ ] Screen displays exactly `teamCount` team columns (2, 3, or 4).
- [ ] Each column shows its players as a vertical stack of avatars with position badges (if available).
- [ ] Column header displays a team name/number (e.g. "Time 1", "Time 2").
- [ ] Header reads "MONTAR OS TIMES" and back button returns to S12.
- [ ] Subtitle displays team count, players-per-team, and draw mode (Manual/Automático).
- [ ] If `drawMode=AUTO`: teams are auto-drawn on mount (no "Sortear" button shown); loading skeleton displays while draw is in flight.
- [ ] If `drawMode=MANUAL`: "Sortear" button is shown and visible; tapping it calls `useDrawTeams` and updates the team display.
- [ ] In MANUAL mode with drag enabled: long-pressing a player initiates drag (visual feedback: opacity or highlight).
- [ ] Dragging player to a different team column calls `useAssignTeam` and updates local teams.
- [ ] Tapping "Começar partida" shows confirmation dialog: "Pronto para começar esta partida?" with "Sim, começar" / "Revisar" buttons.
- [ ] After confirming: navigates to `/matches/[id]/scoreboard`.
  - S14 renders S13.5 (set picker) as initial state if `teamCount >= 3`.
  - S14 renders scoreboard directly if `teamCount === 2`.
- [ ] Button shows loading spinner while confirmation is in flight.
- [ ] Back button does NOT persist team assignments (they are discarded on unmount).
- [ ] Position badges render correctly (position abbreviation + background color per DESIGN_SYSTEM).

## Out of scope (be explicit)
- Per-player OVR ratings or stats (Layer 3).
- Team color/theme assignment (MVP teams are identified by number only).
- Undo / re-shuffle within the session (once confirmed, user goes to next screen).
- Keyboard-accessible drag-drop alternative (manual drag is the drag-only method for MANUAL mode).
- Animated transitions of players between teams (swaps are instant, no animation).
- **Drag-to-swap may be deferred to a follow-up iteration** if the implementer finds the gesture complexity higher than anticipated. **Default behavior (AUTO mode, no drag)**: auto-draw on mount, user confirms; or (MANUAL mode, no drag): "Sortear" button, then confirm. Drag is a stretch goal for MANUAL mode.

## Files to create
- `app/matches/[id]/teams.tsx` — main S13 screen (replace current placeholder).
- `src/features/matches/api/drawTeams.ts` — mock hook for `POST /api/.../teams/draw`.
- `src/features/matches/api/assignTeam.ts` — mock hook for `POST /api/.../teams/assign`.
- `src/components/domain/TeamRoster.tsx` — team roster column component (if extracted; may be inlined).
- `src/features/matches/types/team.ts` — `Team = { id: string; name?: string; number: number; players: PresencePlayer[] }`.

## Files to modify
- `docs/COMPONENTS.md` — add entry for `TeamRoster` (if extracted and added to catalog).
- `app/matches/[id]/_layout.tsx` (if it exists) — confirm teams is nested under match parent per Expo Router.

## New npm dependencies
- NONE (preferred). Uses existing `react-native-gesture-handler` (already locked in CLAUDE.md) for drag if implemented; no new dependencies.

## Implementation notes

### Auto-draw behavior (AUTO mode)
- On screen mount: call `useDrawTeams` immediately with `drawMode='AUTO'`.
- Display loading skeleton while request is in flight.
- Once resolved, display the teams and hide the skeleton.
- No "Sortear" button shown.

### Manual mode with Sortear (MANUAL mode, no drag)
- On mount: `teams` is empty (or pre-populated by S12 — clarify with PM).
- Display the "Sortear" button.
- On tap: call `useDrawTeams` with `drawMode='MANUAL'` to get an initial random assignment.
- Once resolved, display teams and hide "Sortear" button.
- If drag is NOT implemented: user reviews the teams and confirms.

### Manual mode with drag (MANUAL mode, future iteration)
- If drag is implemented:
  - Use `react-native-gesture-handler`'s `LongPressGestureHandler` to detect long press on a player avatar.
  - On long press: render a semi-transparent copy of the avatar as a "drag preview".
  - On pan gesture: move the preview with the finger.
  - On release over a team column: call `useAssignTeam` to move the player.
  - On release elsewhere: snap back (no change).
  - Visual feedback: dragged player in source team shows 50% opacity; target team column highlights with a dashed border.

### Confirmation flow
- Tapping "Começar partida" opens a modal/alert: "Pronto para começar esta partida?" with two buttons.
- "Sim, começar" → POST final team assignments to backend (if assignments were modified), then navigate.
- "Revisar" → dismiss modal, let user adjust teams (if drag is implemented) or return to team display.
- Button shows loading spinner while confirmation is in flight.

### Route params parsing
- `useLocalSearchParams()` returns strings; parse `teamCount` and `perTeam` to numbers.
- Validate that `teamCount` is 2, 3, or 4; `drawMode` is 'MANUAL' or 'AUTO'.
- If invalid, show error and route back to S12.

### Position badge colors
- Per DESIGN_SYSTEM: position abbreviations on **light surface** → `primary` (blue) text / bg.
- On dark surfaces (future) → `white` text.
- No per-position fixed colors — contrast-based only.

### TypeScript
- Define `Team = { id: string; name?: string; number: number; players: PresencePlayer[] }`.
- Reuse `PresencePlayer` from `src/features/matches/types/matchDetail.ts` (already has position field).
- No `any` types.
- Export types from `src/features/matches/types/team.ts`.

## Edge cases & gotchas
1. **Team count mismatch**: If confirmed players don't evenly divide by `perTeam`, some teams will be under-full. Display the partial teams, let organizer confirm (backend validates on start).
2. **Duplicate player error**: If manual drag duplicates a player, `useAssignTeam` should reject. Show error: "Este jogador já está em outro time."
3. **Network loss during drag**: If mutation fails mid-drag, revert UI to last known state and show error toast.
4. **Re-entering S13**: If user navigates away and comes back, reset to initial draw (don't persist multi-step drag state).
5. **Route params missing**: If `id`, `teamCount`, `perTeam`, or `drawMode` are missing, show error and route back to S12.
6. **S14 route must exist**: Ensure `/matches/[id]/scoreboard` (S14) is created before S13 ships; it handles both 2-team scoreboard and 3+-team set-picker conditional rendering (S13.5).
