# Proposal

## Why

Battle Mode is entered automatically and may occupy a substantial portion of a short, accelerated dungeon run. The current red viewport border does not make the state, its tactical movement rules, or the player's engagement area obvious enough, especially when several enemies remain in one Battle encounter.

## What Changes

- Add a persistent, screen-relative Battle Mode presentation inside the main game view.
- Animate a large Battle entry banner from the left edge with a crossed-swords icon and Battle Mode text.
- After the entry presentation settles, retract the text while leaving a rounded square crossed-swords icon in the upper-left corner for the full Battle state.
- Play the full entry presentation only when transitioning from General to Battle; do not replay it when additional enemies enter an existing Battle encounter.
- Remove the persistent icon when Battle ends, with a lighter exit animation than the entry treatment.
- Add a subtle tactical-area presentation that visually focuses attention on the player and nearby visible enemies without obscuring the dungeon.
- Preserve the distinction between Battle activation and enemy detection: Battle may begin because an enemy is nearby but hidden by walls, distance, or Perception limits.
- When no qualifying enemy is visible, show the Battle state and a generic tactical focus without revealing an enemy position, direction, count, or exact distance.
- When detected enemies are visible, preserve their cells and the player cell and visually emphasize the rectilinear engagement space between them; combine overlapping focus areas for multiple enemies.
- Keep enemy-specific portraits, resource panels, and other detailed comparison information contextual to selecting or hovering a detected enemy rather than making it part of the persistent Battle indicator.
- Retain the existing red border as a secondary Battle cue only if it remains visually compatible with the new presentation.
- Keep the overlay anchored to the viewport rather than the world so it remains stable across camera movement and world Zoom changes, with responsive sizing for compact viewports.

## Capabilities

### New Capabilities

- `battle-presentation`: Persistent Battle Mode state communication, entry and exit transitions, and tactical-area emphasis for visible and hidden nearby threats.

### Modified Capabilities

- `pixel-game-presentation`: Define the Battle overlay's screen-relative placement, responsive sizing, readable hierarchy, and coexistence with the game view and selected world Zoom.
- `world-map-rendering`: Define tactical-area overlays as screen-space presentation while preserving shared world coordinates and limiting enemy-specific emphasis to detected enemies.

## Impact

The change affects the main game-view overlay layer, Battle state transitions, detected-enemy presentation, tactical-area shading, responsive viewport behavior, and browser-visible visual verification. It should reuse the existing game-mode calculation, detected-enemy set, world-to-screen projection, interaction colors, and overlay conventions. No new renderer or dependency is required. The proposal does not change Battle activation rules, movement rules, enemy AI, combat resolution, save data, or the passive minimap.

The entry banner and settled icon should be verified at supported world Zoom levels, including the highest zoom, compact viewport sizes, camera movement, multiple visible enemies, and Battle activation with no currently detected enemy. Playwright can provide useful evidence for state transitions, overlay persistence, and non-interference with world input after implementation; it is not needed during proposal work.
