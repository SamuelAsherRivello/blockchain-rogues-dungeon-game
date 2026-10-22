# Spec Delta

## ADDED Requirements

### Requirement: Publish ordered combat facts for death recap
Combat and death events SHALL identify the acting player or enemy, the affected target, damage when applicable, and the fatal source when the player dies. The facts SHALL remain structured and ordered so the Log and death recap can select their own bounded presentation without gameplay systems formatting sentences.

#### Scenario: Record a fatal enemy attack
- **WHEN** a Skeleton Warrior reduces the player to zero Health
- **THEN** the committed event sequence identifies the player damage, Skeleton Warrior as the fatal source, and the resulting death in deterministic order

### Requirement: Select combat lines for death recap
The message projection policy SHALL produce recap-eligible text for player damage, enemy damage, defeated enemies, the fatal enemy's defeat of the player, and player death. It SHALL exclude movement, battle entry, and battle exit events from the death recap.

#### Scenario: Project recent combat only
- **WHEN** a player moves, exchanges attacks, and dies
- **THEN** the death recap's recent-lines selection contains the combat outcome lines but no movement or encounter-transition line

