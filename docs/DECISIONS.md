# Decisions

Decisions taken while wiring the app to the real API without stopping to ask. Each one is the
recommended default and can be reversed. Backend-side decisions live in
`quadra-api/docs/DECISIONS.md`.

Format: date · decision · why.

## 2026-10-06 — Block 1: matches (create, lists, detail, presence, guests)

| # | Decision | Why |
| --- | --- | --- |
| 1 | The matches hooks (`useCreateMatch`, `useUpcomingMatches`, `useNearbyMatches`, `useMatchDetail`, `useConfirmPresence`, `useDeclinePresence`, `useJoinMatch`, `useAddGuest`) call the API; their signatures and the screen models (`UpcomingMatch`, `NearbyMatch`, `MatchDetail`) did not change. The session stores that stood in for the backend (`createdMatchesStore`, `presenceStore`, `guestsStore`) were deleted. | Screens and their tests keep working; one mapping layer (`src/features/matches/api/matchesApi.ts`) translates the API. |
| 2 | **A created match is pinned to where the organizer is** when they create it (asks for location permission on submit; São Paulo centre if denied). | The LOCAL field is free text and the backend requires coordinates. Temporary: block 2 (address search) replaces it with the venue's own coordinates. |
| 3 | The cover image picked in the create form is **not sent**. | The backend has no match cover and no photo storage is configured. |
| 4 | Home and Explore search **around the device only when location permission was already granted**; otherwise around São Paulo centre. They never prompt — the map screen (S17) owns the permission request. | Keeps the S5/S6 "no permission prompt" rule while showing real nearby matches to who already allowed location. |
| 5 | On the match detail, someone who is not in the match sees **"Entrar na partida" whenever the backend says they may join** (also while the confirmation window is open, not only after it closes). A full match puts them on the waiting list and the footer shows their place. | Follows the backend rule that anyone joins an open match by confirming. |
| 6 | A **private match by code** shows a code field + "Entrar com o código" to visitors; the organizer's share message includes the code. | The smallest UI that makes the "código de convite" option of the create form usable end to end. |
| 7 | The organizer is shown as a pending Regular until they confirm ("Vou jogar"). | Organizing is not playing — same behaviour the mocked screen had. |
| 8 | Player level dots are **not shown on the roster** for now. | The roster API returns the level tier (Beginner…), not the numeric level the dot encodes; the numeric level does not exist in the backend yet. |
| 9 | Refused actions on the detail (wrong code, confirmations not open, match full) show the backend's reason as a line above the footer buttons. | Before, the mocked mutations could not fail, so there was no error surface. |
| 10 | `EXPO_PUBLIC_DEV_MOCK_AUTH` still skips login, but matches screens now need a real session to load. | There is no mocked match data left to show. |

Still mocked after this block: teams/draw, scoreboard, MVP vote, summary (block 3), ranking, history and player card (block 4).
