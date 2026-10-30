# Hero Warrior Animation Mapping

Runtime assets are read from `public/assets/art/game-view/characters/hero-warrior/frames/` and are registered through the generic sprite-sheet animation system.

| Animation | Directions | Frames | Dimensions | Loop behavior |
|---|---|---:|---|---|
| Idle | Down, Side, Up | 4 each | 32x48 | Infinite (`loopCount: -1`) |
| Run | Down, Side, Up | 6 each | 32x48 | Infinite (`loopCount: -1`) |
| Attack | Down, Side, Up | 4 each | 32x48 | One play (`loopCount: 0`) |
| Death | None | 6 | 48x48 | One play (`loopCount: 0`) |

The catalog exposes every animation with `idle/Side` as the player's right-facing start. The renderer must place the bottom center of the active frame on the bottom edge of the player's 32x32 logical grid cell; the upper portion may extend above the cell. Animation playback does not change the player's logical position or collision.

Hero Warrior artwork is authored facing right. The player character starts with an east (`e`) movement heading and uses the default X scale. A successful west (`w`) movement changes the heading and mirrors the artwork on the X axis. North and south headings keep the default horizontal orientation. The same heading concept is available to enemies and future NPCs; a heading records their last successful cardinal movement.

Hero Warrior playback uses animation speed `0.5`, so each frame remains visible twice as long as a generic animation at speed `1`.

## Equipment appearances

Every clip has four registered appearances. Occupancy of either position in
Weapons enables the sword; occupancy of either position in Armor enables the
shield. Item identity and statistics do not matter. Jewels, Inventory, Quick
Slots, abilities, and uncommitted drag previews do not affect the appearance.

| Weapons occupied | Armor occupied | Appearance |
| --- | --- | --- |
| Yes | Yes | Set 1, original sword and shield |
| Yes | No | Set 2, same sword without shield |
| No | Yes | Set 3, same shield without sword |
| No | No | Set 4, neither |

The original 48 PNGs and shadow remain unchanged. Thirty additional native
strips under `variants/` supply 144 addressable frames with six columns per
strip, retaining the original 32x48 or 48x48 canvases. Unused strip cells are
transparent and are not animation frames.

The renderer retains one animation clock and the existing main/shadow handles.
Changing equipment selects the corresponding image without resetting fractional
frame time, loops, speed, stopped state, or one-shot completion. It preserves
the existing `[-1, 6]` main offset, `[0, -5]` shadow offset, tint/fog cache,
mirroring, hops, damage scaling, depth, and stair clipping. Fatal equipment is
held through death; an empty replacement run shows set 4. No appearance save
field is required.

Current gameplay selects directional idle, directional run during Gridless
travel, and death. Grid movement retains its idle/hop presentation. Attack is
still available through the actor catalog without a new gameplay trigger.

The completed `ai-skills-tiled-create-spritesheet-png` skill built the original
baselines and variant manifests and performed structural/review/acceptance
checks. Two imagegen attempts were rejected for haze. The user then authorized
bounded manual pixel repairs using the original palette. See
[workflow evidence](player-equipment-animation-sets/workflow-evidence.md) for
source hashes, actual helper commands, protected-pixel checks, per-frame masks,
reconstructed-anatomy limits, and exact-hash visual records. The
[synchronized comparison video](player-equipment-animation-sets/hero-equipment-comparison.mp4)
plays all four sets through all ten clips at speed 0.5.

The current generated Tiled map contains a `player` object at pixel `(1344, 1344)`, corresponding to cell `(42, 42)`. That object remains a logical placement marker; the Hero Warrior artwork is supplied by the runtime renderer.

The supplied source is the user-provided `Dungeons-and-Pixels-v1.4` pack retained under `public/assets/`. No license or attribution file was found in the supplied pack during inspection, so the project does not assert a license and must confirm required credit before public release.
