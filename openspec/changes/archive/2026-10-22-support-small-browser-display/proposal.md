# Proposal

## Why

Rogue's Dungeon preserves its visual quality at generous landscape sizes, but
the smallest practical PC browser windows expose layout failures: menus and
dialogs overflow their bounds, titlebar and statusbar content collides, and
information cards compress into clipped text. This change makes reduced-width
PC landscape play a supported presentation state while preserving the current
ideal-size appearance and existing portrait/mobile behavior.

## What Changes

- Add a responsive layout budget for the fitted 16:9 PC shell, progressing from
  container resizing to controlled typography and spacing changes before using
  compact alternate arrangements.
- Make main-menu, Settings, Create Character, and other dialogs fit within the
  shell at the smallest supported PC landscape size, with safe flexible bodies
  and scrolling only where appropriate.
- Allow titlebar, statusbar, saved-game metadata, quest text, tooltips, and
  other browser UI text to reflow or compact without clipping or overlap.
- Preserve the existing full-size art direction, proportions, card styling,
  world Zoom selection, renderer geometry, and portrait/mobile layout.
- Add focused layout checks for small and intermediate PC landscape sizes,
  including modal containment, control reachability, and absence of page-level
  scrolling.
- Use Playwright for one focused browser-visible verification after the related
  implementation group and reserve the broader browser suite for finalization;
  proposal work does not launch Playwright.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-template-layout`: the fitted viewport and overlays must remain usable
  when the PC landscape shell is reduced to the supported minimum size.
- `pixel-game-presentation`: landscape HUD, menus, dialogs, typography, and
  controls must reflow and remain readable at reduced PC browser widths without
  changing the game's aspect, world Zoom, or mobile presentation.

## Impact

- Affected implementation: `rogues-dungeon/src/ui/style.css`, dialog and screen
  components under `rogues-dungeon/src/game/`, and any shared layout geometry
  used to measure bounded dialogs.
- Affected verification: focused browser layout tests under
  `rogues-dungeon/test/browser/` plus existing renderer-free layout checks.
- No gameplay rules, save data, renderer fallback, dependency, orientation
  policy, or external API changes are expected.
- The exact minimum supported CSS shell dimensions must be confirmed during
  implementation from the target PC browser window; until then, the proposal
  treats the screenshots as the observed failure boundary rather than a final
  numeric contract.
