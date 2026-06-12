# SCOPE.md — Frontend MVP Constitution

> This file defines which screens are in the MVP and what each screen does.
> The `scope-guardian` uses this as the single source of truth.
> Any screen or screen behavior outside this list is REJECTED.

> The backend SCOPE defines features (F1.1, F2.3, etc.). This SCOPE defines screens that consume those features.

---

## MVP principle

Frontend MVP screens cover backend Layer 1 (Match Core) and Layer 2 (Retention). No screens for Layer 3 (Growth) — those will be added later.

---

## Reference assets (mandatory reading)

Every screen has a reference folder under `docs/references/screens/<screen-id>-<slug>/` containing:

- **`reference.png`** — the visual reference (Claude Design prototype screenshot or brand mockup)
- **`prototype.jsx`** — the React Web prototype component (when one exists)

Some screens have multiple files (e.g. `prototype-detail.jsx` + `prototype-manage.jsx`). Some screens (S1, S3) may have only a print and no `.jsx` — that's flagged per screen below.

The `screen-spec-writer` and `implementer` agents MUST read these files before producing a spec or writing code. The reference is the source of truth for **layout, visual hierarchy, and component composition**. SCOPE.md (this file) remains the source of truth for **behavior, backend dependencies, and what's in/out of MVP**.

When the prototype and SCOPE disagree: **SCOPE wins** (the prototype may show Layer-3 features that this MVP explicitly cuts). The spec must call out the conflict.

---

## Screen catalog (MVP)

### S1 — Splash
- **Reference**: `docs/references/screens/S1-splash/reference.png` *(no prototype .jsx — splash not implemented in the React Web prototype; brand mockup only)*
- **Route**: `app/index.tsx` (or root with redirect logic)
- **Backend deps**: none
- **IN**: brand visual (blue blob + lime wave) per `DESIGN_SYSTEM.md`
- **IN**: centered logo
- **IN**: auto-redirect after auth check (2s max)
- **OUT**: animation that's longer than 2 seconds
- **OUT**: any user interaction

### S2 — Login
- **Reference**: `docs/references/screens/S2-login/reference.png` + `prototype.jsx` (`LoginScreen` from `screens-main.jsx`)
- **Route**: `app/(auth)/login.tsx`
- **Backend deps**: backend Auth module (FA.2, FA.3)
- **IN**: phone number input with country selector default BR (+55)
- **IN**: "Entrar na Quadra" gradient CTA → triggers SMS OTP flow
- **IN**: "Entrar com Google" button → Google Sign-In native flow
- **IN**: "Entrar com Apple" button (iOS only) → Apple Sign-In native flow
- **IN**: "Esqueceu a senha?" link → Cognito-hosted reset flow (opens browser)
- **OUT**: email/password form (Quadra is phone-first)
- **OUT**: signup-as-separate-screen (handled inline by phone flow)

### S3 — SMS Verification
- **Reference**: `docs/references/screens/S3-sms-otp/reference.png` + `prototype.jsx` (`AuthScreen` from `screens-main.jsx`)
- **Route**: `app/(auth)/sms-otp.tsx`
- **Backend deps**: FA.3 (SMS OTP endpoint)
- **IN**: 4 separate digit input boxes auto-advancing
- **IN**: "Verificar" CTA enabled only when all 4 digits filled
- **IN**: "Pedir denovo" link with 30s cooldown
- **IN**: error state for wrong code (shake animation + red border)
- **OUT**: codes longer than 4 digits (locked by Cognito config)

### S4 — Onboarding (post-signup, first time only)
- **Reference**: `docs/references/screens/S4-onboarding/reference.png` (multi-step flow) + `prototype.jsx` (`OnboardingScreen` + `CadastroScreen` from `screens-onboarding.jsx`)
- **Route**: `app/(auth)/onboarding.tsx`
- **Backend deps**: F2.1 (Player Profile creation)
- **IN**: profile photo picker (optional, S3 upload)
- **IN**: name input
- **IN**: primary position dropdown (PON, OPO, LEV, LIB, CEN, OUT)
- **IN**: secondary position dropdown (optional)
- **IN**: skill level self-declaration (Beginner/Intermediate/Advanced)
- **IN**: "Pronto" CTA → POST profile, navigate to Home
- **OUT**: tutorial slides (push to post-MVP)
- **OUT**: contact sync (Layer 3)

### S5 — Home
- **Reference**: `docs/references/screens/S5-home/reference.png` + `prototype.jsx` (`HomeScreen` + `NearbyCard` helper from `screens-main.jsx`)
- **Route**: `app/(tabs)/index.tsx`
- **Backend deps**: F1.7 (nearby matches), F1.1/F1.6 (next matches list)
- **IN**: header with avatar + greeting + notification bell
- **IN**: central "Criar partida" gradient CTA
- **IN**: "Procurar partidas" outline button
- **IN**: "Próximas partidas" horizontal scroll of MatchCardCompact (user's upcoming matches)
- **IN**: "Jogos perto de você" larger MatchCard grid (nearby via Geo module)
- **IN**: bottom tab bar (4 tabs + central FAB)
- **OUT**: stories/feed (Layer 3)
- **OUT**: weather widget, ads, or anything not in the mockup

### S6 — Explore
- **Reference**: `docs/references/screens/S6-explore/reference.png` + `prototype.jsx` (`ExploreScreen` + `ExploreMap` helper from `screens-main.jsx`)
- **Route**: `app/(tabs)/explore.tsx`
- **Backend deps**: F1.7 (matches nearby), Profile (player search — Layer 3, so MOCK)
- **IN**: search bar (free text)
- **IN**: filter chips ("Casual", "Serinho", level filters)
- **IN**: "Partidas na região" 2x2 grid of dark cards
- **IN**: "Quadras próximas" horizontal scroll
- **IN**: "Jogadores" avatars row — **for MVP, return empty state** "Em breve" (player search is Layer 3)
- **OUT**: actual player search (Layer 3)
- **OUT**: arena detail screens (Layer 3)

### S7 — Network (placeholder for MVP)
- **Reference**: `docs/references/screens/S7-network/reference.png` + `prototype.jsx` (`RedeScreen` from `screens-rede.jsx`) — ⚠️ **prototype shows the full feed, but MVP is placeholder only; use prototype only to understand what is NOT being built**
- **Route**: `app/(tabs)/network.tsx`
- **Backend deps**: none
- **IN**: empty state with message "Em breve: rede social de jogadores"
- **OUT**: any actual feed/posts (Layer 3)
- *Justification*: tab is in the navbar mockup but feature is post-MVP. We ship the tab as placeholder.

### S8 — Profile
- **Reference**: `docs/references/screens/S8-profile/reference.png` (header + middle + bottom) + `prototype.jsx` (`ProfileScreen` from `screens-profile.jsx`)
- **Route**: `app/(tabs)/profile.tsx`
- **Backend deps**: F2.1, F2.2, F2.3
- **IN**: header with avatar, greeting, notification bell
- **IN**: "Seu progresso" card with GERAL score (large number) and ACE/BLK/ATA/DEF stats (small)
  - **Note**: ACE/BLK/ATA/DEF stats are Layer 3. For MVP, show static placeholder values with "Em breve" overlay or hide the row entirely. Display GERAL only.
- **IN**: XP bar with Level indicator
- **IN**: "Amigos" dark card with ranking rows (uses group ranking, NOT a friends system — title is misleading in mockup; clarify with PM if blocking)
- **IN**: "Ver tudo" CTA → opens full ranking screen (S9)
- **OUT**: achievement gallery (Layer 3)
- **OUT**: editable fields inline (separate Settings screen, S10)

### S9 — Full Group Ranking
- **Reference**: `docs/references/screens/S9-ranking/reference.png` + `prototype.jsx` (`RankingScreen` from `screens-game.jsx`)
- **Route**: `app/profile/ranking.tsx`
- **Backend deps**: F2.3
- **IN**: list of all players in the selected group with position number, avatar, name, score
- **IN**: highlight on the current user's row
- **IN**: group selector if user belongs to multiple recurring matches
- **OUT**: city/global ranking (Layer 3)

### S10 — Settings (minimal MVP)
- **Reference**: `docs/references/screens/S10-settings/reference.png` + `prototype.jsx` (`SettingsScreen` + `EditProfileScreen` from `screens-settings.jsx`)
- **Route**: `app/profile/settings.tsx`
- **Backend deps**: FA.* (Auth), F2.1 (Profile edit)
- **IN**: edit profile (name, photo, positions)
- **IN**: notification preferences (push on/off — coarse)
- **IN**: logout button
- **IN**: app version info
- **OUT**: granular notification settings per category (post-MVP)

### S11 — Create Match
- **Reference**: `docs/references/screens/S11-create-match/reference.png` + `prototype.jsx` (`CreateScreen` from `screens-detail.jsx`)
- **Route**: `app/matches/create.tsx`
- **Backend deps**: F1.1
- **IN**: form fields per F1.1 spec (name, location, date/time, type, maxPlayers, etc.)
- **IN**: type toggle (Recurring / OneOff) — toggles frequency fields
- **IN**: confirmation window pickers (open/close datetime)
- **IN**: optional price input
- **IN**: optional description
- **OUT**: invite players from this screen (separate flow S12)
- **OUT**: payment processing

### S12 — Match Detail
- **Reference**: `docs/references/screens/S12-match-detail/reference.png` (multiple states) + `prototype-detail.jsx` (`DetailScreen` from `screens-detail.jsx`) + `prototype-manage.jsx` (`ManageScreen` from `screens-manage.jsx` — organizer view)
- **Route**: `app/matches/[id].tsx`
- **Backend deps**: F1.2, F1.3, F1.4, F1.5, F1.6
- **IN**: match info card (venue photo, datetime, location)
- **IN**: presence list with status per player (Confirmado/Recusado/Pendente)
- **IN**: confirm/decline buttons for the current user if Regular
- **IN**: "Join" button if there are DropIn slots open and window is closed
- **IN**: countdown to game start or confirmation window close
- **IN**: tabs: Info | Times (when generated) | Placar (when live) | Resumo (when ended)
- **OUT**: chat (Layer 3)

### S13 — In-Game Teams
- **Reference**: `docs/references/screens/S13-teams/reference.png` + `prototype-teams.jsx` (`TeamsScreen` from `screens-teams.jsx`) + `prototype-auto-result.jsx` (`AutoResultScreen` from `screens-teams.jsx`)
- **Route**: tab inside S12 — `Times`
- **Backend deps**: F1.3
- **IN**: team A and team B displays with player avatars + positions
- **IN**: "Sortear" CTA (organizer only)
- **IN**: manual drag-to-swap players (organizer only) — long press to grab
- **IN**: confirmation before starting the match
- **OUT**: multiple team formats beyond 2 teams

### S13.5 — Set Team Picker (3+ teams only)
- **Reference**: `docs/references/screens/S13.5-set-team-picker/reference.png` + `prototype.jsx` (the "Quem joga este set?" branch inside `GameScreen` from `screens-game.jsx` — extract only that initial conditional render, lines ~170–225)
- **Route**: implemented as the initial state of S14 — same route as scoreboard, rendered conditionally when `teams.length >= 3 && picked.length < 2`
- **Backend deps**: F1.3 (read teams), F1.4 (write set roster)
- **IN**: dark hero header showing set number + "melhor de N"
- **IN**: title "Quem joga este set?" with subtitle "Selecione os dois times que entram em quadra agora"
- **IN**: list of all teams with selection state (1, 2, or unselected); a winning team from the previous set is highlighted with "Venceu o set e continua em quadra" pill
- **IN**: footer pill showing the pairing as it's being built ("Time Azul vs Time Lima")
- **IN**: "Começar partida" gradient CTA — enabled only when exactly 2 teams are picked
- **OUT**: changing the pairing after the set starts (locked until set ends)
- **OUT**: anything related to 2-team matches — this screen is never shown when teams.length === 2

### S14 — In-Game Scoreboard
- **Reference**: `docs/references/screens/S14-scoreboard/reference.png` (live + end-of-set states) + `prototype.jsx` (`GameScreen` from `screens-game.jsx`)
- **Route**: tab inside S12 — `Placar`
- **Backend deps**: F1.4 + Realtime
- **IN**: large set-by-set score display
- **IN**: +/- buttons for each team (organizer only)
- **IN**: SignalR subscription to receive live updates for non-organizers
- **IN**: "Encerrar set" / "Encerrar partida" CTAs
- **OUT**: stats per player per point (Layer 3)

### S15 — Post-Match MVP Vote
- **Reference**: `docs/references/screens/S15-mvp-vote/reference.png` (selection + post-vote states) + `prototype.jsx` (`MVPScreen` from `screens-matchend.jsx`)
- **Route**: `app/matches/[id]/mvp-vote.tsx`
- **Backend deps**: F1.5
- **IN**: list of players from the match (excluding self) with avatar + name
- **IN**: select one → confirm
- **IN**: post-vote state showing "Você votou em X. Aguardando outros jogadores."
- **OUT**: change vote after submitting (locked)

### S16 — Match Summary
- **Reference**: `docs/references/screens/S16-match-summary/reference.png` + `prototype-match-end.jsx` (`MatchEndScreen` from `screens-matchend.jsx` — transition) + `prototype-match-result.jsx` (`MatchResultScreen` from `screens-matchresult.jsx` — summary)
- **Route**: tab inside S12 — `Resumo`
- **Backend deps**: F1.6
- **IN**: final score, duration, MVP highlighted
- **IN**: team compositions
- **IN**: share button (system share sheet — image generation is OUT of MVP)
- **OUT**: generated shareable image (post-MVP)

### S17 — Map of Nearby Matches
- **Reference**: `docs/references/screens/S17-map/reference.png` + `prototype.jsx` (`ExploreMap` component from `screens-main.jsx` — extracted as a standalone function)
- **Route**: `app/explore/map.tsx`
- **Backend deps**: F1.7
- **IN**: full-screen map (react-native-maps)
- **IN**: pins for each match in radius, color-coded by slot availability
- **IN**: tap pin → bottom sheet with match summary + "Ver detalhes" CTA
- **IN**: location permission request flow
- **OUT**: filtering by anything other than radius and slot availability (post-MVP)

---

## What is NOT in MVP frontend

Anything related to:

- Achievements gallery (US 1.2)
- Friend system (US 5.1, 5.2)
- Player rating after match (US 3.3)
- Player search (US 2.2)
- Court/arena detail screens with reviews
- Social feed / posts / stories
- Premium upsell screens
- In-app purchases / billing flows
- Onboarding tutorial carousel
- Push notification preferences (granular)
- Editable advanced stats (ACE/BLK/ATA/DEF input)
- Multi-language (Portuguese only for MVP)
- Light/dark mode toggle (light only)

---

## Guardian evaluation rules (frontend)

The `scope-guardian` rejects a screen spec if:

1. **Screen not in this catalog** → REJECT
2. **Screen behavior leaks Layer 3 features** → REJECT
3. **Hardcoded color/spacing not in DESIGN_SYSTEM.md** → REJECT
4. **New reusable component proposed without checking COMPONENTS.md first** → REJECT
5. **Form not using React Hook Form + Zod** → REJECT
6. **API call not going through TanStack Query** → REJECT
7. **Token persistence using AsyncStorage** → REJECT (security)
8. **Style via `StyleSheet.create` for something achievable with NativeWind** → REJECT
9. **Acceptance criteria not verifiable via RNTL** → REJECT
10. **Screen mentions backend behavior that doesn't exist in backend SCOPE** → REJECT (ask to align backend first)
11. **Spec doesn't reference the assets in `docs/references/screens/<id>/`** (when they exist for that screen) → REJECT — the agent must have read them

If it passes all → APPROVE.
