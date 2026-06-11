# COMPONENTS.md — Living Component Catalog

> **Read before creating any new component.** This file is the source of truth for what reusable pieces exist.
> The `implementer` updates this file when it ships a new reusable component.
> The `screen-spec-writer` reads this file to reuse what exists instead of inventing duplicates.

---

## How to use this file

### Before specifying a screen
The spec-writer checks: "Does the screen need a Button? A Card? An Avatar? Is it already here?" If yes → reference by name. If no → propose a new one **in the spec**, justifying why an existing component doesn't fit.

### Before implementing
The implementer checks: "The spec mentions `<MatchCard>`. Is it in the catalog?" If yes → import and use. If no → check the spec for the proposed new component, build it in `src/components/`, and add an entry to this file.

### When updating
Every PR that adds a reusable component MUST add an entry here. The PR is incomplete without it.

---

## Catalog format

Each entry follows this structure:

```markdown
### `<ComponentName>`
- **Path**: `src/components/<category>/<ComponentName>.tsx`
- **Category**: ui | layout | domain
- **Props**: TypeScript interface or signature
- **Used in**: list of screens
- **Example**:
  ```tsx
  <Button variant="primary" onPress={...}>Entrar</Button>
  ```
- **Notes**: behavior nuances, accessibility, variants
```

---

## UI primitives (`src/components/ui/`)

*(empty — will be populated as screens are built)*

<!--
Examples of components that WILL live here:

### `Button`
### `GradientButton`
### `Input`
### `Card`
### `Avatar`
### `Badge`
### `Pill`
### `IconButton`
-->

---

## Layout (`src/components/layout/`)

*(empty — will be populated)*

<!--
### `Screen`               — base safe-area wrapper with default bg
### `Header`               — top header with optional back button + actions
### `BottomTabBar`         — custom bottom nav (4 tabs + central FAB)
### `Section`              — section with title + content slot
-->

---

## Domain components (`src/components/domain/`)

*(empty — will be populated)*

<!--
### `MatchCard`            — image-forward match card with venue, time, slots
### `MatchCardCompact`     — horizontal scroll variant
### `PlayerAvatar`         — circular avatar with position-colored ring
### `ScoreBoard`           — live score display
### `StatBlock`            — labeled stat (e.g. ACE 30)
### `LevelBar`             — XP progress bar with level indicator
### `RankingRow`           — single row of the group ranking
### `PositionBadge`        — colored pill (PON, OPO, LEV, LIB, etc.)
-->

---

## Decision log (when to extract vs inline)

A component goes here ONLY when one of these is true:

1. **Used in ≥ 2 screens** — clear reuse case
2. **Complex enough to deserve its own tests** — e.g. ScoreBoard with set-by-set logic
3. **Encapsulates a design-system primitive** — Button, Card, Avatar

A component does NOT go here when:

- It's a one-off layout piece for a specific screen
- It's a tiny wrapper around a single NativeWind class
- It exists "in case we need it later" — extract only when reuse happens

---

## Naming rules

- `PascalCase` filename matches the export name
- Props interface: `ComponentNameProps`
- No "Component" suffix in the name (`Button`, not `ButtonComponent`)
- Variants live as props (`<Button variant="primary">`), not as separate files (`<PrimaryButton>`)
