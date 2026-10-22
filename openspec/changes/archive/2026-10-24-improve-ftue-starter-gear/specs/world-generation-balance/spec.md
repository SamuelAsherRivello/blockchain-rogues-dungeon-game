# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
