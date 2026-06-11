# WORKFLOW.md — How to develop the Quadra Mobile

> Quick guide for using the 4-agent system on the frontend.

## Initial setup (one-time)

1. Make sure Node 20+ is installed
2. Install Expo CLI (`npm i -g expo` if you want, but `npx expo` works fine)
3. Install EAS CLI: `npm i -g eas-cli`
4. Have a physical device or simulator/emulator ready (Expo Go is NOT enough — we use Dev Client)
5. Copy every file from this package to your repo root

## First use: scaffold the project

Before running `/screen`, ask Claude Code (in normal chat, no slash command):

> Initialize the Quadra mobile project per `docs/ARCHITECTURE.md` and `CLAUDE.md`:
>
> 1. Run `npx create-expo-app@latest . --template expo-template-blank-typescript`
> 2. Install all locked dependencies from CLAUDE.md
> 3. Configure Expo Router (delete starter files, create `app/_layout.tsx`, etc.)
> 4. Configure NativeWind 4 with `tailwind.config.js` mapping every token from `docs/DESIGN_SYSTEM.md`
> 5. Add `babel.config.js`, `metro.config.js` for NativeWind
> 6. Configure TypeScript strict, path aliases (`@/*` → `src/*`)
> 7. Create the empty folder structure from `ARCHITECTURE.md`
> 8. Create `eas.json` with development profile and a smoke `app.json` with proper bundle IDs
> 9. Run `npm run typecheck` to confirm everything builds clean
>
> Don't implement any screen yet. Stop after confirming a clean build.

Review the result. Then:

```bash
eas build --profile development --platform ios   # or android
```

Install the resulting Dev Client on your device. Then `npx expo start --dev-client` and you're ready.

## Implementing a screen

Example: implementing S1 (Splash):

```
/screen S1 — Splash
```

The flow:

1. `screen-spec-writer` → creates `docs/specs/S1-splash.md`
2. **Pauses for your confirmation**
3. `scope-guardian` → audits
4. If approved, **pauses for confirmation**
5. `implementer` → builds the screen, updates COMPONENTS.md
6. `test-writer` → writes RNTL tests
7. Hands you the diff

## Recommended order for the MVP

Don't follow the screen IDs in arbitrary order. There are dependencies. Suggested sequence:

### Foundation
1. **S1 — Splash** — simple, validates the scaffolding works visually
2. **S2 — Login** — exercises auth flow + Google/Apple SDKs
3. **S3 — SMS Verification** — completes auth
4. **S4 — Onboarding** — first authenticated screen + profile creation

### Tabs skeleton
5. **S5 — Home** — most complex tab, sets the template
6. **S6 — Explore** — second tab
7. **S7 — Network placeholder** — quick win, empty state
8. **S8 — Profile** — fourth tab

### Match flows
9. **S11 — Create Match** — biggest form in the app
10. **S12 — Match Detail** — anchor screen for match flows
11. **S13 — In-Game Teams**
12. **S14 — In-Game Scoreboard** — first SignalR integration
13. **S15 — MVP Vote**
14. **S16 — Match Summary**

### Side flows
15. **S17 — Map**
16. **S9 — Full Ranking**
17. **S10 — Settings**

Each screen builds on the previous (components accumulate in COMPONENTS.md).

## When something goes wrong

| Symptom | What to do |
| --- | --- |
| Guardian rejected | Read the reason. Adjust SCOPE.md or spec. Re-run. Don't bypass. |
| Implementer asks about a token not in DESIGN_SYSTEM.md | Add the token to DESIGN_SYSTEM.md first, then continue. |
| Implementer proposes recreating a component that exists | Stop. Point it to COMPONENTS.md. |
| Test fails on a real bug | The test-writer returns it to the implementer. Let the cycle run. |
| Visual looks off but tests pass | That's expected. Tests verify behavior, not aesthetics. Visual is your call — adjust and ask the implementer to refine. |
| You want to do something out of SCOPE | Update SCOPE.md first, manually. Don't try to bypass the guardian. |
| Dev Client doesn't reflect changes | Rebuild only when native deps change. JS changes hot-reload automatically. |

## Commit pattern

```
feat(<area>): <screen ID> <title>

Refs: S<number> SCOPE.md
```

## Operational best practices

1. **One screen per branch.** `git checkout -b feature/S5-home` before `/screen`.
2. **Visual QA is non-negotiable.** Open the screen on a real device after each `/screen` completes.
3. **Keep COMPONENTS.md alive.** It's the source of truth for reuse. Every PR with new reusable component must update it.
4. **Keep DESIGN_SYSTEM.md alive.** When real design needs a new token (e.g. dark mode later), add it explicitly there before specifying screens that use it.
5. **Run the backend locally** (or pointed at a deployed environment) before testing screens that hit the API.

## Common pitfalls

### "It works in tests but breaks on device"
- Native module not mocked correctly → check `tests/__mocks__/`
- Token retrieval differs between Jest and real device → `expo-secure-store` mock returns `null` by default; tests need to set it explicitly when auth is required

### "Type error after pulling main"
- Backend contract changed and frontend types didn't update → run a backend spec for the affected endpoint and re-sync types manually (or auto-generate from OpenAPI — future enhancement)

### "EAS build takes forever"
- Free tier queues can be long. Use local builds for iteration once setup is stable: `npx expo run:ios` / `npx expo run:android` (still needs prebuild config).

## Metrics for system health

After 2-3 screens:

- ❓ Has the guardian rejected at least once? (If never, it might be too lenient or spec-writer too conservative.)
- ❓ Has the implementer reused existing components from COMPONENTS.md? (If always creating new, the catalog is failing.)
- ❓ Did the tests catch a real bug before merge?
- ❓ How often did you patch the implementation visually after the workflow completed? Lots of patching → add a rule to CLAUDE.md or refine the design system.
