# Spec Delta

## MODIFIED Requirements

### Requirement: Reveal dungeon knowledge through exploration
Each new Dungeon Level SHALL start with undiscovered map knowledge except for the player's initial revealed area. Moving and realm arrival SHALL reveal a configurable area around the player's current position without modifying terrain, entity simulation, or tactical time solely to reveal it. The reveal brush SHALL be independent of facing, lights, Perception, enemy presence, and Render Test presentation settings. Revealed cells SHALL remain discovered until the campaign's mode or realm identity requires a reset.

#### Scenario: Discover a new area
- **WHEN** the player enters an unrevealed reachable area
- **THEN** the position-based reveal brush adds its cells to exploration knowledge in both gameplay views

#### Scenario: Preview mouse walking into an unknown area
- **WHEN** the player hovers or selects a reachable mouse route into undiscovered terrain
- **THEN** the neutral white walking preview and destination do not reveal cells by themselves
- **AND** accepted movement along that route applies the normal position-based reveal brush

#### Scenario: Face another direction without moving
- **WHEN** the player remains at the same position while its heading, illumination, or detection state changes
- **THEN** those changes alone do not expand or erase discovered cells

#### Scenario: Explore while fog is disabled
- **WHEN** the player moves with Render Test fog disabled and later enables fog
- **THEN** only cells earned through normal position-based exploration are revealed
- **AND** disabling fog has neither explored the whole map nor stopped normal discovery tracking

#### Scenario: Begin an unvisited realm
- **WHEN** a new slot, new world, unvisited level, or first visit to a standalone prefab begins
- **THEN** its exploration starts empty before applying the arrival reveal brush

### Requirement: Preserve and report discovered coverage
The campaign SHALL persist discovered cells independently for each visited realm and derive the active realm's discovered percentage. Save/reload and return travel SHALL preserve that knowledge without sharing it across slots, worlds, different levels, or standalone prefabs. Coverage SHALL remain available to death recap independently of Render Test and lighting. Compatible existing discovery records SHALL retain their valid cells.

#### Scenario: Resume exploration
- **WHEN** a player saves and reloads after discovering part of a level
- **THEN** the same cells remain revealed and the coverage percentage remains consistent

#### Scenario: Return from a standalone prefab
- **WHEN** the player explores a prefab and returns to the originating dungeon
- **THEN** each realm retains its own discovered cells without coordinate or bitmap aliasing

#### Scenario: Load existing knowledge
- **WHEN** a supported saved game contains valid discovery in its previous encoding
- **THEN** loading preserves that knowledge in the matching realm and does not grant it to a different realm

#### Scenario: Complete exploration
- **WHEN** every cell counted by the active realm's coverage calculation has been revealed
- **THEN** coverage reports 100 percent without requiring every generated realm to be fully explorable

### Requirement: Apply discovery to recovery state
Adventure recovery SHALL restore the active level with fresh undiscovered map knowledge. Journey recovery SHALL restore the discovered-map state captured at its checkpoint. Classic SHALL not create recovery state after death. Enabled fog SHALL present the resulting mode-specific knowledge and normal arrival reveal without an additional rollback or preserving post-checkpoint Journey knowledge.

#### Scenario: Reset Adventure map knowledge
- **WHEN** an Adventure campaign restarts a level after death
- **THEN** prior exploration of that level is no longer revealed

#### Scenario: Resume Journey at a campfire checkpoint
- **WHEN** a Journey player explores after resting at a campfire and then dies
- **THEN** recovery restores the exploration recorded at that campfire checkpoint
- **AND** exploration earned only after the checkpoint is not carried into recovery

#### Scenario: Restart Adventure
- **WHEN** an Adventure player restarts the level after death
- **THEN** prior discovery is cleared and the normal arrival area is revealed before play resumes

#### Scenario: End Classic
- **WHEN** a Classic player dies
- **THEN** no recovered discovery state is created and a later new campaign starts unexplored
