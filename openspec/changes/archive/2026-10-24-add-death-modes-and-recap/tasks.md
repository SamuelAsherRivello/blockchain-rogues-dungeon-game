# Tasks

## 1. Campaign contracts and migration

- [x] 1.1 Extend campaign types, factories, compact-save normalization, and save summaries with immutable mode, versioned level-entry/checkpoint recovery state, and legacy-to-Adventure migration with raw backup; verify focused save/migration tests preserve valid pre-mode campaigns and reject malformed recovery data safely.
- [x] 1.2 Implement pure mode-aware recovery builders for Classic clearing, Adventure current-level retry, and Journey checkpoint restoration; verify focused procedural tests cover retained progression, cleared run possessions, reset resources/time/counters/discovery, exact checkpoint restoration, and non-resumable Classic death.
- [x] 1.3 Replace immediate in-domain reset with a structured fatal outcome and mode-aware commit handling that persists recovery before rendering the recap; verify focused session tests cover every zero-Health path and reload behavior between fatal commit and player action.

## 2. Map discovery and checkpoint boundaries

- [x] 2.1 Add compact per-level discovery state, deterministic initial reveal, discovery updates, persistence, and percentage calculation; verify focused discovery tests cover movement reveal, reload preservation, and Adventure's fresh-map reset.
- [x] 2.2 Record Journey checkpoints only after stairs entry and completed paid rest, while preserving the current campfire behavior for Classic and Adventure; verify focused action/save tests cover replacement of one checkpoint and absence after a cancelled or failed rest.
- [x] 2.3 Apply discovered-cell visibility to world and minimap projections and provide a passive minimap snapshot projection; verify focused renderer/component tests hide undiscovered terrain, objects, and enemies without changing world coordinates or accepting minimap input.

## 3. Combat recap data and presentation

- [x] 3.1 Enrich combat and death events with actor identities and fatal-source facts, then add a bounded recap-line selector and Log policy coverage; verify focused event/log tests produce ordered player damage, enemy damage, defeat, fatal-enemy, and death lines without movement or encounter noise.
- [x] 3.2 Create a non-dismissable game-centered Death Recap dialog with `YOU DIED`, frozen input, World/Level, level-progress percentage, discovered percentage, and paired passive Minimap and Log cards. Reuse the in-game Settings dialog's bounds, palette, and stacked full-width bottom action buttons without an outer scrollbar; play and hold the existing player death animation for one second before showing the recap. Verify focused component tests cover Classic, Adventure, Journey, default selection, keyboard/mouse activation, input blocking, and the animation delay.
- [x] 3.3 Wire recap actions to prepared recovery sessions or the main menu and clear stale animation, movement, and UI timers; verify focused game tests show the fatal state behind the recap, selected-action keyboard and direct-mouse behavior, and a correct post-action campaign without duplicate saves.

## 4. Mode-selection flow and browser behavior

- [x] 4.1 Add the Select Mode dialog before Create Character, preserving cancellation and the existing Create Character → Create World path; verify focused UI tests keep an unconfirmed Saved Game empty and persist a confirmed mode.
- [x] 4.2 Implement the three stacked Journey—Easy, Adventure—Default, and Classic—Hard cards with their complete Berlin criteria panel and Confirm gate; verify the selected recovery text and criteria results update in the headless UI.
- [x] 4.3 Add the readable mode-selector and Settings-style title/summary/panel/footer-action death-recap styles using the existing menu and in-game dialog density/placement rules, without changing Settings itself; verify a headless desktop layout keeps the criteria and primary Confirm control visible together.
- [x] 4.4 Run one focused muted browser verification after the UI work: use the project-owned server and verify the flow in Playwright CLI, desktop Edge, and built-in IAB at `?mute=1`, including no console errors, a rendered canvas, mode confirmation, fogged minimap, and a centered blocked-input death recap; reserve the configured browser suite for finalization.

## 5. Integration validation

- [x] 5.1 Run the applicable Node tests, `npm run typecheck`, lint/build checks, and strict OpenSpec validation; resolve regressions across migration, death recovery, discovery, and dialog presentation.
- [x] 5.2 Stop the project-owned verification server, run the applicable configured browser suite, and record that full-suite coverage follows the focused three-context check.
  - Focused muted IAB plus headless Chromium and Edge checks passed for canvas startup, mode confirmation, fog projection, and the blocked-input death recap. The configured Edge smoke suite also ran; its remaining `chest-rendering` failure is a pre-existing test assumption that reads the compact save payload as an expanded floor.
