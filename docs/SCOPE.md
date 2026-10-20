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
| S5 Home | `app/(tabs)/index.tsx` | My next confirmed game (one card), my other upcoming matches; "Atividade dos amigos" (up to 5, "Ver tudo" opens `app/activity.tsx`; hidden while following nobody); empty state with the hero (plus the friends' activity when there is some). Nearby matches are only in Explorar. Central "+" in the tab bar opens "Criar partida" / "Criar publicação" |
| S6 Explore | `app/(tabs)/explore.tsx` | Search, "Filtros" sheet (sort, when, distance, format, level, price, open spots) plus quick chips, mini map of the results, results grid/list |
| S7 Network | `app/(tabs)/network.tsx`, `app/network/new.tsx`, `app/network/[id].tsx`, `app/network/search.tsx`, `app/players/[id].tsx` | Feed in two tabs, "Para você" and "Seguindo" (who I follow): posts with text, one photo and a tied match, invite card with "Participar", the card of a match its organizer shared ("criou a partida"), likes, comments, delete my own, report someone else's post or block its author. New post with text, one photo and either an upcoming open match of mine or one of my last 5 finished. Another player's profile with follow and their card (front and back). Search players by @ |
| S8 Profile | `app/(tabs)/profile.tsx` | Progress card, recent matches (last 5), friends season ranking preview |
| S8b Sua carta | `app/profile/card.tsx` | Collectible card with front and back, tilt, holographic light and flip; finish, title and card photo saved on the account; enlarged view; PNG export of the face shown |
| S9 Ranking | `app/profile/ranking.tsx` | Season ranking (this month): Amigos · Grupos · Geral, position chips, group chips, podium and list open the player, my line with the games I miss (DECISIONS #117) |
| S10 Settings | `app/profile/settings.tsx`, `edit.tsx`, `notifications.tsx`, `feedback.tsx`, `blocked.tsx`, `app/notifications.tsx` | Edit profile with photo upload, theme (light / dark / auto), notification switches (saved on the API), notifications list behind the bell with unread badge, push on the phone (needs Firebase in EAS), "Mostrar minhas atividades" switch, blocked players, feedback form, export my data, delete account, logout |
| S11 Create match | `app/matches/create.tsx` | Address search with free text fallback, recurrence, privacy (open / code / guests), optional cover photo (shown on the S12 hero) |
| S12 Match detail | `app/matches/[id].tsx` | Presence, join, waiting list, guests, invite code; the organizer's "Compartilhar na Rede", "Editar" and "Cancelar" (Detalhes tab); a cancelled match says so; says when confirmations open; main button follows the game |
| Edit match | `app/matches/[id]/edit.tsx` | Organizer edits name, description, cover, address, date and time, duration, format, players, level and prices until the game starts |
| S13 Teams | `app/matches/[id]/teams.tsx` | Team setup (count, players per team, draw mode) and draw on the backend (balanced or random), 2 to 4 teams; says who fits and who sat out; after the draw the organizer taps a player to move them to another team |
| S13.5 + S14 Scoreboard | `app/matches/[id]/scoreboard.tsx` | Pick the pair per set (3+ teams), organizer scores, undo, end set, live refresh over SignalR; organizer taps a team panel to score |
| S15 MVP vote | `app/matches/[id]/mvp-vote.tsx` | One vote (who played, plus the organizer), changeable while open, no guests; organizer closes the vote and generates the summary |
| S16 Summary | `app/matches/[id]/summary.tsx` | Result, sets, MVP, share through the system sheet |
| S17 Map | `app/explore/map.tsx` | Full-screen map. The location permission is asked at the app entry, before the tabs (DECISIONS #72); the map asks again if it was never answered and points to the settings when denied. An Android build without the Maps key shows the nearby matches as a list |

## Pending

Waiting on configuration (no code):

- **Google login**: the OAuth client IDs (web, Android, iOS).
- **SMS**: the test environment accepts a fixed code, so the app must not be shared outside
  the team until Twilio is configured on the backend.

Neutral placeholders, because the backend has no such data yet:

- "Meu desempenho" in the summary (zeros). The Level / XP bar is real since #111.
- SRV / REC on the player card (shown equal to the overall)
- Ranking trend arrows and level dots on rosters (absent)

Not built yet:

- **Push notifications**: the notifications screen only stores local preferences; nothing is
  sent or received. The bell has no notification list behind it.
- **Full match history** ("Ver tudo" on recent matches is inert).
- **Summary with rotating teams** does not say which pair played each set (backend limit).
- **iOS**: only the Android test APK has been built.

## Out of the MVP

Human rulings (do not build without a new decision):

- **Apple login**: deferred.
- **Per-player stats input** after a game (self-reported ACE/BLK/ATA/DEF): out; the summary
  block is display-only.
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
