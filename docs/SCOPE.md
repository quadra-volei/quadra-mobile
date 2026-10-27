# SCOPE.md — Quadra Mobile

State of the MVP on the `dev` branch, as of 2026-10-06. Reasons for each choice are in
`docs/DECISIONS.md`. The detailed IN/OUT catalog per screen this file used to hold is in
`docs/archive/SCOPE-2026-10-06-catalogo-de-telas.md`.

## Done (all wired to the real API)

| Screen | Route | Notes |
| --- | --- | --- |
| S1 Splash | `app/index.tsx` | Verifies the session, redirects to login, onboarding or home |
| S2 Login | `app/(auth)/login.tsx` | Phone (SMS) and Google; no Apple, no password |
| S3 SMS code | `app/(auth)/sms-otp.tsx` | 6 digits, resend countdown |
| S4 Onboarding | `app/(auth)/onboarding.tsx` | Name, surname, birth date, `@handle` (checked while typing), position, level, modality |
| First-access tour | `src/components/domain/TourOverlay.tsx`, `src/features/tour/` | Once per account, after the location and push questions: a welcome card, then the "+", Explorar, Rede and Perfil highlighted on the tab bar, without leaving the Home; Pular at any step; how the player left it is saved on the account and on the phone; "Ver o tour de novo" in Settings (DECISIONS #190). Not yet: the first-visit tip in each tab and the "Primeiros passos" card on the empty Home |
| S5 Home | `app/(tabs)/index.tsx` | My next confirmed game (one card), my other upcoming matches; "Atividade dos amigos" (up to 5, "Ver tudo" opens `app/activity.tsx`; hidden while following nobody); empty state with the hero (plus the friends' activity when there is some). Nearby matches are only in Explorar. Central "+" in the tab bar opens "Criar partida" / "Criar publicação" |
| S6 Explore | `app/(tabs)/explore.tsx` | Search, "Filtros" sheet (sort, when, distance, format, level, price, open spots) plus quick chips, mini map of the results (always 15 km around the user, only places with games), results grid/list starting at 15 km (DECISIONS #176) |
| S7 Network | `app/(tabs)/network.tsx`, `app/network/new.tsx`, `app/network/[id].tsx`, `app/network/search.tsx`, `app/players/[id].tsx` | Feed in two tabs, "Para você" and "Seguindo" (who I follow): posts with text, one photo and a tied match, invite card with "Participar", the card of a match its organizer shared ("criou a partida"), likes, comments, delete my own, report someone else's post or block its author. New post with text, one photo and either an upcoming open match of mine or one of my last 5 finished. Another player's profile with follow and their card (front and back). Search players by @ |
| S8 Profile | `app/(tabs)/profile.tsx`, `app/profile/history.tsx` | Progress card, network season ranking preview, then recent matches (last 5, MVP badge; "Ver tudo" with more than 5 opens the full history by month, DECISIONS #174, #186) |
| S8b Sua carta | `app/profile/card.tsx` | Collectible card with front and back, tilt by drag or by tilting the phone, holographic light and flip; look by level tier (Clássica 1–9, Prisma 10–19, Holográfica 20+, placeholder art); finish and title saved on the account; shows the profile photo; enlarged view; PNG export of the face shown |
| S9 Ranking | `app/profile/ranking.tsx` | Season ranking: Rede · Grupos · Geral, position and group chips, month arrows with last months' champion, podium, "my standing" card (rank, who to pass, weekly arrow, points by reason), list ordered by points / MVPs / wins whose rows open in place, "Como pontuar" legend, pull to refresh (DECISIONS #117, #184) |
| S10 Settings | `app/profile/settings.tsx`, `edit.tsx`, `notifications.tsx`, `feedback.tsx`, `blocked.tsx`, `app/notifications.tsx` | Edit profile with photo upload or one of the 10 Quadra avatars, theme (light / dark / auto), notification switches (saved on the API), notifications list behind the bell with unread badge (Recentes / Anteriores, unread filter, mark all read, swipe to delete one, clear all), push on the phone (needs Firebase in EAS), "Mostrar minhas atividades" switch, blocked players, feedback form, export my data, delete account, logout |
| S11 Create match | `app/matches/create.tsx` | Address search with free text fallback, recurrence, privacy (open / code / guests), optional cover photo (shown on the S12 hero) |
| S12 Match detail | `app/matches/[id].tsx` | Presence, join, waiting list, guests, invite code; the organizer's "Compartilhar na Rede", "Editar" and "Cancelar" (Detalhes tab; "Encerrar pelada fixa" on the edit screen); a cancelled match says so; says when confirmations open; main button follows the game |
| Edit match | `app/matches/[id]/edit.tsx` | Organizer edits name, description, cover, address, date and time, duration, format, teams (fixed or not), players, level and prices until the game starts |
| Stats sheet | `app/matches/[id]/stats.tsx` | The organizer records cortadas, blocks, aces, salvadas and assistências per player, from the start of the game until the summary; participants read it (#167) |
| S13 Teams | `app/matches/[id].tsx` (Confirmados tab, `TeamsSetup`) | Team setup (count, players per team, draw mode) and draw on the backend (balanced or random), 2 to 4 teams, under the confirmed players; says who fits and who sat out; after the draw the organizer taps a player to move them to another team; the drawn teams are read back from the backend; "Começar partida" waits, disabled, until 15 minutes before the match time (DECISIONS #189) |
| S13.5 + S14 Scoreboard | `app/matches/[id]/scoreboard.tsx` | Pick the pair per set (3+ teams), organizer scores, undo, end set, live refresh over SignalR; organizer taps a team panel to score |
| S15 MVP vote | `app/matches/[id]/mvp-vote.tsx` | One vote (who played, plus the organizer), changeable while open, no guests; organizer closes the vote and generates the summary |
| S16 Summary | `app/matches/[id]/summary.tsx` | Result, sets, MVP, share through the system sheet |
| S17 Map | `app/explore/map.tsx` | Full-screen map. The location permission is asked when the signed-in app opens, in a card over the tabs (DECISIONS #72, #188); the map asks again if it was never answered and points to the settings when denied. An Android build without the Maps key shows the nearby matches as a list. Arenas (DECISIONS #145, #179): only approved ones, from one request per rectangle (`GET /map/items`); round pins, green with the number of public games in the next 7 days (1–4, then 5+; red ring when live) and the kind of place, tap for name, address and every upcoming game there. A game shows once: inside its arena, or as its own pin. Pins are images; arenas without games show only close in (DECISIONS #176); overlapping pins become one group numbered by its places, green when one has a game, that zooms in on tap (DECISIONS #177, #179). A panel dragged up from the bottom counts the area and lists its arenas and games, closest first; "•••" on top while an area loads (DECISIONS #180). Arenas reach the map once the team approves them in "Curadoria de arenas" (Settings, team accounts only; DECISIONS #181) |

## Pending

Waiting on configuration (no code):

- **Google login**: the OAuth client IDs (web, Android, iOS).
- **SMS**: real codes go through Firebase Phone Auth (DECISIONS #133); a build without
  `EXPO_PUBLIC_PHONE_AUTH=firebase` uses the test environment's fixed code.

Neutral placeholders, because the backend has no such data yet:

- "—" for an action nobody recorded (stats sheet, "Meu desempenho", profile averages): not zero (#167).
- Level dots on rosters (absent)

Not built yet:

- **Summary with rotating teams** names each game's winner but not the team it beat (the
  summary keeps no teams per game; backend limit).
- **iOS**: only the Android test APK has been built.

## Out of the MVP

Human rulings (do not build without a new decision):

- **Apple login**: deferred.
- **Self-reported stats**: a player never records their own actions; only the organizer fills
  the match's sheet (#167).
- **Payments**: prices are display-only; money changes hands outside the app.

Rede (social feed, in scope since 2026-10-09, DECISIONS #66 to #83): each next step waits for
the owner's approval. Not built yet: followers / following lists, opening a player from a
roster, a match's posts, several photos, video, posts on a
profile, reporting a comment, notifications for likes, comments and follows.

Never part of the MVP (Layer 3):

- Stories; friend suggestions; contacts sync
- Player search; player rating after a match; per-player OVR on rosters
- Court and arena screens with reviews
- Achievements gallery; city ("Bairro") ranking
- Premium upsell, in-app purchases, billing
- Chat; generated shareable image; onboarding tutorial
- Granular notification settings; languages other than Portuguese
