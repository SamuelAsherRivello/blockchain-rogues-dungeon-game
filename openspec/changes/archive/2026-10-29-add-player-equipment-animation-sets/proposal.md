# Proposal

## Why

The player always carries a sword and shield visually, including when all equipment positions are empty. Four aligned versions of the existing Hero Warrior animations will make the appearance reflect occupied Weapons and Armor groups while preserving the supplied character and motion.

## What Changes

- Preserve set 1, the existing sword-and-shield frames, byte-for-byte. Author set 2 with the same sword and no shield, set 3 with the same shield and no sword, and set 4 with neither object. Keep the character's existing helmet, clothing, and worn armor appearance in every set.
- Preserve all ten clips and 48 frames per set, including attack trails and equipment dropped during death. Keep frame canvases, body registration, directions, timing, and mirroring consistent across variants.
- Select the set from committed equipment occupancy: Weapons and Armor means set 1, Weapons only means set 2, Armor only means set 3, neither means set 4. Item identity, item statistics, Inventory, Quick Slots, abilities, and Jewels do not influence selection. A shield in Weapons means sword art, as explicitly agreed.
- Switch appearance without restarting the active animation or rebuilding the renderer. Preserve existing idle, Gridless run, death, hop, damage, and stair behavior. Attack remains available through its existing selection seam without a new gameplay trigger.
- Use the completed `ai-skills-tiled-create-spritesheet-png` skill from the maintained `ai-skills-tiled` repository for source baselines, imagegen modification, deterministic assembly, validation, contact sheets, and timed playback. Record the skill version, actual invocations, imagegen provenance, and review evidence in the delivered project documentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `hero-warrior-animation`: Four complete equipment appearances, exact correspondence between frames, equipment-group selection, and phase-preserving rendering.

## Impact

Asset work affects `rogues-dungeon/public/assets/art/game-view/characters/hero-warrior/` and project documentation. Runtime work affects the Hero Warrior content adapter and `babylon-render-system.tsx`, with focused tests for equipment selection, catalog completeness, registration, and playback continuity. The shared generic animation clock remains the playback owner. No save schema change, new runtime dependency, Tiled map change, or live Tiled editor is required for this artwork stage.

Acceptance requires 192 mapped frames, unchanged original assets, matching protected pixels and registration, reviewed motion for every clip in every set, and correct rendering for all four occupancy combinations after equipment transactions and reload. Browser checks add useful evidence for visible equipment changes, mirroring, death, and stairs; run one focused post-integration scenario through the project-required Edge CLI, desktop Edge, and in-app browser contexts with `?mute=1`. Do not launch browsers during proposal. Reserve the full applicable browser suite for finalization.

The user has resolved the empty-equipment and shield-classification questions. No product decision remains open. Newly exposed anatomy must be reconstructed because the supplied art is flattened; imagegen output must satisfy the alignment and preservation checks before acceptance.
