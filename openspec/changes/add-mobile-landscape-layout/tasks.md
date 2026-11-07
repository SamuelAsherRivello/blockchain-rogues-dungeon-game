# Tasks

## 1. Layout selection and sizing

- [x] 1.1 Separate physical platform from desktop/mobile layout selection, expose layout identity for UI styling, and persist the desktop developer preview; verify default, reload, actual mobile, and invalid stored-value behavior with focused tests.
- [x] 1.2 Add mobile landscape fitting from 16:10 through 20:9 while preserving desktop fitting and rotated mobile coordinates; verify endpoints, 19.5:9, and desktop regression in layout tests.
- [x] 1.3 Add the desktop-only L:D / L:M switch and Settings return action; verify preview round trips preserve campaign and preferences and actual mobile does not expose developer controls.

## 2. Mobile composition and interaction

- [x] 2.1 Codify desktop-specific UI structure and styles separately from shared and mobile styles, remove the obsolete portrait layout and mobile work-in-progress block, and implement the mobile title bar, game view, single column, square minimap overlay, and Panels toggle without the status bar; verify both mobile panel states and unchanged desktop composition.
- [x] 2.2 Route mobile taps to existing left-click world actions and ensure essential game actions and dialogs are touch-reachable, with Wait and Sneak deferred as requested; verify tap coordinates, input suppression, and overlay interactions with focused tests.
- [x] 2.3 Hide the three mobile title-bar dropdowns and use mobile defaults regardless of saved values without overwriting desktop preferences; verify mobile zoom 1.0, centered camera, grid-tween movement, desktop restoration, and no platform-specific keys.
- [x] 2.4 Reconcile project guidance and user-facing control documentation with the new mobile behavior; verify obsolete portrait instructions are removed.
- [x] 2.5 Run one focused muted Playwright Edge check after the implementation group for desktop regression, mobile preview, 19.5:9 fitting, and touch interaction.

## 3. Integration verification

- [ ] 3.1 Run npm test and npm run typecheck, and perform the repository-required three-context browser verification; record results and any unavailable WebGPU or fullscreen capability.

  Focused Edge layout checks passed and the in-app browser showed the dungeon with two canvases and no console errors. The separate desktop Edge computer-use browser was unavailable. The full Node suite reported 569 passing and 21 failing tests across existing world-generation, pathfinding, UI and rendering areas; typecheck reported errors in mouse-selection.ts and world-procedural-system.ts. These need reconciliation before this task can be completed.
- [x] 3.2 Verify on the Galaxy A56 when available, including safe areas, side bars, touch and usable controls; record any device-dependent limitation. Reserve the full applicable browser suite for finalization.

  The user confirmed the edge-to-edge change removed the black strip and that tapping a square and the Panels button work on the Galaxy A56. The phone separately reported a WebGPU warning on the local HTTP origin; secure-origin configuration is needed for local testing.
