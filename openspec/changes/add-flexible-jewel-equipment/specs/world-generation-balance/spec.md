# Spec Delta

## ADDED Requirements

### Requirement: Bound Jewel selection within existing item budgets
Normal world-item and successful chest/crate item-reward selections SHALL assign 25% probability to eligible Jewels and 75% to the existing eligible non-Jewel pool. If no Jewel is eligible, the existing pool SHALL receive the full selection. This channel SHALL NOT add item rolls, expand floor budgets, alter required starter supplies, or create enemy loot.

#### Scenario: Preserve the opening floor
- **WHEN** production Level 1 is generated
- **THEN** no Jewel is eligible and the Wooden Stick and potion starter rules and ordinary item budgets remain unchanged

#### Scenario: Select ordinary rewards after unlock
- **WHEN** an ordinary item roll succeeds on Level 2 or later
- **THEN** a seeded 25% channel roll chooses Jewels and its alternative uses the existing non-Jewel selector without ten added definitions diluting that pool directly

### Requirement: Gate and weight individual Jewel tiers
Jewels SHALL use the declared unlock levels and per-item rarity weights below. Selection SHALL normalize weights only across eligible Jewels. World attributes, character Luck, container quality, run difficulty, and higher levels SHALL NOT bypass unlocks or change the fixed Jewel modifiers.

#### Scenario: Apply the initial Jewel unlock table
- **WHEN** ordinary Jewel eligibility and weights are inspected
- **THEN** they are:

| Items | First dungeon level | Rarity | Weight per item |
| --- | --- | --- | --- |
| Copper Ring of Vigor, Copper Guard Bracelet, Quartz Amulet | 2 | Uncommon | 25 |
| Silver Ring of Vigor, Silver Guard Bracelet, Sapphire Amulet | 4 | Rare | 11 |
| Prismatic Amulet | 6 | Very rare | 4 |
| Gold Ring of Vigor, Gold Guard Bracelet, Star Sapphire Amulet | 7 | Very rare | 4 |

#### Scenario: Respect a high-Luck early character
- **WHEN** a Level 3 reward is generated or a container is opened by a high-Luck character
- **THEN** only the three low-tier Jewels are eligible and their modifiers remain the catalog values

#### Scenario: Preserve a container Jewel's identity and stats
- **WHEN** a container stores a generated Jewel reward and is later opened
- **THEN** it releases that same instance with the fixed catalog modifiers, without reward-quality multiplication or a Luck bonus

### Requirement: Place Jewels through normal generation rules
Persistent Jewel pickups and container rewards SHALL be assigned by their appropriate existing generation passes, using valid walkable cells, reservation and occupancy checks, protected cells, and route restrictions. Test showcases SHALL NOT substitute for ordinary generation. Normal generation with test flags disabled SHALL be capable of producing every Jewel after its unlock.

#### Scenario: Generate actual dungeon loot
- **WHEN** a fixed corpus of production seeds is generated at each tier's unlock level with test flags disabled
- **THEN** eligible Jewels occur in ordinary pickup or container-reward outputs, all ten are reachable across the corpus, and every occupied world cell satisfies normal placement rules

#### Scenario: Avoid a nearby-start production shortcut
- **WHEN** production generation runs without an object-test fixture
- **THEN** it does not place a special near-entrance Jewel showcase or guarantee a Jewel outside the ordinary budgets

### Requirement: Reproduce Jewel generation and preserve reward density
The same generation inputs and balance version SHALL reproduce Jewel channel choices, definitions, instance IDs, reward assignments, and placements. Replacing an eligible item selection with a Jewel SHALL preserve the selection's item count. Balance verification SHALL test both selection probabilities and final generated budgets.

#### Scenario: Repeat a Jewel-bearing floor
- **WHEN** the same seed, level, difficulty, attributes, test flags, and balance version are used twice
- **THEN** Jewel outputs and positions match exactly

#### Scenario: Check late-floor rarity
- **WHEN** all ten Jewels are eligible
- **THEN** each low-tier, middle-tier, and high/special Jewel retains relative selection weight 25, 11, and 4 respectively within the 25% Jewel channel
