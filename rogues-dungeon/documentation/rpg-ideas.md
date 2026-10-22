# Priority Ideas

1. F4. Extend the in-game art animation system for independent character, main-sprite, and shadow-sprite tweens.
2. F5. Support programmatic art effects, such as a 0.1-second white flash that fades back to the original color.

# All Ideas

## A. Menu, mobile, and presentation

1. Restore mobile mode, including touch controls and responsive layout.

## B. New game and character creation

1. When a player selects a new save slot, present three setup screens:
   1. Character: choose a class.
   2. Attributes: roll character statistics and allow rerolls.
   3. World: roll world-generation attributes and preview the result on a minimap.
2. Decide whether to add a separate inventory-configuration screen.
3. Offer three classes. Warrior and Mage are initial examples. Generate concepts for the third class with AI.
4. Classes determine appearance, starting inventory, and maximum inventory capacity through an inventory item.
5. Reuse the same appearance for all three classes at first.

| Starting feature | Warrior | Mage |
| --- | --- | --- |
| Abilities | None | Yes |
| Potion | Yes | Yes |
| Weapon | Yes | None |
| Armor | Armor | Light armor |

## C. Mapping

1. Reorganize mapping files:
   - Audit the current map folders and reorganize them around their actual use.
   - Identify which maps, tilesets, and supporting files are production content, test fixtures, or unused. Rename or move folders such as `examples` when they contain production content.
2. Add a `prefabs` folder for reusable map fragments that generation can incorporate into a larger map.
3. Support prefabs for interiors, starting areas, shop interiors, and other authored spaces.
4. Treat enterable buildings as a separate feature:
   1. Define the exterior and interior appearance of each building.
   2. Decide whether entering a building loads a separate map or keeps one map and hides roof-covering tiles.

## D. Dungeon flow and world interactions

1. Add an introductory story sequence.
2. Add campfires. Bumping into one shows "Rest? (20 gold)." Resting costs 20 gold, restores health, and updates the checkpoint.
3. Add one NPC. Bump into the NPC to talk and show dialogue.

   <p align="center">
     <img src="dialog.jpg" alt="Character dialogue reference" width="500">
   </p>

4. Choose between two opening structures:
   1. A fixed, screen-sized tutorial level where players can take the stairs immediately or explore to collect items and fight an enemy.
   2. A recurring home base between levels, or one reached through campfires on every level.
5. Decide whether a campfire should transport players to a separate home base.
6. Add a gate to Hell guarded by a devil. The devil asks, "Enter the Gate to Hell?"
7. Entering Hell loads a red-tinted version of the current level with the same art and layout, but enemies and encounters are about ten times harder.

## E. Minimap and quest tracking

1. Highlight a target location on the minimap.
2. When the target is inside the minimap area, show a yellow dot at its location.
3. When the target is outside the minimap area, show a yellow arrow on the minimap edge pointing toward it.
4. Size both indicators to about one minimap grid cell.
5. Use these indicators for the selected quest subtask location.

## F. Animation and special effects

1. Add sprite sheets for transient particle effects that play over gameplay actions.
2. Add a particle-effects system that spawns and removes short-lived groups of effect sprites.
3. Add a separate special-effects system for action visuals, such as a sword-slash arc when an attack lands.
4. Extend the in-game art animation system so it can tween a whole character, its main sprite, or its shadow sprite independently.
5. Support programmatic effects such as flashing a target white for 0.1 seconds, then fading back to its original color.

## G. Kill your darlings

1. Decide whether to remove the zoom controls.
2. Decide whether to remove the camera modes.
3. Consider making movement spend a limited resource, so every move becomes a tactical choice.

