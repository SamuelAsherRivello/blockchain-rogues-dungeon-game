# Proposal

## Why

The Start Game menu already demonstrates the intended two-mode presentation: readable typography at generous fitted sizes and a compact, still-usable presentation when the shell is small. Settings, Create Character, Create World, and in-game Settings currently combine Start Game positioning with separate or incomplete responsive rules, so dialogs can use the wrong font tier, fail to recompute after resizing, or intermittently show an empty world preview.

## What Changes

- Establish the Start Game presentation as the shared reference for generous and compact menu density.
- Apply the same density decision to menu Settings, Create Character, Create World, and in-game Settings, including normal-weight Settings text matching the Saved Game text size.
- Preserve the existing behavior in which menu dialogs occupy the Start Game rectangle, while making their bounds remain correct when the fitted viewport changes size.
- Keep all dialog content and primary controls inside the fitted viewport, using bounded internal scrolling only where the compact layout cannot fit the complete body.
- Make the Create World preview initialize and redraw reliably after its host has a measurable size, including compact layouts and resize transitions.
- Add focused responsive layout and preview regression coverage, with browser evidence for the visible dialog behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `pixel-game-presentation`: compact landscape menu and dialog typography must use the same large/compact presentation policy, including Settings, character creation, world creation, and in-game Settings.
- `browser-template-layout`: bounded dialogs must preserve their Start Game-relative placement when appropriate and recompute safe dimensions across viewport resizing without clipped controls.
- `world-map-rendering`: the world preview embedded in Create World must reliably render after layout sizing and remain visible when the preview region is resized.

## Impact

- Affected UI components: `rogues-dungeon/src/ui/Dialog.tsx`, `rogues-dungeon/src/ui/style.css`, and the menu/game window integration in `rogues-dungeon/src/game/game.tsx`.
- Affected renderer integration: `rogues-dungeon/src/systems/rendering/babylon-render-system.tsx` and/or the Create World window sizing boundary.
- Affected tests: focused layout tests and browser checks for menu dialogs, resizing, and world preview rendering.
- No new dependencies, persistence formats, gameplay rules, or renderer fallback are required.
