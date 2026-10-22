# World generation and growth

Create Character is followed by Create World in the same dialog rectangle.
Both use AttributePanel, GameCard and useAttributeRoll. The world rolls exactly
30 points across ten ranks from 0 through 5. Cosmetic dice frames never enter
the generator. Confirm activates the completed preview's exact campaign.

The identity panel reuses AttributePanel with World, Level, Run in its left
column and Slot, Seed in its right column. Rerolls keep identity fixed. The
five URL arguments locate a run; they do not export its custom attribute sheet.
The world number is currently a display context; the existing floor hash uses
Seed, Slot, Run and dungeon Level. Character level is a separate progression.

## Attribute parameters

Higher world values always describe a benefit. Ranks through 14 use their full
value. Above 14, effective rank is `14 + 6 * (1 - exp(-(value - 14) / 24))`.
Lifetime ranks cap at 99. Thus the starting 1-to-5 range is strongly varied,
and a trait receiving all nine points over three level-ups can go from 5 to 14
without early flattening. Discrete geometry has thresholds.

| Attribute | Generation parameter |
| --- | --- |
| Clarity | Room count falls from about 13 at rank 1 to 8 at rank 5, with a minimum of 5. |
| Comfort | Campfire target is `floor(1 + .65 * rank)`, subject to legal placements. |
| Discovery | Optional cache target is `.8 * rank` with seeded fractional rounding; higher ranks add optional room links. |
| Fortune | Reward opportunities gain `.07 * rank` chance up to .9; payout multiplier is `1 + .22 * rank`; gear quality increases every two effective ranks. |
| Guidance | Exit candidate walk distance is `round(52 / (1 + .22 * rank))`, minimum 6; candidates use an eight-cell distance band. |
| Mercy | Enemy health/damage multiplier is `1.48 / (1 + .16 * rank)`; elite chance is `.6 / (1 + .25 * rank)`. |
| Openness | Corridors widen every two ranks up to five cells; optional links increase every three ranks. |
| Peace | Population chance is `.96 / (1 + .18 * rank)`; awareness is `max(2, 9 / (1 + .13 * rank))`; engagement cooldown grows every three ranks. |
| Plenty | Common pickup frequency follows `2.6 * (1 - exp(-(.35 + .28 * rank) / 2.6))`; stack size increases every four ranks. |
| Safety | Trap density multiplier is `1.6 / (1 + .35 * rank)`. The mission route remains trap-free. |

Fortune owns the value of reward opportunities. Plenty owns common pickups and
stacks. Discovery owns optional locations and caches. Common supply quantities
share a per-floor budget between 60 and 240 based on walkable area. Container
payout descriptors share a 200-gold budget. Floors can run out of legal placement
cells; counts never override reservations or block required routes.

Baseline enemy strength depends on depth and frozen difficulty. Upgrading Peace
or Mercy never raises another threat to compensate. Enemy awareness and action
cadence are generated once, and consumed by the existing AI state machine.

## Determinism and saves

World-aware floors use `world-attributes-1`; legacy floors retain
`rogues-dungeon-floor-v4`. Purpose-tagged seeded streams separate topology,
encounters, generated traits, rewards, pickups and hazards. Entity placement
has stable candidate order. Different geometry can legitimately alter placement
candidates; adding a pickup RNG call does not reroll encounters.

On first visit, the campaign stores a compact generation profile with base
seed, difficulty, exact world attributes, generator/tuning versions and test
mode. Saves retain profiles plus entity/object deltas, not full terrain grids.
Active and visited floors always rebuild from their own profile. World growth
affects only newly visited floors. Rewards are described when a floor is
generated; opening an old container cannot reroll its world bonus. Character
Luck retains its separate equipment bonus when loot is released.

The world save extension is version 1 inside the existing version-5 campaign
envelope. Legacy compact records are backed up before migration; their known
floors retain legacy generation and their future growth starts at neutral 3s.
Historical level-ups are not awarded again. Unsupported generator/rule versions
report an unavailable save and leave the original stored bytes untouched.
Rollback requires the backed-up save and matching generator, not just hiding UI.

## Progression

Each earned character level records one pending world event with a frozen
earning-floor profile, seed, difficulty, run identity, growth-rule version and
stable level ID. Applied events retain their preceding selection context.
Partial character spending
is tracked against each three-point award. Completing that award distributes
three world points with replacement, weighted against recent repetition and by
difficulty. Multiple points can land on one trait. Candidates at 99 are excluded
after each point; complete saturation reports unused points.

`Level Up — World` follows character confirmation and shows up to three changed
numbers in green using the same attribute and earned-results components. Continue
only acknowledges a committed award. Reloads and repeated acknowledgments cannot
apply it twice. Growth and pending awards survive death; the new run starts a new
floor-profile map and keeps persistent progression.

The protected entrance-to-stairs path excludes blocking placements and traps.
Puzzle doors and barrels retain their own reservations. Generation uses finite
candidate searches and one bounded route-carving repair if required.
