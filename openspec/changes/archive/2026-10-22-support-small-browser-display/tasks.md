# Tasks

## 1. Establish responsive geometry

- [x] 1.1 Establish compact PC landscape geometry budgets and container-query tiers for the fitted 16:9 shell without changing portrait/mobile rules or renderer sizing; verify the layout source still preserves the 16:9 viewport and renderer geometry at each tier.
- [x] 1.2 Define the generous, intermediate, and minimum supported CSS shell dimensions from the target PC browser window; verify the thresholds are documented in the focused layout test plan.

## 2. Contain dialogs and menu overlays

- [x] 2.1 Refactor shared dialog sizing so menu, Settings, Create Character, and other overlays fit the viewport safe area with flexible bodies, contained actions, and bounded internal scrolling; verify each dialog's bounding box remains inside the fitted viewport.
- [x] 2.2 Adapt main-menu and dialog content for compact landscape widths, including saved-slot metadata, version/fullscreen controls, settings actions, tooltips, and Create Character content, while preserving generous-size styling; verify no primary action or text block overflows its dialog.

## 3. Adapt the landscape HUD

- [x] 3.1 Adapt the landscape titlebar, statusbar, cards, Quest content, and information panels using the staged budget; keep gameplay controls and existing Log/Slots/Inventory scrollbar policy accessible; verify compact screenshots show no titlebar, statusbar, card, or Quest overlap.
- [x] 3.2 Add the compact secondary-information arrangement only after container and typography adaptation are insufficient; verify the world view, titlebar actions, Settings access, and primary gameplay controls remain reachable.

## 4. Add focused verification

- [x] 4.1 Add renderer-free layout assertions covering generous, intermediate, and minimum compact PC landscape geometry, overlay containment, and absence of page-level scrolling; verify the focused test command passes without requiring a renderer.
- [x] 4.2 Run one focused Playwright verification after the responsive implementation group at the supported minimum PC landscape size and one generous comparison size using `?mute=1`; verify the game route, playable shell, and console state, or record the exact browser capability failure if launch remains unavailable.
- [x] 4.3 Run the applicable focused tests and final browser/layout checks, compare screenshots against the existing ideal-size presentation, and resolve compact-tier regressions; verify the final test report and OpenSpec task status before completion.
