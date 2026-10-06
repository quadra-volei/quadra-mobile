# SCOPE.md — Quadra Mobile

State of the MVP on the `dev` branch, as of 2026-10-06. Reasons for each choice are in
`docs/DECISIONS.md`. The detailed IN/OUT catalog per screen this file used to hold is in
`docs/archive/SCOPE-2026-10-06-catalogo-de-telas.md`.

Layout reference for each screen: the PNGs in `docs/references/screens/<id>/`. When a PNG
shows something listed below as out of the MVP, this file wins.

## Done (all wired to the real API)

| Screen | Route | Notes |
| --- | --- | --- |
| S1 Splash | `app/index.tsx` | Verifies the session, redirects to login, onboarding or home |
| S2 Login | `app/(auth)/login.tsx` | Phone (SMS) and Google; no Apple, no password |
| S3 SMS code | `app/(auth)/sms-otp.tsx` | 6 digits, resend countdown |
| S4 Onboarding | `app/(auth)/onboarding.tsx` | Name, surname, birth date, `@handle` (checked while typing), position, level, modality |
| S5 Home | `app/(tabs)/index.tsx` | My upcoming matches, nearby matches |
| S6 Explore | `app/(tabs)/explore.tsx` | Search, filter chips, map preview, results grid |
| S7 Network | `app/(tabs)/network.tsx` | "Em breve" placeholder, by design |
| S8 Profile | `app/(tabs)/profile.tsx` | Progress card, recent matches (last 5), ranking preview |
| S8b Player card | `app/profile/card.tsx` | Reads the profile |
| S9 Ranking | `app/profile/ranking.tsx` | Ranking of the recurring match where I scored most recently; "Bairro" and "Geral" tabs disabled |
| S10 Settings | `app/profile/settings.tsx`, `edit.tsx`, `notifications.tsx`, `feedback.tsx` | Edit profile with photo upload, theme (light / dark / auto), feedback form, logout |
| S11 Create match | `app/matches/create.tsx` | Address search with free text fallback, recurrence, confirmation window, privacy (open / code / guests) |
| S12 Match detail | `app/matches/[id].tsx` | Presence, join, waiting list, guests, invite code, team setup for the organizer; main button follows the game |
| S13 Teams | `app/matches/[id]/teams.tsx` | Draw on the backend (balanced or random), 2 to 4 teams |
| S13.5 + S14 Scoreboard | `app/matches/[id]/scoreboard.tsx` | Pick the pair per set (3+ teams), organizer scores, undo, end set, live refresh over SignalR |
| S15 MVP vote | `app/matches/[id]/mvp-vote.tsx` | One vote, no guests; organizer closes the vote and generates the summary |
| S16 Summary | `app/matches/[id]/summary.tsx` | Result, sets, MVP, share through the system sheet |
| S17 Map | `app/explore/map.tsx` | Full-screen map, asks for location permission |

## Pending

Waiting on configuration (no code):

- **Google login**: the OAuth client IDs (web, Android, iOS).
- **SMS**: the test environment accepts a fixed code, so the app must not be shared outside
  the team until Twilio is configured on the backend.

Neutral placeholders, because the backend has no such data yet:

- Level / XP bar (Level 1, 0 XP) and "Meu desempenho" in the summary (zeros)
- SRV / REC on the player card (shown equal to the overall)
- Ranking trend arrows and level dots on rosters (absent)

Not built yet:

- **Push notifications**: the notifications screen only stores local preferences; nothing is
  sent or received. The bell has no notification list behind it.
- **Match cover image**: can be picked in the form but is not sent.
- **Manual team adjustment** (drag to swap players): the backend has the endpoint, the app
  only draws.
- **Full match history** ("Ver tudo" on recent matches is inert) and a **group selector** on
  the ranking.
- **Summary with rotating teams** does not say which pair played each set (backend limit).
- **iOS**: only the Android test APK has been built.

## Out of the MVP

Human rulings (do not build without a new decision):

- **Recurring match = one game** (2026-07-03, confirmed 2026-10-06): the backend generates no
  future occurrences, so a ranking holds the points of a single game and there is nothing to
  show as weekly progress.
- **Apple login**: deferred.
- **Per-player stats input** after a game (self-reported ACE/BLK/ATA/DEF): out; the summary
  block is display-only.
- **Payments**: prices are display-only; money changes hands outside the app.

Never part of the MVP (Layer 3):

- Social feed, posts, stories; friends and friend suggestions; contacts sync
- Player search; player rating after a match; per-player OVR on rosters
- Court and arena screens with reviews
- Achievements gallery; city ("Bairro") and global ("Geral") rankings
- Premium upsell, in-app purchases, billing
- Chat; generated shareable image; onboarding tutorial
- Granular notification settings; languages other than Portuguese
