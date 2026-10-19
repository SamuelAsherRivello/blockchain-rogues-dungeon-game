# RPG ideas

## Input, movement, and interaction

- Show a dot on every grid cell in the walking path previewed by the mouse reticle.
- Consider custom cursors for walking, interacting, and fighting.
- Use bump interactions: bump once to show an option and bump again to accept it. Walking away declines.
- Animate the rat prompt when it appears. Slide it in from the left, stop 30 pixels before its final position, fade it in, then snap it into place.

## New game and character creation

- When a player selects a new save slot, present three setup screens:
  1. Character: choose a class.
  2. Attributes: roll character statistics and allow rerolls.
  3. World: roll world-generation attributes and preview the result on a minimap.
- Decide whether to add a separate inventory-configuration screen.
- Offer three classes. Warrior and Mage are initial examples. Generate concepts for the third class with AI.
- Classes determine appearance, starting inventory, and maximum inventory capacity through an inventory item.
- Reuse the same appearance for all three classes at first.

| Starting feature | Warrior | Mage |
| --- | --- | --- |
| Abilities | None | Yes |
| Potion | Yes | Yes |
| Weapon | Yes | None |
| Armor | Armor | Light armor |

## Randomization and world generation

- Make each roll show changing values and play dice sounds.
- Reuse this roll presentation for character attributes and world generation.
- Give players 30 points to distribute across world-generation attributes.
- Include attributes such as enemy density, loot frequency, and distance to exit stairs.
- Decide the final set of about 10 world attributes or difficulty ratings.
- Drive level generation from these values.
- Update the minimap preview after every world roll.

## Dungeon flow and world interactions

- Add campfires. Bumping into one shows "Rest? (20 gold)."
- Resting costs 20 gold, restores health, and updates the checkpoint.
- Support NPC interactions through the shared bump-to-confirm pattern.
- Choose between two opening structures:
  - A fixed, screen-sized tutorial level where players can take the stairs immediately or explore to collect items and fight an enemy.
  - A recurring home base between levels, or one reached through campfires on every level.
- Decide whether a campfire should transport players to a separate home base.
- Add a gate to Hell guarded by a devil. The devil asks, "Enter the Gate to Hell?"
- Entering Hell loads a red-tinted version of the current level with the same art and layout, but enemies and encounters are about ten times harder.

## Progression, crafting, and upgrades

- Award experience points.
- Let players spend level-up points on character statistics.
- Support crafting: combine two existing items and ore to create a new item, consuming all inputs.
- Support upgrades: combine an item and ore to create the same item with improved statistics, consuming both inputs.
- For a level-up, send sparkles inward from all directions, merge them on the character, then play a chime.

## Minimap and quest tracking

- Highlight a target location on the minimap.
- When the target is inside the minimap area, show a yellow dot at its location.
- When the target is outside the minimap area, show a yellow arrow on the minimap edge pointing toward it.
- Size both indicators to about one minimap grid cell.
- Use these indicators for the selected quest subtask location.

## Menu, mobile, and presentation

- Restore mobile mode, including touch controls and responsive layout.
- Update the main menu. Make the background rise upward while fading in from black.

## Dungeon content and technical work

- Use the larger dedicated bronze-chest art instead of the small atlas frame.
- Keep a test-mode chest beside the level-one entrance for quick pickup and chest testing.
- Add level editor support for tile-theme selection and editable procedural maps.
- Batch static tiles to reduce renderer RAM, CPU, and GPU work.
