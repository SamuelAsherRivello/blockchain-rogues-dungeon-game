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


## Dungeon graph version one

New runs select `dungeon-graph-1` explicitly. Historical profiles with no
topology version retain the original room chain, geometry, object coordinates
and corridor behavior. `dungeon-chain-1` requests that same legacy path.
The selection is pinned per floor and retained for retries and compact saves.
Retry construction retains the existing world-growth policy for the new
baseline's difficulty and world attributes while retaining its topology family.
World growth and balance versions remain independent. The save-only baseline
cache keys the complete profile, including topology version.
Campaign copies detach caller-owned generation metadata into a deeply frozen
snapshot before sharing it. Later turns, save projections and recovery copies
reuse only these owned snapshots; actors, puzzles, resources and discovery stay
mutable and independent. Replacing a floor's generation record establishes a new
snapshot. Unknown mutable metadata types retain independent structured cloning.

The graph starts with a bounded-degree spanning tree and adds distinct optional
loop edges. Every node has at most four incident edges. The loop budget is
bounded by the number of rooms and available distinct edges. Room count uses
Clarity and level area; the start is an additional 7-by-7 room. Ordinary rooms
are 5 to 9 cells wide and 4 to 7 cells tall, with height at least corridor width.
Rooms have two cells of placement clearance. Roles identify the
start, largest arena, degree-three-or-higher hubs, dead ends and a remote
treasure destination. A room can have several roles. Arena and hub rooms get
enemy placement priority; treasure and dead-end rooms get chest/crate priority.
Existing difficulty budgets and nonblocking placement checks still apply.

Corridor width ranges from one to five cells and expands across the direction
of travel. The layout first tries both L routes, then a deterministic cardinal
search that protects the sealed level-one chamber, reserved landmarks and an
authored home's footprint. The home uses its south entrance. Actual graph edge
metadata stores sockets, centerline paths and straight segments. Consumers
must use these routed segments rather than reconstructing a planned L bend.
The exit attachment records the actual stair position, its graph anchor room,
and the terrain path between them. For a sealed-chamber exit, the attachment
continues from the start-room node through the puzzle door to the chamber.
This special chamber is not reported as an ordinary room or an unrelated
farthest-room destination.

The exit search prefers a non-start room at the Guidance target distance,
with a minimum six-step terrain route. Explicit level-one interaction fixtures
retain their nearby stair. Quality runs after structure and before activation.
It checks semantic roles, room dimensions, actual corridor footprints,
protected cells, room/exit reachability, pacing and entity placements. A single
deterministic route repair is allowed for connectivity failures. Unresolved
issues reject activation with structured issue codes in the error. Required
walkable markers are recorded before terrain writes and include stairs,
chamber doors/goals, encounter entrances/triggers and the home portal. Home
wall reservations remain distinct. Repair records retain original issue codes,
changed cell coordinates and pass count in `floor.generation.qualityRepairs`.

Teleport prefabs define their exit arrows in `teleportArrows`. The level entrance
uses the same arrow count and relative positions, reverses each direction, and
does not rotate the footprint. The player home has two adjacent south-facing
exit arrows, so its dungeon entrance requires two adjacent north-facing arrows
in a north wall. Both wall cells must have clear southern approaches before
either opening is carved. Placement reserves both openings and approaches
together and rejects locations that only fit part of the footprint. Historical
generation retains its original placements for save compatibility.

Run the reproducible graph and compatibility fixtures from the repository root:

```sh
node --import tsx --test rogues-dungeon/test/dungeon-topology-system.test.ts rogues-dungeon/test/dungeon-graph-layout-system.test.ts rogues-dungeon/test/dungeon-quality-system.test.ts rogues-dungeon/test/dungeon-generation-compatibility.test.ts rogues-dungeon/test/dungeon-generation-integration.test.ts
```

The compatibility fixture was captured before graph integration. Its terrain
and placement hashes must remain unchanged. Compare `generateFloor(1, 42, 1,
{worldAttributes: DEFAULT_WORLD_ATTRIBUTES})` with the same call plus
`topologyVersion: 'dungeon-graph-1'`; only the explicit graph call adopts the
new geometry. Browser evidence and the second human playtest remain required
before beginning the overworld milestone.
