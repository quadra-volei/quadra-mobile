# PRODUCT.md — Quadra

> Product vision summary.

## What it is

Mobile app for volleyball players that centralizes:
1. Organization of recurring and one-off matches
2. Data-driven gamification (levels, points, ranking, player card)
3. Player community (nearby matches map)

## User profiles (MVP)

- **Organizer**: creates and manages recurring or one-off matches
- **Regular** (`Mensalista`): fixed player in a recurring match, with priority on confirmation
- **DropIn** (`Avulso`): player without fixed bond, fills remaining slots (secondary feature in MVP)

## Pains the MVP solves

- Chaotic confirmation via WhatsApp
- Unbalanced teams formed without criteria
- No stat tracking
- No way to discover open nearby matches
- No progression / identity for amateur players

## Level system

| Level | Criteria | MVP status |
| --- | --- | --- |
| Beginner | < 10 matches | Active |
| Intermediate | 10+ matches and ≥ 1 MVP received | Active |
| Advanced | 30+ matches and > 60% vote average | Only by declaring it at onboarding; earning it is deferred |
| Elite | 50+ matches, 10+ MVPs, top 10% of global ranking | Deferred (needs a global ranking, out of the MVP) |

## Point system

- Confirmed attendance + showed up: +10
- Win: +15
- Voted MVP: +25
- 3 consecutive matches streak: bonus +20 — **not in the MVP** (see `SCOPE.md`)
- First match as DropIn in a new group: +5 — **not in the MVP**

## Monetization (validation only, no implementation in MVP)

Freemium with premium plan ~R$9.90/month. Billing implementation is NOT in the MVP.

## Domain glossary

| Portuguese (product) | English (code) |
| --- | --- |
| Jogo / Partida | Match |
| Organizador | Organizer |
| Mensalista | Regular |
| Avulso | DropIn |
| Carta do Jogador | PlayerCard |
| Janela de Confirmação | ConfirmationWindow |
