# Design

## Context

The menu flow renders Start Game as a normal React window, while Settings and the creation dialogs render through the shared Dialog component. Menu dialogs receive an inline rectangle captured from Start Game; in-game Settings receives a centered position. Responsive CSS currently mixes container-relative tiers with selectors that distinguish menu and game Settings, and the preview uses Babylon Lite inside a flex/grid region whose dimensions can settle after renderer initialization.

## Goals / Non-Goals

**Goals:**

- Use one fitted-viewport density policy for Start Game and every requested dialog.
- Preserve Start Game-relative menu placement and existing in-game Settings centering.
- Recalculate menu dialog geometry after viewport changes.
- Make preview rendering resilient to delayed or changing host dimensions.
- Keep WebGPU-only Babylon Lite rendering, pixel-perfect presentation, and existing scroll ownership intact.

**Non-Goals:**

- Changing gameplay rules, save data, renderer choice, world generation, or orientation behavior.
- Redesigning the visual hierarchy or introducing a third typography mode.
- Adding a fallback renderer or a new UI dependency.

## Decisions

### Share density through fitted-viewport CSS policy

The fitted `#viewport` container remains the source of responsive breakpoints. Shared selectors or density custom properties will cover both `.settings-window--menu` and `.settings-window--game`, plus the shared creation-dialog classes, so the Start Game tier and dialog tier cannot drift. The Settings heading and body controls will use normal-weight text at the same size as the saved-game body text; only the saved-game label remains bold.

An outer-window media query is not sufficient because the project shell is fitted inside browser gutters. Browser viewport width and fitted viewport width can differ substantially.

### Preserve menu bounds while making them live

The dialog positioning boundary will retain the Start Game rectangle for the opening state, but the owning menu flow will update that rectangle when the fitted shell resizes. The Dialog component will continue to receive explicit bounds for menu placement and explicit center coordinates for gameplay placement. Compact safe-area rules may override placement only when the copied rectangle cannot contain the dialog.

This avoids replacing the existing visual transition with a generic centered modal while fixing stale inline geometry.

### Gate preview draw on measurable layout

The preview host and Babylon Lite surface will be treated as a size-dependent rendering boundary. The preview will perform an initial size check, redraw after a `ResizeObserver` reports a usable rectangle, and continue to resize/redraw on later changes. A zero-sized initialization will not be treated as a successful final render.

The world data remains the same campaign object; only surface sizing and redraw timing change. No renderer fallback is introduced.

### Verification strategy

Pure tests will assert the shared responsive selectors, bounds behavior, and preview sizing guard. One focused Playwright check will open the menu flow at generous and compact fitted sizes, inspect dialog rectangles and computed typography, resize while open, and verify that the Create World preview contains a rendered canvas. Broader browser coverage remains for finalization.

## Risks / Trade-offs

- [Risk] Updating bounds during an opening animation could cause a visible jump. -> [Mitigation] Keep the captured rectangle for the current animation frame and apply updated geometry on the next layout/resize cycle.
- [Risk] Internal scrolling could hide a primary action at very small supported dimensions. -> [Mitigation] Keep the action region outside the scrollable body where possible and verify the smallest supported fitted tier.
- [Risk] A preview redraw may run before Babylon resources finish loading. -> [Mitigation] Keep the existing async renderer lifecycle, but make the post-size redraw idempotent and observe renderer readiness before declaring the preview visible.
- [Risk] Existing unrelated worktree edits overlap `style.css`, `game.tsx`, or renderer code. -> [Mitigation] Inspect and patch only the relevant hunks, preserving all unrelated changes.
