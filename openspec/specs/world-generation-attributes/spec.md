# world-generation-attributes Specification

## Purpose
Defines player-facing world attributes and deterministic world progression so
players can shape a new run while every generated floor remains reproducible.

Initial sheets use 0-5 with 30 points; lifetime values cap at 99. Growth draws
with replacement. Effects strongly distinguish ranks 1-5 and preserve useful
early growth through 14 before stronger diminishing returns.

## Requirements

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

#### Scenario: Keep a roll's identity stable
- **WHEN** the player rerolls world attributes in an open Create World window
- **THEN** the selected Slot, World, Level, Run, and Seed remain fixed while the sheet and preview change

#### Scenario: Start the previewed floor
- **WHEN** the player confirms the latest completed world roll
- **THEN** the first active floor matches its preview's geometry, generated objects, enemy traits, and reward descriptors

### Requirement: Explain world attribute effects
Each world attribute SHALL have a concise tooltip matching its implemented generation effect. Names SHALL retain the approved positive meaning: increasing an attribute SHALL NOT reverse its benefit through hidden compensating increases to other threats. Bounded benefits and placement constraints SHALL be documented.

#### Scenario: Inspect a world attribute
- **WHEN** the player hovers or focuses a world attribute
- **THEN** its tooltip explains the corresponding generation effect

#### Scenario: Use the approved tooltip copy
- **WHEN** the ten world labels are displayed
- **THEN** their tooltips use the following copy
  - Clarity: Simplifies layouts with fewer branches and dead ends.
  - Comfort: Adds campfires and recovery points.
  - Discovery: Adds optional rewards, hidden discoveries, and alternate routes.
  - Fortune: Improves reward chances, payout amounts, and reward quality.
  - Guidance: Places the exit closer to the entrance.
  - Mercy: Weakens enemies and reduces elite threats.
  - Openness: Improves route accessibility with wider corridors and fewer blocked approaches.
  - Peace: Reduces enemy numbers and makes enemies less aggressive.
  - Plenty: Increases pickup frequency and the quantity of common supplies.
  - Safety: Reduces traps and environmental hazards.

### Requirement: Show generation identity during world creation
Create World SHALL show a read-only Generation Identity panel beneath World Attributes using the shared attribute-panel organization. It SHALL show World, Level, and Run on the left and Slot and Seed on the right.

#### Scenario: Inspect a new run identity
- **WHEN** Create World is open for Saved Game 2
- **THEN** the panel shows World 1, Level 1, Run 1, Slot 2, and the active persistent world seed

#### Scenario: Understand replay inputs
- **WHEN** the player inspects Generation Identity help
- **THEN** it explains that a custom floor also depends on its saved world attributes, difficulty, and generation rules, so the five URL values alone do not export that custom world

### Requirement: Apply world attributes to floor generation
Generated floors SHALL use committed world attributes to shape layout clarity, recovery placement, discoveries, reward chances and payouts, exit placement, enemy strength and elite frequency, route accessibility, enemy population and aggression, pickup frequency and supply quantity, and hazard frequency.

#### Scenario: Generate a floor from a committed world
- **WHEN** a floor is generated for a campaign with committed world attributes
- **THEN** the generated layout, entities, rewards, pickups, recovery points, exit, and hazards reflect those values

### Requirement: Preserve deterministic world generation
The same supported floor generation profile, including identity, exact world attributes, effective difficulty, and generator/tuning versions, SHALL reproduce the same floor and generated enemy traits. Cosmetic randomness and unrelated reward or pickup rolls SHALL NOT alter topology or encounter rolls.

#### Scenario: Repeat a generated floor
- **WHEN** the game regenerates a floor with the same complete supported generation profile
- **THEN** terrain, route structure, placements, rewards, pickups, hazards, and generated enemy behavior traits match

#### Scenario: Change pickup randomness independently
- **WHEN** an additional pickup roll is evaluated without changing geometry or encounter candidates
- **THEN** the topology and encounter rolls remain unchanged

### Requirement: Automatically grow the world at character level-up
Each completed three-point character award SHALL trigger its earned level's automatic world update exactly once. The following World result SHALL reuse Character progression components, highlight changed values in green, and expose Continue without attribute controls. Each award distributes three points with replacement among values below 99, allowing one attribute to receive all three. At complete saturation unused points are reported.

#### Scenario: Apply automatic world growth
- **WHEN** the player completes spending the three character points for one earned level
- **THEN** three points are allocated automatically among up to three attributes below 99 and all changed values are green

#### Scenario: Spend points in partial confirmations
- **WHEN** the player spends one character point three times for the same earned award
- **THEN** the game grants one world update after the third point, with the same choices as a single three-point confirmation

#### Scenario: Complete accumulated awards
- **WHEN** one confirmation completes two earned three-point character awards
- **THEN** their world updates apply once each in earned-level order and their result screens follow in that order

#### Scenario: Avoid capped attributes
- **WHEN** an automatically selected world attribute reaches 99
- **THEN** further points select another eligible attribute, or are reported unused if all attributes are capped

#### Scenario: Repeated growth on one attribute
- **WHEN** three consecutive awards select one starting rank-5 attribute for all nine points
- **THEN** that attribute reaches 14 and retains meaningful generation benefits

### Requirement: Apply world growth to future floors
Automatic world-attribute growth SHALL affect only floors first generated after the update. Active and previously visited floors SHALL retain their original generation profiles, including world attributes, effective difficulty, enemy traits, and generated reward descriptors, through saves, reloads, and return travel.

#### Scenario: Level up on an active floor
- **WHEN** the player levels up while exploring a floor
- **THEN** the active floor remains unchanged and the updated attributes apply when a previously unvisited floor is generated

#### Scenario: Revisit an older floor
- **WHEN** the player upgrades the world, reloads, and returns to a previously visited floor
- **THEN** its original terrain and generated base entities match its first-visit profile and saved changes remain applied

#### Scenario: Open an old container after growth
- **WHEN** world attributes grow before the player opens a previously generated container
- **THEN** its world-derived reward descriptor still comes from its original floor profile

### Requirement: Seed automatic world growth
Each earned character level SHALL record a stable pending growth event with its earning-floor seed/profile, identity, character level, difficulty, growth-rule version, and preceding growth context. Identical complete event inputs SHALL reproduce identical choices regardless of allocation timing, reload, or presentation acknowledgment.

#### Scenario: Reload before applying growth
- **WHEN** the game resolves the same recorded growth event after different save or allocation timing
- **THEN** the same three-point allocation is selected

### Requirement: Preserve required routes under attribute combinations
All attribute-driven floors SHALL retain reachable stairs, safe arrival cells, legal object placement, and required puzzle routes under the game's movement rules. Generation SHALL terminate through bounded deterministic repair or a validated fallback rather than activate an invalid floor or retry indefinitely.

#### Scenario: Combine layout extremes
- **WHEN** high Discovery and Openness combine with low Clarity or Guidance
- **THEN** optional routes and widened corridors preserve the required exit route and reserved puzzle relationships

#### Scenario: Placement capacity is exhausted
- **WHEN** requested objects cannot all fit legally
- **THEN** generation places only valid objects, preserves required content, and reports the shortfall in diagnostics

### Requirement: Bound benefits while retaining baseline difficulty
World effects SHALL use bounded benefit curves. Baseline difficulty SHALL depend on dungeon depth and the floor's frozen difficulty profile. Fortune, Plenty, and Discovery SHALL have distinct reward responsibilities and combined supply limits. World upgrades SHALL NOT introduce repeatable XP awards or secretly cancel their benefits by raising other threats.

#### Scenario: Combine reward attributes
- **WHEN** Fortune, Plenty, and Discovery are all high
- **THEN** reward quality/value, common pickup supply, and optional opportunities follow their documented limits rather than multiply without bounds

#### Scenario: Improve Peace
- **WHEN** Peace increases with other tuning inputs fixed
- **THEN** its rules reduce or retain population and engagement pressure without raising enemy damage to compensate
