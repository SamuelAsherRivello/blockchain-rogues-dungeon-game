# Spec Delta

## Purpose

Defines player-facing world attributes and deterministic world progression so
players can shape a new run while every generated floor remains reproducible.

## ADDED Requirements

### Requirement: Create a world after character creation
An empty Saved Game SHALL show Create World after the player confirms Create Character. Create World SHALL reuse the Create Character window's size, placement, organization, and shared presentation components.

#### Scenario: Continue from character creation
- **WHEN** the player confirms a valid character sheet for an empty Saved Game
- **THEN** Create World opens before the campaign begins

#### Scenario: Cancel world creation
- **WHEN** the player closes Create World before confirming
- **THEN** the Saved Game remains empty and the player returns to the main menu

### Requirement: Roll a balanced world attribute sheet
Create World SHALL show Clarity, Comfort, Discovery, Fortune, Guidance, Mercy, Openness, Peace, Plenty, and Safety in alphabetical order. Each value SHALL be from 0 through 5, all values SHALL total 30, and the player SHALL be able to reroll without limit before confirming.

#### Scenario: Roll world attributes
- **WHEN** the player selects Roll
- **THEN** the ten values change through the established roll presentation and resolve to a valid 30-point sheet

#### Scenario: Confirm world attributes
- **WHEN** the player confirms a rolled world sheet
- **THEN** the campaign stores the committed world attributes and begins with them

### Requirement: Explain world attribute effects
Each world attribute SHALL have a concise tooltip using these player-facing effects: Clarity simplifies layouts with fewer branches and dead ends; Comfort adds campfires and recovery points; Discovery adds optional rewards, hidden discoveries, and alternate routes; Fortune improves reward chances, payout amounts, and reward quality; Guidance places the exit closer to the entrance; Mercy weakens enemies and reduces elite threats; Openness improves route accessibility with wider corridors and fewer blocked approaches; Peace reduces enemy numbers and makes enemies less aggressive; Plenty increases pickup frequency and the quantity of common supplies; Safety reduces traps and environmental hazards.

#### Scenario: Inspect a world attribute
- **WHEN** the player hovers or focuses a world attribute
- **THEN** its tooltip explains the corresponding generation effect

### Requirement: Show generation identity during world creation
Create World SHALL show a read-only Generation Identity panel beneath World Attributes using the shared attribute-panel organization. It SHALL show World, Level, and Run on the left and Slot and Seed on the right.

#### Scenario: Inspect a new run identity
- **WHEN** Create World is open for Saved Game 2
- **THEN** the panel shows World 1, Level 1, Run 1, Slot 2, and the active persistent world seed

### Requirement: Apply world attributes to floor generation
Generated floors SHALL use committed world attributes to shape layout clarity, recovery placement, discoveries, reward chances and payouts, exit placement, enemy strength and elite frequency, route accessibility, enemy population and aggression, pickup frequency and supply quantity, and hazard frequency.

#### Scenario: Generate a floor from a committed world
- **WHEN** a floor is generated for a campaign with committed world attributes
- **THEN** the generated layout, entities, rewards, pickups, recovery points, exit, and hazards reflect those values

### Requirement: Preserve deterministic world generation
The same World, Level, Slot, Run, Seed, generator version, and committed world attributes SHALL produce the same generated floor and enemy traits across reloads and repeated runs.

#### Scenario: Repeat a generated floor
- **WHEN** the game regenerates a floor with the same identity and world attributes
- **THEN** terrain, route structure, placements, rewards, pickups, hazards, and generated enemy behavior traits match

### Requirement: Automatically grow the world at character level-up
After a character level-up and the player's character allocation, the game SHALL increase three distinct eligible world attributes by one point each, highlight the changed values in green in the existing progression presentation, and prevent player selection of those world changes.

#### Scenario: Apply automatic world growth
- **WHEN** the player confirms character progression after gaining a level
- **THEN** three eligible world attributes increase automatically and the changes are shown as green results

#### Scenario: Avoid capped attributes
- **WHEN** an automatically selected world attribute is already at 5
- **THEN** the game selects another eligible attribute without exceeding the 0-5 range

### Requirement: Apply world growth to future floors
Automatic world-attribute growth SHALL affect the next generated floor and later floors without regenerating or changing the currently active floor.

#### Scenario: Level up on an active floor
- **WHEN** the player levels up while exploring a floor
- **THEN** the active floor remains unchanged and the updated world attributes apply when the next floor is generated

### Requirement: Seed automatic world growth
Automatic world-attribute choices SHALL derive from stable campaign identity, player level, generator version, campaign difficulty, and recent world growth rather than mutable call-order randomness.

#### Scenario: Reload before applying growth
- **WHEN** the same campaign reaches the same character level after different save timing or XP-award order
- **THEN** the same three world attributes are selected
