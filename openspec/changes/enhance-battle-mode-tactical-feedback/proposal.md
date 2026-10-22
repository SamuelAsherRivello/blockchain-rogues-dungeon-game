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
- When no qualifying enemy is detected, retain only the player cell and the cell above it as the tactical area without revealing hidden enemy information. Use the same visual rules at every Perception value.
- Extend Battle warning distance to the greater of enemy awareness and the player's Perception detection range. Preserve enemy AI awareness and line-of-sight detection as separate rules.
- Use the union of filled inclusive player-to-detected-enemy rectangles, each extended one row upward for sprite headroom, with exactly two brightness treatments. Expose developer control E-VIS: 1 for brighter tactical cells and E-VIS: 2 for normal tactical cells with darker surroundings.
- Play Spooky Dungeon in General and JRPG - End Dungeon in Battle with 0.5-second crossfades. Pause the outgoing track after the fade and resume its retained position next time. Keep Dungeon 04 bundled with its existing credits.
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
- `game-audio`: Add deterministic mode tracks, reversible crossfades, retained playback positions, and existing mute/volume enforcement.

## Impact

The change affects the main game-view overlays, Battle warning distance, audio manager, developer controls, and verification. Reuse existing detection, projection and overlay conventions. Enemy AI awareness, movement rules, combat, saves, and passive minimap behavior remain unchanged. Earlier movement-change requirements excluding Perception from Battle activation are superseded by this change's warning-distance requirement. Keep the existing 2px red border as secondary feedback.

The entry banner and settled icon should be verified at supported world Zoom levels, including the highest zoom, compact viewport sizes, camera movement, multiple visible enemies, and Battle activation with no currently detected enemy. Playwright can provide useful evidence for state transitions, overlay persistence, and non-interference with world input after implementation; it is not needed during proposal work.
