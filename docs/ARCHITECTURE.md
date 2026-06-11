# ARCHITECTURE.md — Quadra Mobile Frontend

> Frontend architecture decisions. This is the architectural source of truth for agents.

---

## Overview

React Native client built on Expo SDK with Dev Client. File-based routing via Expo Router. State split between server (TanStack Query) and client (Zustand). Styling via NativeWind.

```
┌─────────────────────────────────────────────────┐
│            Expo Router (file-based)             │
│  app/(auth)  app/(tabs)  app/matches/[id] ...   │
└─────────────────────────────────────────────────┘
                       │
       ┌───────────────┼────────────────┐
       │               │                │
┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│  Components │ │  Features   │ │   Stores    │
│  (catalog)  │ │  (per area) │ │  (Zustand)  │
└──────┬──────┘ └──────┬──────┘ └─────────────┘
       │               │
       └───────┬───────┘
               │
        ┌──────▼──────┐
        │     lib/    │   ← apiClient, authStorage, signalR
        └──────┬──────┘
               │
        ┌──────▼──────────────────────────┐
        │  TanStack Query (server state)  │
        └──────┬──────────────────────────┘
               │
        ┌──────▼──────────────┐
        │  Quadra Backend API │
        │  + SignalR Hub      │
        └─────────────────────┘
```

---

## State strategy

**Two stores. Never blur the line.**

### Server state → TanStack Query

Anything that lives on the backend. Matches list, profile, ranking, notifications. Use:

- `useQuery` for reads
- `useMutation` for writes
- `queryClient.invalidateQueries` after mutations
- Query keys structured as arrays: `['matches', 'nearby', { lat, lon }]`

Every API call lives in a hook in `src/features/<area>/api/`. Components consume the hook, never call the API directly.

### Client state → Zustand

Local UI state that survives across screens or needs to be shared without prop-drilling. Examples:

- Auth state (current user, isAuthenticated)
- UI preferences (active filter, theme — if added later)
- Modal/sheet open state when controlled from outside

One store per concern in `src/stores/`. Don't make a single "app store" — split by domain.

### Component-local state

Plain `useState` for ephemeral UI state that lives only in one component. Form inputs go through React Hook Form, not raw useState.

---

## API client

```typescript
// src/lib/api/client.ts
import { getAccessToken, refreshSession } from '@/lib/auth';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

export async function apiClient<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    await refreshSession();
    // retry once with new token...
  }

  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }

  return response.json();
}
```

Every feature wraps it in typed helpers:

```typescript
// src/features/matches/api/getNearby.ts
export type NearbyMatchesParams = { lat: number; lon: number; radiusKm: number };
export type NearbyMatch = { id: string; name: string; /* ... */ };

export const getNearbyMatches = (params: NearbyMatchesParams) =>
  apiClient<NearbyMatch[]>(`/api/v1/matches/nearby?${qs(params)}`);

export const useNearbyMatches = (params: NearbyMatchesParams) =>
  useQuery({
    queryKey: ['matches', 'nearby', params],
    queryFn: () => getNearbyMatches(params),
    staleTime: 1000 * 60, // 1 min
  });
```

---

## Auth flow

```
User opens app
    ↓
SplashScreen reads token from expo-secure-store
    ↓
Token valid? ──No──→ Login screen
    ↓
   Yes
    ↓
Verify with backend GET /api/v1/auth/me
    ↓
Profile exists? ──No──→ Onboarding
    ↓
   Yes
    ↓
Home (tabs)
```

### Token storage rules

- Access token: `expo-secure-store` under key `quadra.accessToken`
- Refresh token: `expo-secure-store` under key `quadra.refreshToken`
- **NEVER** `AsyncStorage` for tokens — those are clear-text on Android.
- Token refresh on 401: single-flight pattern in `lib/auth/refreshSession.ts`. Multiple concurrent requests share one refresh.

### Logout

`logout()` clears both keys, resets every Zustand store, and `queryClient.clear()`s the cache before redirecting to login.

---

## SignalR (real-time)

Wrapped in `lib/realtime/`:

```typescript
// src/lib/realtime/connection.ts
import * as signalR from '@microsoft/signalr';

let connection: signalR.HubConnection | null = null;

export async function getConnection() {
  if (connection?.state === signalR.HubConnectionState.Connected) {
    return connection;
  }
  connection = new signalR.HubConnectionBuilder()
    .withUrl(`${BASE_URL}/hubs/match`, {
      accessTokenFactory: getAccessToken,
    })
    .withAutomaticReconnect()
    .build();
  await connection.start();
  return connection;
}
```

Each feature exposes a hook for its specific subscriptions:

```typescript
// src/features/matches/realtime/useScoreSubscription.ts
export function useScoreSubscription(matchId: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    let unsubscribe: () => void;
    (async () => {
      const conn = await getConnection();
      await conn.invoke('JoinMatchRoom', matchId);
      const handler = (update: ScoreUpdate) => {
        queryClient.setQueryData(['matches', matchId, 'score'], update);
      };
      conn.on('ScoreUpdated', handler);
      unsubscribe = () => {
        conn.off('ScoreUpdated', handler);
        conn.invoke('LeaveMatchRoom', matchId);
      };
    })();
    return () => unsubscribe?.();
  }, [matchId]);
}
```

---

## Navigation

Expo Router with file-based routing.

```
app/
  _layout.tsx                  # Root layout with providers (QueryClient, etc.)
  index.tsx                    # Splash with redirect logic
  (auth)/
    _layout.tsx                # Auth stack
    login.tsx
    sms-otp.tsx
    onboarding.tsx
  (tabs)/
    _layout.tsx                # Bottom tabs definition + central FAB
    index.tsx                  # Home
    explore.tsx
    network.tsx
    profile.tsx
  matches/
    create.tsx
    [id].tsx                   # Match detail with internal tabs
    [id]/
      mvp-vote.tsx
  explore/
    map.tsx
  profile/
    ranking.tsx
    settings.tsx
```

Navigate via `router.push('/matches/create')`. Type-safe routes via Expo Router's typed routes feature.

---

## Providers (root layout)

`app/_layout.tsx` wraps the app with:

1. `<QueryClientProvider>` — TanStack Query
2. `<GestureHandlerRootView>` — react-native-gesture-handler
3. `<SafeAreaProvider>` — react-native-safe-area-context
4. `<StatusBar>` configuration
5. Auth bootstrap (token check, route guard)

No global Zustand provider needed — Zustand stores work without one.

---

## Environment configuration

`.env` files via Expo:

- `.env` — committed defaults (none secret)
- `.env.local` — gitignored, dev overrides
- `EXPO_PUBLIC_*` prefix for values bundled into the app (URLs)
- Secrets (API keys) belong in EAS Secrets, not in env files

Required variables for MVP:

```
EXPO_PUBLIC_API_URL=https://api.quadra.dev
EXPO_PUBLIC_COGNITO_REGION=us-east-1
EXPO_PUBLIC_COGNITO_USER_POOL_ID=...
EXPO_PUBLIC_COGNITO_APP_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
```

---

## Performance defaults

- `FlatList` over `ScrollView + map` for any list with more than ~10 items
- `memo` only when profiling shows a need — not preemptively
- Images via `expo-image` (better cache than RN's built-in)
- Map markers: clusters via `react-native-maps` props if >50 markers visible

---

## Testing strategy

Same philosophy as backend — pyramid, no E2E in MVP.

| Type | For what | Tool |
| --- | --- | --- |
| **Component** | Reusable components (Button, MatchCard) | RNTL |
| **Hook** | Custom hooks, especially API hooks | `@testing-library/react-hooks` |
| **Integration** | Whole screens with mocked API and navigation | RNTL + MSW |
| **E2E** | NOT IN MVP — Detox comes later | Detox (future) |

Mock the network with MSW. Mock SignalR with manual subs in a test fixture.
