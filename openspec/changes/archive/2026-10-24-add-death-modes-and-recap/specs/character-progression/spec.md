# Spec Delta

## MODIFIED Requirements

### Requirement: Preserve progression on death
At zero Health, the campaign's death-recovery mode SHALL determine the outcome. Classic SHALL end and clear the campaign. Adventure SHALL retain persistent attributes, level, unspent Attribute Points, XP count, partial XP, ability bindings, and hidden Difficulty while restoring the current Dungeon Level's entry state with run Inventory, equipment, current resources, Time, counters, and discoveries reset. Journey SHALL restore its newest checkpoint. Difficulty SHALL not be shown in the player-facing interface.

#### Scenario: Adventure death retains character growth
- **WHEN** an Adventure character dies
- **THEN** restarting the level retains persistent progression and begins with reset run possessions, resources, time, counters, and discoveries

#### Scenario: Death starts a fresh Level 1
- **WHEN** an Adventure character dies on Dungeon Level 1
- **THEN** the level restarts from its Level 1 entry state with Time at zero, empty run equipment and Inventory, and starting run counters/resources while character progression and hidden Difficulty remain

#### Scenario: Death advances deterministic run identity
- **WHEN** an Adventure character dies in a Saved Game
- **THEN** its current Dungeon Level restarts from the same deterministic entry identity rather than creating a different run

#### Scenario: Death starts fresh floor
- **WHEN** an Adventure character dies
- **THEN** the current dungeon level restarts from its entry state with empty gear while persistent progression remains intact

#### Scenario: Journey death restores the checkpoint
- **WHEN** a Journey character dies with a valid checkpoint
- **THEN** it resumes from that checkpoint rather than applying the Adventure reset

#### Scenario: Classic death ends the campaign
- **WHEN** a Classic character dies
- **THEN** no fresh playable run starts from that campaign

