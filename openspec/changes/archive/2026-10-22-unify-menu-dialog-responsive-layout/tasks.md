# Tasks

## 1. Shared dialog geometry

- [x] 1.1 Update the menu bounds ownership so Settings, Create Character, and Create World retain Start Game-relative placement while refreshing their bounds after fitted-viewport resize; verify with focused Dialog/menu tests that initial bounds and resize updates are applied without changing in-game centered Settings.
- [x] 1.2 Add a shared density contract for generous and compact fitted landscape tiers and apply it to menu Settings, Create Character, Create World, and in-game Settings; verify computed styles or focused CSS assertions cover both Settings variants and keep Settings text normal-weight at the Saved Game text size.

## 2. Dialog content and preview reliability

- [x] 2.1 Adjust dialog body sizing and scroll ownership so compact Settings and creation dialogs keep titles, close controls, and primary actions reachable; verify the existing compact-layout tests and new focused assertions pass at the minimum supported tier.
- [x] 2.2 Make the Create World preview redraw after its host has measurable dimensions and after later resize notifications, without changing the preview campaign; verify a focused renderer/window test covers zero-size initialization followed by a usable-size redraw.

## 3. Browser verification

- [x] 3.1 Run one focused muted Playwright check in Microsoft Edge at generous and compact fitted sizes: open menu Settings, Create Character, and Create World; compare their rectangles with Start Game, inspect typography mode, resize while open, and verify the world preview canvas is rendered.
- [x] 3.2 Run the repository's focused checks (`npm test` and `npm run typecheck`) and record the results; reserve the full applicable browser suite for finalization after this change is complete.
