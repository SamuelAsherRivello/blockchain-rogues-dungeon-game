# Tasks

## 1. Flexible fitted-frame model

- [x] 1.1 Extend the layout model and fitted-viewport calculation to validate and clamp orientation-specific aspect ranges, preserving centered endpoint gutters; verify with focused `layout.ts` and page-layout unit tests covering both endpoints, an intermediate ratio, and invalid bounds.
- [x] 1.2 Route the selected PC or mobile orientation through its aspect range while retaining the PC-only orientation preview; verify the existing platform and developer-preview assertions pass with range-aware expectations.

## 2. Responsive game-shell geometry

- [x] 2.1 Make the landscape information-panel columns retain their current 16:9 baseline CSS-pixel width for the active shell height and let the world-view region occupy all remaining width; verify CSS/layout assertions prove equal panel widths across 16:10, intermediate, and 16:9 shells.
- [x] 2.2 Preserve the portrait Title, Game, Status, Bottom-content rows and full-width game view throughout the 9:16 through 10:16 range; verify focused compact and portrait layout tests cover both endpoints and an intermediate ratio.

## 3. Browser-visible verification

- [x] 3.1 Update and run focused Playwright aspect and fullscreen checks with `?mute=1` for the landscape and portrait range endpoints and intermediate ratios, confirming fitted bounds, stable panel widths, and a ready world canvas.
- [x] 3.2 Start one project-owned server and verify the changed layout in Playwright CLI with Microsoft Edge, desktop Edge, and the built-in browser as required by `rogues-dungeon/AGENTS.md`; then run `npm test` and `npm run typecheck` and report any unavailable required browser capability.
