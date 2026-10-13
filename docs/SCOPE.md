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
| S5 Home | `app/(tabs)/index.tsx` | My upcoming matches, nearby matches |
| S6 Explore | `app/(tabs)/explore.tsx` | Search, filter chips, map preview, results grid |
| S7 Network | `app/(tabs)/network.tsx`, `app/network/new.tsx`, `app/network/[id].tsx`, `app/players/[id].tsx` | Feed in two tabs, "Para você" and "Amigos" (who I follow): posts with text, one photo and a tied match, invite card with "Participar", automatic cards (created a match, confirmed presence), likes, comments, delete my own. New post with text, one photo and either an upcoming open match of mine or one of my last 5 finished. Another player's profile with follow |
| S8 Profile | `app/(tabs)/profile.tsx` | Progress card, recent matches (last 5), ranking preview |
| S8b Player card | `app/profile/card.tsx` | Reads the profile |
| S9 Ranking | `app/profile/ranking.tsx` | Ranking of the recurring match where I scored most recently; "Bairro" and "Geral" tabs disabled |
| S10 Settings | `app/profile/settings.tsx`, `edit.tsx`, `notifications.tsx`, `feedback.tsx` | Edit profile with photo upload, theme (light / dark / auto), feedback form, logout |
| S11 Create match | `app/matches/create.tsx` | Address search with free text fallback, recurrence, privacy (open / code / guests) |
| S12 Match detail | `app/matches/[id].tsx` | Presence, join, waiting list, guests, invite code; says when confirmations open; main button follows the game |
| S13 Teams | `app/matches/[id]/teams.tsx` | Team setup (count, players per team, draw mode) and draw on the backend (balanced or random), 2 to 4 teams; says who fits and who sat out |
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

Rede (social feed, in scope since 2026-10-09, DECISIONS #66 to #79): each next step waits for
the owner's approval. Not built yet: followers / following lists, opening a player from a
roster or the ranking, friends ranking, a match's posts, several photos, video, posts on a
profile, reporting a post, notifications for likes, comments and follows.

Never part of the MVP (Layer 3):

- Stories; friend suggestions; contacts sync
- Player search; player rating after a match; per-player OVR on rosters
- Court and arena screens with reviews
- Achievements gallery; city ("Bairro") and global ("Geral") rankings
- Premium upsell, in-app purchases, billing
- Chat; generated shareable image; onboarding tutorial
- Granular notification settings; languages other than Portuguese
