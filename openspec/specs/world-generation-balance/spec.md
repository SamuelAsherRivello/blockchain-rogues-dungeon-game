# world-generation-balance Specification

## Purpose

Defines deterministic, level-aware content pacing for generated dungeon floors so ordinary worlds feel sparse and readable while stronger rewards and enemies arrive progressively. It also guarantees that keyed-door content remains solvable without making keys abundant.

## Requirements

### Requirement: Apply level-aware normal-floor budgets
Normal generation SHALL use bounded per-floor budgets rather than scaling ordinary pickup counts directly from the full map area. World attributes MAY adjust these budgets only within a bounded range and SHALL NOT bypass content unlock levels. On production World One, Level One, the required starter potion and Wooden Stick SHALL count toward the Level One potion and world-item totals respectively.

#### Scenario: Generate a sparse first floor
- **WHEN** a normal Level 1 floor is generated
- **THEN** it contains 1–3 total health, mana, or stamina potion pickups, 2–4 gold piles, 0–1 keys, 0–1 world gear items, 2–3 enemies, and one trap

#### Scenario: Increase content gradually
- **WHEN** a normal Level 3 floor is generated
- **THEN** it contains 3–5 total resource potions, 3–6 gold piles, 0–2 keys, 0–2 world gear items, 4–5 enemies, and approximately two traps

#### Scenario: Keep enemy counts independent from rooms
- **WHEN** a floor contains more rooms than its balance budget allows
- **THEN** the generator caps enemy placement at the level and tuning budget rather than placing an encounter in every room

### Requirement: Gate inventory items by level and rarity
World item rolls SHALL respect first-appearance levels and rarity bands. Stronger or more rewarding items SHALL arrive no earlier than their declared level and SHALL be less common than common supplies.

#### Scenario: Unlock early items
- **WHEN** a Level 1 floor rolls world content
- **THEN** common potions, gold, keys, Wooden Stick, and Wooden Vest are eligible, while later-tier gear is ineligible

#### Scenario: Unlock middle items
- **WHEN** a Level 2 floor rolls world content
- **THEN** Dagger (Magic), Sword, Oak Shield 03, Heal, Wand, and Extra Carrying Capacity +5 become eligible in addition to earlier items

#### Scenario: Make the current item pool available
- **WHEN** a Level 3 or later floor rolls world content
- **THEN** Two-Handed Sword, Chest Armor, Leg Armor (Magic), and Suit of Armor are eligible, with the strongest items retaining the lowest ordinary roll weight

### Requirement: Place the production Level One starter pack
World One, Level One normal generation SHALL place exactly one Wooden Stick and exactly one randomly selected Health Potion or Mana Potion on reachable cells at a grid distance of at most ten from the player start. The starter pack SHALL be deterministic for the same generation inputs, separate from test fixtures, and shall not duplicate either starter item in the protected starting area.

#### Scenario: Generate a fresh production opening
- **WHEN** World One, Level One is generated with production test flags disabled
- **THEN** reachable cells within ten tiles of the player start contain exactly one Wooden Stick and exactly one Health Potion or Mana Potion starter item

#### Scenario: Repeat a seeded opening
- **WHEN** World One, Level One is generated twice with the same generation inputs
- **THEN** the starter potion type and both starter-pack positions are identical

#### Scenario: Run a Level One test fixture
- **WHEN** Level One object-test or enemy-test mode is enabled
- **THEN** production starter-pack placement is not added to that fixture

### Requirement: Gate enemies by dungeon level
Normal enemy selection SHALL expose only the first two catalogued enemy ranks on Level 1, the first four on Level 2, the first six on Level 3, the first seven on Level 4, and all currently catalogued ranks by Level 5. Future catalogued enemies SHALL follow the same first-rank progression.

#### Scenario: Restrict first-floor enemies
- **WHEN** a normal Level 1 floor selects an enemy
- **THEN** the selected definition is Rat or Skeleton Warrior

#### Scenario: Expand the early roster
- **WHEN** a normal Level 3 floor selects an enemy
- **THEN** the selected definition is one of the first six catalogued enemy ranks

#### Scenario: Include the complete current roster by Level 5
- **WHEN** a normal Level 5 floor selects an enemy
- **THEN** every currently catalogued enemy definition is eligible, subject to rarity or encounter weighting

### Requirement: Preserve isolated Level 1 test showcases
Level 1 object-test and enemy-test modes SHALL add their near-entrance showcase content independently of normal budgets. Showcase content SHALL be disabled on later levels and SHALL NOT increase ordinary placement on non-test floors.

#### Scenario: Run object test mode
- **WHEN** Level 1 object-test mode is enabled
- **THEN** the approved object and world-item showcase is placed near the entrance and normal duplicate item placement is suppressed

#### Scenario: Run enemy test mode
- **WHEN** Level 1 enemy-test mode is enabled
- **THEN** one showcase instance of every currently catalogued enemy is placed near the entrance and normal enemy encounters are suppressed

#### Scenario: Generate a later test-mode floor
- **WHEN** a floor at Level 2 or higher is generated with test-mode flags
- **THEN** the Level 1 showcase placement is not applied

### Requirement: Guarantee keys for keyed doors
Every explicitly keyed door SHALL have at least one universal key available on its level. Trigger-only puzzle doors SHALL NOT contribute to the keyed-door count. Generated keys SHALL satisfy `keyCount >= keyedDoorCount`, and at least one key for each required count SHALL be placed on a reachable walkable cell rather than exclusively behind the keyed doors.

#### Scenario: Cover every keyed door
- **WHEN** a level contains three explicitly keyed doors
- **THEN** it contains at least three universal keys

#### Scenario: Exclude a trigger-only door
- **WHEN** a level contains a barrel/trigger door that opens without a key
- **THEN** that door does not increase the required key count

#### Scenario: Permit scarce surplus keys
- **WHEN** a level is generated at ordinary difficulty
- **THEN** it normally contains exactly one key per keyed door, with at most one additional key from the bounded surplus roll

### Requirement: Scale surplus keys conservatively
The generator SHALL base surplus-key chance on dungeon level and run difficulty. The default extra-key chance SHALL begin near 5% on Level 1 and increase no higher than 30% on late high-difficulty floors.

#### Scenario: Keep early keys tight
- **WHEN** a Level 1 floor has keyed doors
- **THEN** the generator strongly favors exactly one key per keyed door

#### Scenario: Increase late hard-floor convenience
- **WHEN** a late floor is generated at high run difficulty
- **THEN** the generator may add one surplus universal key, but SHALL NOT add more than the declared surplus limit

### Requirement: Preserve deterministic balance outcomes
For the same seed, level, run difficulty, world attributes, and test flags, content eligibility, counts, rarity rolls, key totals, and placements SHALL be identical.

#### Scenario: Repeat a balanced floor
- **WHEN** the same generation inputs are used twice
- **THEN** both floors have identical balanced content and positions

#### Scenario: Change only the seed
- **WHEN** two otherwise identical floors use different seeds
- **THEN** their rolls may differ while both remain within the same level gates and budget constraints
