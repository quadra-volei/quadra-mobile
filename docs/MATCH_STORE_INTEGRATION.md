# Match Store Integration Guide

> Global state management for match workflows (S11 → S15)

---

## Store Location

`src/stores/matchStore.ts` — Zustand store managing match state across all screens.

---

## Usage by Screen

### S11 — Create Match

**Initialize match and set team configuration:**

```tsx
import { useMatchStore } from '@/stores/matchStore';

export default function CreateMatch() {
  const {
    teamCount, setTeamConfig, initializeMatch
  } = useMatchStore();

  const handleCreateMatch = (matchId: string, title: string) => {
    // Initialize match in store
    initializeMatch({
      matchId,
      matchTitle: title,
      organizerId: currentUserId,
      bestOf: 3,
    });

    // Set team configuration
    setTeamConfig({
      teamCount: 3,
      perTeam: 4,
      drawMode: 'AUTO',
    });

    // Navigate to S12
    router.push(`/matches/${matchId}`);
  };
}
```

---

### S12 — Match Detail

**Update presence and player lists:**

```tsx
import { useMatchStore } from '@/stores/matchStore';

export default function MatchDetail() {
  const { setConfirmedPlayers, setAllPlayers } = useMatchStore();
  const { data: match } = useMatchDetail(id);

  useEffect(() => {
    if (match) {
      setConfirmedPlayers(
        match.players.filter(p => p.status === 'CONFIRMADO')
      );
      setAllPlayers(match.players);
    }
  }, [match]);
}
```

---

### S13 — Montar os Times

**Draw/assign teams and initialize scoring:**

```tsx
import { useMatchStore } from '@/stores/matchStore';

export default function TeamsScreen() {
  const { setTeams, initializeMatch } = useMatchStore();

  const handleStartMatch = async () => {
    // After teams are drawn/assigned:
    const teamsData = [
      { id: '1', name: 'Time 1', number: 1, players: [...] },
      { id: '2', name: 'Time 2', number: 2, players: [...] },
    ];

    setTeams(teamsData);

    // Navigate to scoreboard (or S13.5 if 3+ teams)
    router.push(`/matches/${id}/scoreboard`);
  };
}
```

---

### S13.5 — Set Team Picker

**Select which 2 teams play this set:**

```tsx
import { useMatchStore } from '@/stores/matchStore';

export default function SetTeamPicker() {
  const { selectTeamsForSet, teams } = useMatchStore();
  const [selected, setSelected] = useState<string[]>([]);

  const handleConfirm = () => {
    selectTeamsForSet(selected); // Save to store
    // Scores are auto-initialized in store when teams are set
    router.push(`/matches/${id}/scoreboard`);
  };
}
```

---

### S14 — In-Game Scoreboard

**Real-time scoring with persistent state:**

```tsx
import { useMatchStore } from '@/stores/matchStore';

export default function Scoreboard() {
  const {
    scores,
    addPoint,
    undoPoint,
    recordSetResult,
    nextSet,
    getTeamScore,
    currentSet,
  } = useMatchStore();

  const handleAddPoint = (teamId: string) => {
    addPoint(teamId);
    
    // Check if set is won (mock: 15 points)
    if (getTeamScore(teamId) >= 15) {
      recordSetResult(currentSet, teamId);
      
      // Check if match is over (best-of 3 = 2 wins)
      // If yes, navigate to S15; if no, nextSet() and go to S13.5
      if (matchIsOver) {
        router.push(`/matches/${id}/mvp-vote`);
      } else {
        nextSet();
        router.push(`/matches/${id}/scoreboard`); // Back to S13.5
      }
    }
  };

  return (
    <View>
      <Text>{getTeamScore('team-1')}</Text>
      <Button onPress={() => handleAddPoint('team-1')}>+ ponto</Button>
      <Button onPress={() => undoPoint('team-1')}>Desfazer</Button>
    </View>
  );
}
```

---

### S15 — Post-Match MVP Vote

**Vote and persist choice:**

```tsx
import { useMatchStore } from '@/stores/matchStore';

export default function MVPVote() {
  const { voteForMVP, votedForPlayerId, allPlayers } = useMatchStore();

  const handleVote = (playerId: string) => {
    voteForMVP(playerId);
    // Now state persists across navigation/refresh
  };

  return (
    <FlatList
      data={allPlayers}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => handleVote(item.id)}
          style={{
            backgroundColor: votedForPlayerId === item.id ? 'blue' : 'white',
          }}
        >
          <Text>{item.name}</Text>
        </Pressable>
      )}
    />
  );
}
```

---

## Key Features

✅ **Persist state across navigation** — data doesn't reset when you pop back  
✅ **Single source of truth** — all screens read/write to same store  
✅ **No network calls for local state** — scores, votes, selections are instant  
✅ **Helper methods** — `getTeamScore()`, `getMatchWinner()`, `isMatchInProgress()`  
✅ **Organized by screen** — grouped actions for S11, S12, S13, etc.  

---

## Common Patterns

### Check if match is in progress:

```tsx
const inProgress = useMatchStore((s) => s.isMatchInProgress());
```

### Get a team's current score:

```tsx
const score = useMatchStore((s) => s.getTeamScore('team-1'));
```

### Get the 2 teams selected for current set:

```tsx
const playingTeams = useMatchStore((s) => s.getSelectedTeams());
```

### Check match winner (best-of):

```tsx
const winner = useMatchStore((s) => s.getMatchWinner());
```

---

## Reset State

After match completes (S15):

```tsx
const reset = useMatchStore((s) => s.reset);

const handleEndMatch = () => {
  // ... finish voting ...
  reset();
  router.push('/matches'); // Back to home
};
```

---

## Testing

All state changes are **synchronous** and **testable**:

```tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { useMatchStore } from '@/stores/matchStore';

test('addPoint increments score', () => {
  const { result } = renderHook(() => useMatchStore());

  act(() => {
    result.current.setTeams([{ id: '1', ... }]);
    result.current.addPoint('1');
  });

  expect(result.current.getTeamScore('1')).toBe(1);
});
```

---

## Migration Checklist

- [x] S11 (Create Match) — use `setTeamConfig`, `initializeMatch`
- [ ] S12 (Match Detail) — use `setConfirmedPlayers`, `setAllPlayers`
- [ ] S13 (Montar os Times) — use `setTeams`
- [ ] S13.5 (Set Picker) — use `selectTeamsForSet`
- [ ] S14 (Scoreboard) — use `addPoint`, `undoPoint`, `recordSetResult`
- [ ] S15 (MVP Vote) — use `voteForMVP`, `votedForPlayerId`
