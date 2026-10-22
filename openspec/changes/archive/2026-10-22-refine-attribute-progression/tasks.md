# Tasks

## 1. Progression benefit rules

- [x] 1.1 Add a pure pending-benefit formatter that compares committed and preview attributes, aggregates multiple points per attribute, formats Health as projected maximum-health percentage, and covers Stamina, Offense, Defense, Mana, Perception, Luck, and Recovery; verify with focused Node tests for single-point, multi-point, threshold, and zero-draft cases.
- [x] 1.2 Add explicit placeholder output for pending Strength and Stealth allocations while preserving their current tooltip help text; verify the formatter tests assert `No gameplay effect yet.` and do not invent numeric benefits.
- [x] 1.3 Confirm the existing XP threshold, three-point award, cap validation, and no-time-advance allocation behavior remains intact; verify the focused progression tests and existing `level-progression` tests pass.

## 2. Progression window and tooltips

- [x] 2.1 Add the aggregate pending-benefit formatter and results-field foundation, render only affected attributes, and allow the field to grow when more than three attributes are pending; verify React rendering tests cover empty, one-line, multi-point, and multi-attribute drafts.
- [x] 2.2 Update attribute arrow tooltip copy to show only the resulting value, such as `Increase Perception to 5.` and `Decrease Perception to 4.`; verify tooltip tests reject parenthesized raw deltas while preserving label gameplay-help tooltips.
- [x] 2.3 Keep Strength and Stealth visible and allocatable in the existing ten-attribute layout; verify the dialog retains both controls and displays their placeholder benefit lines when drafted.
- [x] 2.4 Run one focused muted Playwright check against the Progression dialog to verify the summary layout, aggregated benefit text, and arrow tooltip wording; record the result and leave broader browser coverage for finalization.
- [x] 2.5 Reorganize the Progression dialog so the remaining allocation count appears above the attributes panel and the earned-results count plus body-text bullet field appears below it; verify zero, one, two, and three distinct pending-result states in the focused browser check.
- [x] 2.6 Update the level-up copy and results presentation: use `Level Up — Character`, lowercase `attribute points`, an `Earned Results` heading, and a borderless fixed three-line results area; verify the revised copy and layout in the focused browser check.

## 3. Level-gain presentation

- [x] 3.1 Update the level-gain presentation lifecycle so inward sparkles from surrounding directions merge on the player before the level-gain chime plays; verify particle and audio event tests cover ordering, cleanup, and one cue per gained level.
- [x] 3.2 Preserve non-blocking play and session-generation cleanup during the delayed cue; verify level gain does not pause ordinary actions and stale timers cannot affect a later run.

## 4. Integration verification

- [x] 4.1 Run `npm run typecheck` and `npm test` from the repository root and resolve regressions caused by the progression changes.
- [x] 4.2 Run the applicable full browser suite with `?mute=1` and report unrelated pre-existing failures separately from this change: 28 passed and 12 unrelated pre-existing failures.
