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
| 10 | ~~`EXPO_PUBLIC_DEV_MOCK_AUTH` still skips login~~ — removed later, see #31. | — |


## 2026-10-06 — Block 2: address search in "create match"

| # | Decision | Why |
| --- | --- | --- |
| 11 | The LOCAL field **suggests addresses while typing** (from 3 characters, 350 ms after the last keystroke) through the backend proxy `/api/v1/places`. Picking one fills the field and stores the venue's coordinates in the form (`latitude`/`longitude`). | The match is pinned to the real venue on the map instead of to where the organizer happened to be. |
| 12 | **Free text is still accepted.** If nothing is picked, the search fails or returns nothing, the match is created with the typed text and the device position (block 1 behaviour). Editing the text after picking drops the picked coordinates. | A court inside a condominium or a nickname for a place will not be in any map service; creating a match must never depend on the search. |
| 13 | Suggestions are biased to the device position only when location was already granted (no prompt while typing). | Same rule as Home/Explore. |

## 2026-10-06 — Block 3: in-game (teams, live scoreboard, MVP vote, summary)

| # | Decision | Why |
| --- | --- | --- |
| 14 | The teams draw happens **on the backend**: "Automático" asks for teams balanced by level, "Manual" (the Sortear button) for a random draw. Each draw replaces the previous one. | One source of truth for who is on which team (the scoreboard, the vote and the stats use it). |
| 15 | **"Começar partida" starts the game for real.** With two teams it starts right from the teams screen; with three or four the organizer first picks who plays the first set. | With two teams there is nothing to pick. |
| 16 | The **scoreboard screen follows the game on the backend** instead of route params and local state: not started / playing / waiting for the next pair / ended. It was rewritten on one query (`useLiveGame`); the mocked hooks it used (`getCurrentSet`, `addPoint`, `undoPoint`, `selectTeamsForSet`, `assignTeam`) and their two test files were removed. | The mocked screen kept the score in memory and rebuilt the teams from the player list, so nothing survived leaving the screen and nobody else could watch. |
| 17 | Only the **organizer scores**. A point is sent to the server and the screen shows what the server answers (no optimistic score). Everybody else sees the same screen read-only. | The server applies the volleyball rules (25 points, 2 ahead, deciding set to 15); guessing them on the phone would show a wrong score when a set ends. |
| 18 | **"Desfazer" takes back the last point only**, and "Encerrar set" asks for confirmation and gives the set to whoever is ahead. | Mirrors the backend rules; ending a set early is how a pickup game plays shorter sets. |
| 19 | **Live updates use the SignalR message only as a signal**: on `ScoreboardUpdated` the app re-reads the game over REST. If the hub is unreachable the screen still works, it just does not refresh by itself. | A missed or out-of-order message can never leave a wrong score on screen. |
| 20 | Between sets (3+ teams) the organizer can **"Encerrar partida"**: the team with the most sets wins. | With rotating teams a game may not reach the sets of the format before people leave. |
| 21 | When the game ends everyone goes to the **MVP vote**. Candidates are the players with an account who were on a team (no guests). The organizer has **"Encerrar votação e ver resumo"**, which closes the voting and generates the summary; that is the step that records wins, losses and MVP for everyone. | The backend only writes stats and ranking when the summary is generated. |
| 22 | The match detail's main button follows the game: **"Ver placar ao vivo" → "Votar no MVP" → "Ver resumo"**. A confirmed player who is not the organizer sees "Aguardando o início da partida" (before: "Iniciar partida", which led to a draw they are not allowed to make). | One place to get back into the game from, for everybody. |
| 23 | In the summary, **"MEU DESEMPENHO" shows zeros** (points, blocks, defenses, aces, XP). | The backend records the score by team, not who made each point, and has no XP yet. |
| 24 | In a game with **rotating teams the summary** shows the result and MVP correctly, but its set list does not say which teams played each set. | Backend limitation recorded in its DECISIONS (#30). |

## 2026-10-06 — Block 4: ranking, recent matches, player card

| # | Decision | Why |
| --- | --- | --- |
| 25 | The ranking (profile preview and full screen) is **the ranking of the recurring match where I scored most recently** (`GET /rankings/mine`); empty until I finish one. No trend arrows and no level dot on the rows. | The screens do not pick a group, and the backend has no ranking history (trend) or numeric level. |
| 26 | Because the backend does not generate the next occurrences of a recurring match (earlier human ruling), **a ranking today holds the points of one game**. | Backend DECISIONS #32. |
| 27 | "Partidas recentes" shows the **last 5 finished matches** from the match history; a match appears once its organizer generated the summary. A game ended level shows as **EMPATE** (new, neutral colour). | The backend records history at summary time and has a Draw outcome the app did not have. |
| 28 | The **player card** screen was already real (it reads the profile); nothing changed. | — |

## 2026-10-06 — Block 5: @ check while typing, profile photo

| # | Decision | Why |
| --- | --- | --- |
| 29 | The @ field (onboarding and edit profile) **warns while typing** when the @ belongs to someone else, 400 ms after the last keystroke, from 3 characters. It is a hint only: it does not block the button, and saving still validates on the backend. | Never block a save on a check that may be offline or stale; the save already answers "taken" for real. |
| 30 | **"Trocar foto" uploads the picked photo when saving** the profile (signed URL from the backend, file sent straight to the storage). Where the backend has **no photo storage (the current test environment)** the upload is skipped silently and the profile keeps the photo it had. | Photos are optional in the backend. The upload path is covered by tests but could not be tried against a real bucket. |

## 2026-10-06 — Mock removal: the API is the only data source

| # | Decision | Why |
| --- | --- | --- |
| 31 | **`EXPO_PUBLIC_DEV_MOCK_AUTH` was removed.** There is no mock mode any more; to work on a screen, log in (the test environment's fake SMS code makes that a few seconds). | The shortcut created a session with a fake token. With no mocked data left, every screen under it only showed "could not load" — it had become a trap, not a shortcut. |
| 32 | ~~The feedback form stays mocked~~ — integrated later, see #35. | — |
| 33 | Removed: the unused `matchStore` (a copy of the game kept on the phone that nothing read any more) with its doc, the no-op `latencyMs` options left on the hooks, and the unused `msw` dev dependency. Jest tests keep their own mocks (they stub the hooks or `fetch`) and never touch the network. | Dead code from the mocked phase. |
| 34 | Three pieces of **fake on-screen data** were bound to real data: the ranking screen's group name (was a fixed "Vôlei de quinta") now is the ranked match's name; Explore's badge now reads "N jogos por perto" (was "ao vivo", though nothing said they were live); Explore's preview card now shows the closest real match's distance and price (was a fixed "Beach Vôlei SP ★ 4.9 (341)"). Explore's "Hoje" chip now filters matches that start today (was a no-op). | They looked like data but were literals. |

Placeholders that are NOT mocks (the backend has no such data yet, the app shows a neutral value): Level/XP bar (Level 1, 0 XP), SRV/REC on the card (= overall), "Meu desempenho" in the summary (zeros), ranking trend arrows (absent).

## 2026-10-06 — Feedback form

| # | Decision | Why |
| --- | --- | --- |
| 35 | "Enviar feedback" (Perfil → Configurações) **sends to the backend** (`POST /api/v1/feedback`): the type and message of the form plus the app version (from `app.json`) and the platform. A failed send shows the reason on the screen (no connection, daily limit, expired session). | The backend now stores feedback. Version and platform place a reported problem without asking the user. With this there is no mocked call left in the app. |


## 2026-10-06 — Test APK

| # | Decision | Why |
| --- | --- | --- |
| 36 | The EAS **`preview` profile builds an installable APK that talks to the hosted test API** (`EXPO_PUBLIC_API_URL` in the profile's `env`). | A phone build that needs no computer running. The URL is not a secret. |
| 37 | The **Google Maps Android key comes from the `GOOGLE_MAPS_ANDROID_API_KEY` environment variable** (`app.config.js`), never from a committed file. Without it the build still works, but the map screen is blank. | A standalone build needs its own Maps key (Expo Go brings one); keys do not belong in the repository. |
| 38 | **To build the test APK again**: in this folder, logged in to EAS as the project owner `ojohnyzada` (`npx eas-cli whoami`), run `npx eas-cli build -p android --profile preview --non-interactive --no-wait`. EAS builds in the cloud and the build page has the install link/QR code. No local gradle build. | The project belongs to `ojohnyzada`; any other account gets "Entity not authorized". Do not run `eas init` to work around it: it changes the `projectId` and the signing key. |

## 2026-10-06 — Profile photo upload fix

| # | Decision | Why |
| --- | --- | --- |
| 38 | The picked photo is sent to the signed URL **by URI** (`body: { uri, type, name }`, which React Native streams from disk) instead of being read first with `fetch(localUri).blob()`. | The backend and the storage were verified end to end; the upload failed on the phone, where reading a `file://` URI through `fetch` breaks on Android builds. No new package. |
| 39 | The edit-profile screen shows **the reason of a failed save** (which step: preparing the upload, sending the photo with its HTTP status, no connection, @ taken) instead of one fixed sentence. A failed photo upload does not save the profile without the photo. | The fixed sentence hid which step had failed. |
| 40 | Correction of #38: the photo is uploaded with **`uploadAsync` from `expo-file-system/legacy`** (binary content, PUT). The `{ uri, type, name }` raw body of #38 did not work on a real phone: React Native only understands that shape inside multipart FormData. The URL is now requested for the file's real type (jpeg / png / webp, by extension). The technical error shown under the friendly text during testing was removed once the upload was confirmed on a phone (2026-10-06). | Verified on a phone that #38 threw on the PUT. The signed storage URL needs the raw file as the body, which only the native uploader can stream. |
