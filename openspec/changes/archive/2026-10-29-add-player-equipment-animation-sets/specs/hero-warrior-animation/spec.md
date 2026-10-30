# Hero Warrior equipment appearances

## ADDED Requirements

### Requirement: Provide four complete equipment appearances
The player SHALL have four appearances: set 1 with the current sword and shield, set 2 with the same sword only, set 3 with the same shield only, and set 4 with neither. Each set SHALL retain all ten current clips and 48 frames with existing directions, order, timing, and loop behavior. Worn armor and character design SHALL remain consistent.

#### Scenario: Inspect every appearance
- **WHEN** an appearance catalog is inspected
- **THEN** it exposes four-frame idle, six-frame run, and four-frame attack clips for down, side, and up, plus the six-frame nondirectional death clip
- **AND** directional frames remain 32x48 and death frames remain 48x48

#### Scenario: Preserve the original appearance
- **WHEN** set 1 is delivered alongside the other sets
- **THEN** its original 48 PNGs and shared shadow remain byte-for-byte unchanged

#### Scenario: Remove all sword imagery
- **WHEN** set 3 or set 4 plays attack or death
- **THEN** no sword, sword swing trail, or dropped sword is visible in any frame

#### Scenario: Remove all shield imagery
- **WHEN** set 2 or set 4 plays any clip
- **THEN** no shield or dropped shield is visible in any frame

### Requirement: Keep corresponding artwork exactly registered
Corresponding frames across sets SHALL preserve canvas geometry, scale, pose registration, visible body landmarks, and intentional motion. Pixels outside declared equipment removal and anatomy repair regions SHALL match the original decoded pixels exactly. Newly exposed anatomy SHALL be consistent across sets. Acceptance SHALL require both pixel checks and inspected timed playback.

#### Scenario: Compare corresponding frames
- **WHEN** two sets show the same animation, direction, and frame index at the same world position
- **THEN** their protected body landmarks have zero horizontal or vertical displacement
- **AND** protected decoded pixels match and the shared shadow retains its position

#### Scenario: Review reconstructed anatomy
- **WHEN** removing equipment reveals a hand or body region
- **THEN** the reconstructed region preserves the character's proportions, palette, outline, pose, and consistent appearance in every set where it is exposed

#### Scenario: Reject a structurally valid drifting set
- **WHEN** sheet geometry passes but playback or overlays show body drift, clipped anatomy, incorrect equipment, or altered motion
- **THEN** the affected family fails acceptance and SHALL be repaired before delivery as a complete set

### Requirement: Select appearance from occupied equipment groups
Appearance SHALL depend only on committed Weapons and Armor occupancy: both occupied selects set 1, only Weapons selects set 2, only Armor selects set 3, and neither selects set 4. Any occupied position counts regardless of the item's identity, category, or statistics. Inventory, Quick Slots, abilities, Jewels, and drag previews SHALL NOT affect this selection.

#### Scenario: Choose all four combinations
- **WHEN** committed Weapons and Armor occupancy is respectively both, Weapons only, Armor only, or neither
- **THEN** the player shows set 1, set 2, set 3, or set 4 respectively

#### Scenario: Treat slot group as the visual meaning
- **WHEN** a shield is equipped in Weapons and Armor is empty
- **THEN** the player shows set 2 with sword art

#### Scenario: Count either position and spanning items
- **WHEN** either position in a group contains an item or one item spans both positions
- **THEN** that group is occupied for appearance selection without additional visual effects from the number of positions

#### Scenario: Ignore unrelated equipment
- **WHEN** a player with empty Weapons and Armor equips a Jewel
- **THEN** the player continues to show set 4

#### Scenario: Ignore canceled or projected equipment
- **WHEN** a drag previews equipment but is canceled or rejected
- **THEN** the player's appearance remains based on the unchanged committed equipment

### Requirement: Preserve playback when appearance changes
Changing equipment appearance SHALL preserve the active clip, frame index, elapsed frame time, playback speed, playing state, loop progress, and completion state. It SHALL preserve world position, collision, sprite registration, shadow, rendering effects, and existing gameplay animation triggers. Missing appearance frames SHALL produce an identifiable validation failure instead of silent substitution.

#### Scenario: Switch partway through a clip
- **WHEN** an accepted equipment transaction changes appearance between two animation updates
- **THEN** the next render shows the corresponding frame in the new set
- **AND** playback continues without a frame-zero restart, loading flash, or renderer recreation

#### Scenario: Preserve existing movement and deferred attack
- **WHEN** the player changes equipment and then uses existing movement or interaction modes
- **THEN** idle, Gridless run, hop, stair, and death trigger behavior stays unchanged
- **AND** all attack variants remain selectable without adding an attack gameplay trigger

#### Scenario: Keep mirroring and rendering effects aligned
- **WHEN** the player faces west, hops, takes damage, or descends stairs in any set
- **THEN** the selected artwork uses the same mirroring, position, scale effects, depth, lighting, and clipping as the corresponding original animation

#### Scenario: Report a missing variant frame
- **WHEN** a required set, clip, or frame cannot be resolved or fails its declared dimensions
- **THEN** validation identifies the set, clip, frame, and asset instead of displaying an unrelated frame

### Requirement: Derive appearances across save and death lifecycle
The game SHALL derive appearance from the rendered campaign's committed equipment after loading and equipment transactions. Death SHALL keep the fatal campaign's appearance through the death sequence. A fresh empty-equipment run SHALL show set 4. Appearance selection SHALL require no new persisted field.

#### Scenario: Reload an equipped campaign
- **WHEN** a saved campaign resumes with occupied equipment
- **THEN** its first ready world render shows the set matching Weapons and Armor occupancy

#### Scenario: Finish death before replacing equipment
- **WHEN** an equipped player dies and subsequently starts an empty-equipment replacement run
- **THEN** death uses the fatal loadout's set and the replacement run begins with set 4

### Requirement: Deliver verifiable animation artwork
The delivered art SHALL include frame mappings, timing, anchors, source provenance, structural validation, inspected contact sheets, and timed animation review bound to the delivered sheet hashes. Evidence SHALL identify the actual sprite-sheet skill and authoring operations used. Structural validation alone SHALL NOT count as visual or motion acceptance.

#### Scenario: Audit the delivered sets
- **WHEN** the delivery is reviewed
- **THEN** all 192 frame mappings and their animation sequences can be traced to source references, actual editing operations, geometry checks, and visual review of the exact output hashes

#### Scenario: Detect changed reviewed output
- **WHEN** a sheet changes after acceptance
- **THEN** its previous hash-bound visual acceptance no longer passes and the changed output requires renewed review
