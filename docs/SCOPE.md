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

Each screen has a folder under `docs/references/screens/<screen-id>-<slug>/` containing one or more **PNG screenshots** from the Claude Design prototype (named descriptively — e.g. `inicio.png`, `partida-time-automatico.png`). Multi-state screens have multiple files; the `Reference:` line per screen below lists them all.

The PNG screenshots are the **only** reference assets. There is no prototype source code to read — the screenshots alone drive layout and visual hierarchy.

The `screen-spec-writer` and `implementer` agents MUST study the PNG(s) before producing a spec or writing code. The screenshots are the source of truth for **layout and visual hierarchy**. SCOPE.md (this file) remains the source of truth for **behavior, backend dependencies, and what's in/out of MVP**.

When the prototype and SCOPE disagree: **SCOPE wins** (the prototype may show Layer-3 features that this MVP explicitly cuts). The spec must call out the conflict.

---

## Screen catalog (MVP)

### S1 — Splash
- **Reference**: `docs/references/screens/S1-splash/splash.png` *(brand mockup only)*
- **Route**: `app/index.tsx` (or root with redirect logic)
- **Backend deps**: FA.2 (`GET /api/v1/auth/me` — token validation and profile existence check)
- **IN**: brand visual — dark navy gradient background, centered logo mark + wordmark + tagline
- **IN**: centered logo
- **IN**: progress bar + "CARREGANDO" label while auth check runs
- **IN**: auto-redirect after auth check (2s max)
- **OUT**: blue blob / lime wave decorative shapes (removed per final brand mockup `splash.png`)
- **OUT**: animation that's longer than 2 seconds
- **OUT**: any user interaction

### S2 — Login
- **Reference**: `docs/references/screens/S2-login/login.png` (welcome/intro state) + `docs/references/screens/S2-login/login-acesse-sua-conta.png` (phone login bottom sheet)- **Route**: `app/(auth)/login.tsx`
- **Backend deps**: backend Auth module (FA.2, FA.3)
- **IN**: welcome/intro state — logo + wordmark, display headline "O JOGO COMEÇA AQUI.", subtitle, single "Entrar e jogar" CTA that opens the phone login bottom sheet
- **IN**: phone login bottom sheet ("ACESSE SUA CONTA") — phone number input with country selector default BR (+55)
- **IN**: "Entrar na Quadra" gradient CTA → triggers SMS OTP flow
- **IN**: "Entrar com Google" button → Google Sign-In native flow
- **OUT**: "Entrar com Apple" — not in the current mockup; defer until design adds it (keep iOS-only when introduced)
- **OUT**: "Esqueceu a senha?" link — appears in the mockup but is stale; Quadra is phone-first/passwordless (forgot-password removed from scope)
- **OUT**: email/password form (Quadra is phone-first)
- **OUT**: signup-as-separate-screen (handled inline by phone flow)

### S3 — SMS Verification
- **Reference**: `docs/references/screens/S3-sms-otp/sms-otp.png` + `sms-otp-preenchido.png` (filled state)- **Route**: `app/(auth)/sms-otp.tsx`
- **Backend deps**: FA.3 (SMS OTP endpoint)
- **IN**: title "CONFIRME SEU NÚMERO" + subtitle echoing the phone entered ("Enviamos um código de 4 dígitos por SMS para +55 (XX) ...")
- **IN**: 4 separate digit input boxes auto-advancing
- **IN**: "Verificar" CTA enabled only when all 4 digits filled (gradient when enabled, grey when disabled)
- **IN**: "Reenviar código" link — disabled with countdown ("Reenviar em 0:26", ~30s) then becomes active
- **IN**: "Usar outro número" link → back to S2
- **IN**: error state for wrong code (shake animation + red border) — no mockup reference; follow DESIGN_SYSTEM error tokens
- **OUT**: codes longer than 4 digits (locked by Cognito config)

### S4 — Onboarding (post-signup, first time only)
- **Reference**: `docs/references/screens/S4-onboarding/dados-pessoais-cadastro.png` (personal data), `dados-posicao.png` (Passo 1/3 — position), `dados-nivel-jogo-cadastro.png` (Passo 2/3 — level), `dados-modalidade-favorita-cadastro.png` (Passo 3/3 — modality), `dados-perfil-pronto.png` (completion)- **Route**: `app/(auth)/onboarding.tsx`
- **Backend deps**: F2.1 (Player Profile creation) — ⚠️ new profile fields (`@handle`, `lastName`, `birthDate`, `modality`) must exist in the backend Profile model; align backend SCOPE before building
- **IN**: multi-step wizard with progress header ("MONTE SEU PERFIL" / "Passo X de 3")
- **IN**: personal-data step — NOME + SOBRENOME (split), DATA DE NASCIMENTO, APELIDO/@handle ("SEU @ NA QUADRA", used across the app) → "Continuar"
- **IN**: position step (Passo 1/3) — single-select grid of 6 cards: LEV (Levantador), PON (Ponteiro), OPO (Oposto), CEN (Central), LIB (Líbero), COR (Coringa, "joga em qualquer posição"); no secondary position
- **IN**: level step (Passo 2/3) — skill self-declaration (Iniciante / Intermediário / Avançado)
- **IN**: modality step (Passo 3/3) — Vôlei de quadra (6x6) vs Vôlei de praia (2x2)
- **IN**: completion screen ("PERFIL PRONTO!") summarizing posição/nível/modalidade → "Entrar na quadra" CTA → POST profile, navigate to Home
- **OUT**: profile photo picker — NOT in the onboarding mockup; photo is set later in S10 (Editar perfil)
- **OUT**: secondary position (dropped — single position only)
- **OUT**: tutorial slides (push to post-MVP)
- **OUT**: contact sync (Layer 3)

### S5 — Home
- **Reference**: `docs/references/screens/S5-home/inicio.png`- **Route**: `app/(tabs)/index.tsx`
- **Backend deps**: F1.7 (nearby matches), F1.1/F1.6 (next matches list)
- **IN**: header with "INÍCIO" title + notification bell + theme toggle (sol/lua) — no avatar/greeting on this screen
- **IN**: "Bora pra quadra?" card wrapping the two primary CTAs
- **IN**: central "Criar partida" gradient CTA
- **IN**: "Procurar partidas" outline button
- **IN**: "Próximas partidas" horizontal scroll of MatchCardCompact (user's upcoming matches)
- **IN**: "Jogos perto de você" larger MatchCard grid (nearby via Geo module)
- **IN**: bottom tab bar (4 tabs + central FAB)
- **OUT**: stories/feed (Layer 3)
- **OUT**: weather widget, ads, or anything not in the mockup

### S6 — Explore
- **Reference**: `docs/references/screens/S6-explore/explorar.png`- **Route**: `app/(tabs)/explore.tsx`
- **Backend deps**: F1.7 (matches nearby), Profile (player search — Layer 3, so MOCK)
- **IN**: header "EXPLORAR" + notification bell + theme toggle
- **IN**: search bar (free text) — "Buscar quadra, bairro ou horário..."
- **IN**: filter chips — "Todos", "Perto", "Hoje", "Iniciante", "6x6" (selection chips; replaces the old "Casual/Serinho")
- **IN**: integrated map preview with match pins, "N jogos ao vivo" badge and a selected-venue card with "Ver" CTA (inline preview; the full-screen map is S17)
- **IN**: "N partidas encontradas" + grade/list toggle + 2-col grid of dark match cards (format, level, distance, players, price)
- **OUT**: "Quadras próximas" / "Jogadores" sections — omit for MVP (player search is Layer 3); revisit if design confirms a below-fold venues carousel
- **OUT**: actual player search (Layer 3)
- **OUT**: arena/venue detail screens (Layer 3)

### S7 — Network (placeholder for MVP)
- **Reference**: `docs/references/screens/S7-network/rede.png` — ⚠️ **screenshot only**; the mockup shows the full social feed, but MVP is placeholder only — use it only to understand what is NOT being built
- **Route**: `app/(tabs)/network.tsx`
- **Backend deps**: none
- **IN**: empty state with message "Em breve: rede social de jogadores"
- **OUT**: any actual feed/posts (Layer 3)
- *Justification*: tab is in the navbar mockup but feature is post-MVP. We ship the tab as placeholder.

### S8 — Profile
- **Reference**: `docs/references/screens/S8-profile/perfil.png` (header + middle + bottom)- **Route**: `app/(tabs)/profile.tsx`
- **Backend deps**: F2.1, F2.2, F2.3, F1.6 (match history)
- **IN**: header with avatar + greeting ("Olá, NOME") + notification bell + theme toggle
- **IN**: "Seu progresso" card with GERAL score (large number) and the ACE/BLK/ATA/DEF stats grid (small, 2×2)
  - **Note**: the ACE/BLK/ATA/DEF stats grid is now shown (owner decision 2026-07-08, matching the prototype). Values come from the profile progress payload (mocked until F2.2). The full 6-stat set (adds SRV/REC) appears on the player card (see below).
- **IN**: XP bar with Level indicator (mockup: "Level 15 — XP 2.450 / 5.000")
- **IN**: "MINHAS PARTIDAS" — list of recent matches with result (Vitória/Derrota + set score) + "Ver tudo" (read-only history via F1.6)
- **IN**: "Meus amigos / Ranking semanal" dark card with ranking rows (uses group ranking, NOT a friends system — title is misleading in mockup; clarify with PM if blocking)
- **IN**: "Ver tudo" CTA → opens full ranking screen (S9)
- **IN**: "Ver tudo" on MINHAS PARTIDAS — present (matches the prototype) but inert until a full match-history screen exists (none in MVP)
- **IN**: "Ver a sua carta" CTA → player card screen **S8b** (`app/profile/card.tsx`) — GERAL + position tag, photo, name/@handle·posição, 6-stat grid (ACE/BLK/ATA/DEF/SRV/REC), share, premium note (owner decision 2026-07-08)
- **OUT**: "Sugestão de amigos" / friend suggestions (friends system, Layer 3)
- **OUT**: "Conquistas" / achievement gallery (Layer 3)
- **OUT**: editable fields inline (separate Settings screen, S10)

### S9 — Full Group Ranking
- **Reference**: `docs/references/screens/S9-ranking/amigos-ranking.png` — ⚠️ **screenshot only**
- **Route**: `app/profile/ranking.tsx`
- **Backend deps**: F2.3
- **IN**: header "RANKING" + notification bell + theme toggle
- **IN**: scope tabs — for MVP only the "Amigos" (group) tab is functional; "Bairro" and "Geral" are shown disabled / "Em breve" (city/global ranking is Layer 3)
- **IN**: top-3 podium visual (1º center, 2º/3º sides) with avatar, name, score
- **IN**: ranked list (position 4+) with avatar, name, @handle · position, score and trend indicator (↑/↓/—)
- **IN**: highlight on the current user's row ("· você")
- **IN**: group selector if user belongs to multiple recurring matches (within the "Amigos" tab)
- **OUT**: "Bairro" (city) and "Geral" (global) rankings (Layer 3) — tabs visible but disabled

### S10 — Settings (minimal MVP)
- **Reference**: `docs/references/screens/S10-settings/perfil-configuracoes.png` (settings list) + `perfil-editar.png` (edit profile)- **Route**: `app/profile/settings.tsx`
- **Backend deps**: FA.* (Auth), F2.1 (Profile edit)
- **IN**: profile summary card (avatar, name, @handle · position)
- **IN**: "Editar perfil" → photo ("Trocar foto"), NOME + SOBRENOME, APELIDO/@handle, DATA DE NASCIMENTO, NÚMERO DE TELEFONE, POSIÇÃO EM QUADRA (single-select chips: Levantador/Oposto/Ponteiro/Central/Líbero/Coringa) → "Salvar alterações"
- **IN**: "Aparência" theme selector — Claro / Escuro / Automático (dark mode is in MVP — requires dark tokens in DESIGN_SYSTEM.md)
- **IN**: "Notificações" preferences (push on/off — coarse: convites, lembretes, ranking)
- **IN**: "Permissões do app" (localização, câmera, contatos) — links to OS settings
- **IN**: "Enviar feedback" entry
- **IN**: logout button ("Sair da conta")
- **IN**: app version info ("Sobre o Quadra vX.Y.Z")
- **OUT**: "Pagamentos e Premium" / subscription (Layer 3 — billing/upsell)
- **OUT**: granular notification settings per category (post-MVP)

### S11 — Create Match
- **Reference**: `docs/references/screens/S11-create-match/partida-criar-formulario.png` (form) + `partida-criada.png` (success state)- **Route**: `app/matches/create.tsx`
- **Backend deps**: F1.1
- **IN**: cover image picker ("Trocar capa")
- **IN**: NOME DA PARTIDA
- **IN**: LOCAL — "Buscar quadra ou endereço"
- **IN**: QUANDO — quick date chips (Hoje / Amanhã / Sex / Sáb / +) + time
- **IN**: FORMATO toggle (2x2 / 4x4 / 6x6)
- **IN**: NÍVEL (Iniciante / Intermediário / Avançado)
- **IN**: VAGAS & VALOR — players count + optional price per person
- **IN**: PRIVACIDADE — "Partida aberta" toggle (anyone can take open slots)
- **IN**: type toggle (Recurring / OneOff) + confirmation window pickers (open/close datetime) — **required by backend F1.1 but NOT in the current mockup**; ⚠️ DESIGN GAP — design must add these before build (or backend SCOPE must move them to post-MVP)
- **IN**: success state ("PARTIDA CRIADA!") with "Ver a partida criada" / "Convidar jogadores" / "Voltar ao início" CTAs
- **OUT**: optional description (not in mockup)
- **OUT**: invite players inline — the "Convidar jogadores" CTA opens a separate flow
- **OUT**: payment processing

### S12 — Match Detail
- **Reference**: `docs/references/screens/S12-match-detail/partida-visa-paricipante.png` (participant view) + `partida-visao-organizador.png` (organizer view)- **Route**: `app/matches/[id].tsx`
- **Backend deps**: F1.2, F1.3, F1.4, F1.5, F1.6
- **IN**: single-scroll layout (no tab bar in the mockup) — match info card (cover photo, format/level tags, name, datetime, location, distance) + organizer line
- **IN**: presence list ("CONFIRMADOS N/M") with avatars + empty "vaga" slots; status per player (Confirmado/Recusado/Pendente)
- **IN**: confirm/decline for the current user if Regular ("Confirmar presença")
- **IN**: "Join" if there are DropIn slots open and window is closed
- **IN**: countdown to game start or confirmation window close
- **IN**: organizer view (`partida-visao-organizador.png`) — "VOCÊ ORGANIZA" badge, "Convidar", and the team-setup entry embedded here: team count (2/3/4 times), players-per-team stepper, draw mode (Manual / Automático), "Montar os times" CTA → S13
- **NOTE**: S13 (teams), S14 (scoreboard) and S16 (summary) are reached as **separate navigated screens** from here, NOT as tabs (the prototype renders each as its own full screen). The earlier "Info | Times | Placar | Resumo" tab model is dropped.
- **OUT**: per-player OVR ratings shown in the mockup (Layer 3)
- **OUT**: chat (Layer 3)

### S13 — In-Game Teams
- **Reference**: ⚠️ **no dedicated screenshot exists** for this screen. The team-setup UI is shown inside `docs/references/screens/S12-match-detail/partida-visao-organizador.png` (organizer view); use it as the visual reference.
- **Route**: separate screen reached from S12 organizer view ("Montar os times") — not a tab
- **Backend deps**: F1.3
- **IN**: team displays (2, 3 or 4 teams per the organizer's choice) with player avatars + positions
- **IN**: "Sortear" / draw CTA (organizer only) — Manual or Automático (balanced by level/overall), mode chosen in S12
- **IN**: manual drag-to-swap players (organizer only) — long press to grab
- **IN**: confirmation before starting the match
- **NOTE**: 3+ teams flow continues into S13.5 (set team picker); 2 teams goes straight to S14
- **OUT**: team formats beyond 4 teams

### S13.5 — Set Team Picker (3+ teams only)
- **Reference**: `docs/references/screens/S13.5-set-team-picker/partida-quem-joga-set.png` — ⚠️ **screenshot only**
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
- **Reference**: `docs/references/screens/S14-scoreboard/partida-placar.png` — ⚠️ **screenshot only**
- **Route**: separate screen reached from S12 — not a tab
- **Backend deps**: F1.4 + Realtime
- **IN**: "AO VIVO" indicator + elapsed timer + "Set N - melhor de M"
- **IN**: large two-team score display (Team A vs Team B)
- **IN**: "+ ponto" button per team + global "Desfazer" (undo) — organizer only
- **IN**: SignalR subscription to receive live updates for non-organizers
- **IN**: "Encerrar set" / "Encerrar partida" CTAs
- **OUT**: stats per player per point (Layer 3)

### S15 — Post-Match MVP Vote
- **Reference**: `docs/references/screens/S15-mvp-vote/partida-votacao-mvp.png`
- **Route**: `app/matches/[id]/mvp-vote.tsx`
- **Backend deps**: F1.5
- **IN**: list of players from the match with avatar + name (self is shown but locked — cannot vote for yourself)
- **IN**: select one → confirm ("Selecione o MVP")
- **IN**: post-vote state showing "Você votou em X. Aguardando outros jogadores."
- **OUT**: per-player stats (PON/BLO/DEF/ACE) shown on each card in the mockup (Layer 3) — hide for MVP
- **OUT**: change vote after submitting (locked)

### S16 — Match Summary
- **Reference**: `docs/references/screens/S16-match-summary/partida-resumo.png` (summary) + `partida-encerrar-estatisticas.png` (post-game personal stats input)- **Route**: separate screen reached from S12 — not a tab
- **Backend deps**: F1.6
- **IN**: result header (format tag + Vitória/Derrota), match name, venue · date, final score + per-set scores (25-19, 23-25, ...)
- **IN**: "MVP MAIS VOTADO" highlighted + vote ranking (top-voted players with counts)
- **IN**: share button (system share sheet — image generation is OUT of MVP)
- **IN**: "MEU DESEMPENHO" block — read-only personal stats for the match: XP gained card + Pontos/Blocks/Defesas/Aces tiles, fed by the (server-computed) summary. Decision flipped by PM 2026-07-04 to show these on the summary.
- **OUT**: per-player stats **input** (`partida-encerrar-estatisticas.png` — self-reported ACE/BLK/ATA/DEF entry). The MEU DESEMPENHO block is display-only; the values come from the backend, not a user input screen.
- **OUT**: team compositions (not in the mockup) / match duration (not shown)
- **OUT**: generated shareable image (post-MVP)

### S17 — Map of Nearby Matches
- **Reference**: ⚠️ no dedicated full-screen-map screenshot exists (`docs/references/screens/S17-map/explorar.png` is a copy of the S6 Explore screen). Use the inline map in `docs/references/screens/S6-explore/explorar.png` for pin/card style.
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
