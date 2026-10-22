# Proposal

## Why

Death currently resets a run and immediately returns the player to the main menu, which hides both the reason for defeat and the value of another attempt. Players need a clear choice of death philosophy at campaign creation and a final in-game recap that makes defeat disappointing, informative, and inviting rather than abrupt.

## What Changes

- Add a pre-character-creation **Select Mode** dialog for empty Saved Games. The player chooses a card and explicitly confirms it before using the existing Create Character and Create World flow.
- Offer three saved, immutable campaign modes from lightest to hardest: **Journey — Easy** (restore the latest stairs or paid-campfire checkpoint), **Adventure — Default** (restart the current dungeon level with long-term character growth), and **Classic — Hard** (permadeath).
- Show a mode-specific Berlin-style roguelike-traits panel in the selector. It reports the nine high-value and six supporting Berlin Interpretation traits accurately, including the intentional non-ASCII and mixed-movement differences; it does not claim universal Berlin compliance.
- Add persistent map discovery and fog of war. The main world and minimap begin mostly hidden, reveal visited/discovered areas, and expose discovered-map percentage for recap and recovery behavior.
- Replace the immediate post-death main-menu transition with a non-dismissable, centered in-game death recap. It preserves the frozen fatal world view behind the dialog and uses the in-game Settings dialog's geometry, palette, and bottom action treatment for `YOU DIED`, a factual World/Level and progress summary, paired Minimap and Log cards, and the final bounded sequence of combat outcomes.
- Give the death recap bottom actions that use the shared in-game menu button style: Adventure defaults to Restart Level; Journey defaults to Resume at Checkpoint; Classic shows only Return to Main Menu. Arrow keys choose an available action, Enter activates it, and mouse actions activate directly without a second confirmation.
- Make recovery mode-specific: Classic clears the fallen Saved Game and offers Return to Main Menu; Adventure offers Restart Level and Return to Main Menu while retaining character progression but restoring a fresh version of the current level; Journey offers Resume at Checkpoint and Return to Main Menu while restoring the newest valid checkpoint.
- Make stairs automatic Journey checkpoints and completed paid campfire rests newer Journey checkpoints. Campfires remain ordinary paid resource recovery in Classic and Adventure.
- Extend combat/death event facts and Log formatting so the recap can state player and enemy damage, enemy defeat, the fatal enemy's defeat of the player, and `You died.` without movement or encounter-noise entries.
- **BREAKING**: Migrate existing valid Saved Games to Adventure. This avoids unexpectedly converting a current campaign to permadeath while changing the former fixed Level 1 post-death reset into the recommended current-level recovery rule.

## Capabilities

### New Capabilities

- `death-recovery-modes`: Select, persist, describe, and execute the three campaign death/recovery contracts, including the in-game death recap.
- `map-discovery`: Persist and present revealed dungeon knowledge for the world view, minimap, recovery snapshots, and death recap.

### Modified Capabilities

- `campaign-saves`: Persist the selected mode and compact recovery snapshots, migrate existing campaigns safely, and distinguish a live campaign from a cleared Classic campaign.
- `character-progression`: Replace the single post-death fresh-Level-1 rule with the three mode-specific progression and run-state outcomes.
- `game-events`: Require the combat and death facts needed for bounded, ordered recap lines without coupling gameplay systems to message text.
- `pixel-game-presentation`: Add the mode picker and centered, readable, input-blocking death dialog to the shared dialog-density contract.
- `world-map-rendering`: Render main-map and minimap visibility from discovered cells and support a read-only minimap recap image.

## Impact

- Affects the Campaign/save schema and migration, procedural death/recovery orchestration, level-entry and checkpoint snapshot creation, game-event facts, log projection, fog/discovery state, menu creation flow, game-input gating, React dialogs, minimap rendering, and focused tests.
- The existing Settings dialog and its typography are not changed.
- No account, network, external service, or renderer fallback is introduced.
- Playwright will add useful evidence for the browser-visible mode-selection, fog/minimap, and death-recap flows. One focused muted browser scenario belongs after those UI groups during apply; the broader browser suite remains a finalization check.
