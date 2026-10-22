# Proposal

## Why

Players currently have one movement presentation and a generic world crosshair. Selectable movement modes and contextual cursors will make movement experiments accessible and make the action implied by a world target visible before input.

## What Changes

- Add Grid-snap, Grid-tween, and Gridless movement modes. Default to Grid-tween to preserve the current experience.
- Place a movement dropdown immediately right of Camera in the top utility bar, using a simple monochrome walking-person silhouette matching Zoom and Camera styling. This is a regular control outside Dev Settings.
- Grid-snap instantly places the player at each accepted cell center. Grid-tween retains the current 250 ms player movement.
- Gridless supports whole-world-pixel positions and one logical occupied cell. Each crossed column-center line advances one tactical turn; each crossed row-center line advances another. Simultaneous diagonal crossings advance two turns, while near-diagonal crossings resolve in chronological order.
- Updated playtest behavior: Gridless keyboard travel retains free whole-pixel stops. Gridless mouse travel snaps to the current center before departure, follows the route smoothly with looping directional run art and no hop/tween, and finishes at the destination center. Movement selection returns focus to gameplay so WASD/arrows remain available.
- Provide mouse-versus-keyboard behavior and cursor mapping tables in the design, including existing UI mouse interactions.
- Add walking, interaction, fighting, and blocked world cursors, while retaining appropriate UI pointer, help, and drag states.
- Add General and Battle game modes. In General, one click travels all the way to a reachable destination using the selected movement mode. Battle allows only one grid step per click or fresh directional keypress and displays a 2 px red inset border on the game view.
- Keep game mode independent of movement selection. General allows all three selections; Battle retains Grid-snap and Grid-tween and temporarily overrides Gridless with Grid-tween. Leaving Battle restores the selected movement mode.
- Enter Battle whenever any living active-floor enemy is within its effective awareness range, including through walls and regardless of player Perception. Return to General when none qualify.
- Replace unused Vitality with Perception while retaining exactly ten attributes. Perception supports integers 0 through 99, with initial balance focused on 0 through 5; positive values grant two cells of line-of-sight enemy detection range per point. At 0, use a one-cell minimum as an explicit tuning assumption.
- Keep enemy detection separate from Battle activation. Perception 4 detects to 8 cells and Perception 5 detects to 10 cells only with clear line of sight; walls still block detection at high Perception.
- Hide undetected enemies completely, including sprites, shadows, silhouettes, minimap markers, tooltips, and identifying combat cursors. Hide them again whenever current Perception range or line of sight is lost, with no persistent reveal or last-known marker. Reveal them again when both conditions return. Hidden enemies still collide, act, and trigger Battle.
- On Battle entry from an off-center Gridless position, tween to the occupied cell center without changing cells, advancing time, charging an extra turn, or running an alignment enemy phase.
- Treat the current code as authoritative for mouse paths and reticles: retain complete or reachable-approach routes, origin exclusion, selected green-interactive-endpoint dot omission, intermediate interactive dot coloring, current reticle classification/priority, and projection alignment rather than rebuilding or rejecting that behavior.
- Both three-question reviews are complete. They confirmed General click travel, Battle awareness, independent Perception detection, turn-free Battle-entry centering, complete enemy hiding, and hiding again when detection conditions are lost. The user resolved the former path/reticle conflict by selecting current code as the source of truth.

## Capabilities

### New Capabilities

- `player-movement-modes`: Mode selection, input differences, whole-pixel positions, cell ownership, and gridless center-line turn accounting.
- `contextual-mouse-cursors`: World intent cursors and the boundary with existing UI mouse affordances.
- `battle-movement-override`: Proximity-driven tactical input and temporary visual indication with mode restoration.
- `enemy-detection`: Perception-scaled line-of-sight enemy detection, independent of enemy awareness and game-mode activation.

### Modified Capabilities

- `pixel-game-presentation`: Add Movement immediately after Camera in the utility control order.
- `turn-presentation`: Make player travel depend on movement mode while retaining enemy and barrel playback.
- `dungeon-turns`: Specify the Gridless center-line turn rule and the Battle override of free movement.
- `mouse-path-navigation`: Capture the authoritative complete/approach route preview, reticle priorities, endpoint-dot exceptions, and adjacent interactions while adding General/Battle click behavior.
- `character-progression`: Replace Vitality with Perception, preserve ten attributes, and allow Perception from 0 through 99 without resetting existing progression.

## Impact

The affected areas are game input coordination, mouse selection, domain actions and time accounting, preferences and save normalization, character creation and progression, attribute tooltips, enemy detection, turn presentation, world and minimap projection, the titlebar, and world cursor styles/assets. No new framework or renderer is planned.

Acceptance requires the three modes, the specified dropdown placement and icon, exactly one occupied player cell, correct column/row-center tick counts, actionable cursors, and preserved mouse path dots. Existing saves must remain readable. Preference persistence and cell-local position restoration will be specified in design with explicit draft defaults.

Playwright adds evidence for hover, input release, dropdown behavior, zoom and camera alignment. Proposal does not launch browsers. Apply includes one focused Edge CLI verification group plus the required desktop Edge and in-app-browser checks; full applicable browser coverage belongs to finalization.

The former blocked-destination conflict is resolved in favor of the current path and reticle implementation. Nearly black marks the selected target classification, not a blanket prohibition on reachable approach movement. The existing code remains baseline work; the new movement, Battle, detection, and cursor behaviors still require implementation.
