# Spec Delta

## Purpose

Provide tile-based scene illumination that communicates mood and player facing while remaining independent of exploration history and enemy detection rules.

## ADDED Requirements

### Requirement: Illuminate existing world artwork by grid cell
The game SHALL tint existing world artwork using bounded per-cell illumination without changing terrain geometry, sprite transparency, depth ordering, or the WebGPU-only rendering policy. Lighting SHALL be enabled in normal play and independently bypassable through Render Test.

#### Scenario: Start ordinary play
- **WHEN** a new or resumed game opens without an explicit Render Test override
- **THEN** scene lighting is enabled and existing artwork retains its pixel edges and transparency

#### Scenario: Disable lighting for comparison
- **WHEN** Render Test disables lighting
- **THEN** the game view uses the original artwork colors before any enabled fog or tactical dimming

### Requirement: Combine surrounding and forward player light
Player illumination SHALL combine a surrounding light with a separate forward-facing 180-degree contribution. Radius, intensity, and distance falloff SHALL be independently tunable. The forward contribution SHALL follow the character's existing heading without changing combat heading or movement rules.

#### Scenario: Change heading
- **WHEN** an accepted action changes the player's heading
- **THEN** the forward illumination changes direction while the surrounding light remains centered on the player
- **AND** turning alone does not reveal additional exploration cells at an unchanged position

#### Scenario: Leave the forward half-plane
- **WHEN** an unobstructed tile is behind the player
- **THEN** it can receive surrounding, ambient, or environmental light but not the forward-only contribution

### Requirement: Compose ambient and environmental sources
The illumination field SHALL combine ambient illumination with contributions from the player, existing wall torches, and campfires. Contributions SHALL decrease with distance and combine within a bounded output range. Sources SHALL NOT independently uncover unexplored terrain.

#### Scenario: Overlap light sources
- **WHEN** the player light overlaps a torch or campfire
- **THEN** their bounded contributions affect the same tile without overflowing valid color values

#### Scenario: Illuminate unknown terrain internally
- **WHEN** a torch illuminates a tile that exploration has not revealed
- **THEN** enabled fog continues to conceal that tile

### Requirement: Occlude direct light at walls and closed doors
Opaque walls and closed doors SHALL block direct light beyond their visible receiving surface. Open doors SHALL pass light. Light SHALL NOT pass through a pinched corner between two opaque neighbors. Wall-mounted sources SHALL emit from their exposed side without their supporting wall extinguishing them or leaking through the opposite face.

#### Scenario: Approach an open doorway
- **WHEN** the player moves toward and through a doorway
- **THEN** its opening admits the geometrically unobstructed portion of the light and exposes more illuminated room area as the player crosses it
- **AND** no whole-room illumination switch is required

#### Scenario: Close a door
- **WHEN** a door closes between a source and a tile
- **THEN** that source stops directly illuminating the tile without removing existing exploration knowledge

#### Scenario: Light the near wall face
- **WHEN** a source illuminates an opaque wall
- **THEN** the receiving face can be lit while the wall still blocks cells beyond it
- **AND** a source on the opposite side does not brighten the player's unlit face through the wall

#### Scenario: Light a mounted torch and its supporting wall
- **WHEN** an existing wall torch illuminates its exposed side
- **THEN** the torch artwork receives light at its own grid anchor and the adjacent wall tiles receive a weaker contribution
- **AND** the exposed wall remains illuminated when viewed from an oblique angle without lighting the opposite face or cells behind the supporting wall

#### Scenario: Match wall and home torches to campfires
- **WHEN** a wall torch or the authored home fixture left of bookshelf 1 emits light
- **THEN** it uses the same radius, RGB strength and radial falloff as a campfire, centered on the fixture itself
- **AND** its wall-mounted occlusion traversal starts on the exposed side without reducing its own grid anchor's peak brightness

### Requirement: Keep illumination cosmetic
Changing illumination or player light direction SHALL NOT change enemy detection, awareness, simulation, tactical-area membership, damage, or defensive facing. Illumination SHALL be derived from the restored scene rather than persisted as campaign progress.

#### Scenario: Bright but undetected enemy
- **WHEN** a tile is fully illuminated but its enemy fails the existing Perception or line-of-sight check
- **THEN** that enemy remains unidentified in sprites, shadows, minimap markers, tooltips, and identifying cursors

#### Scenario: Restore a campaign
- **WHEN** a campaign is reloaded or recovered
- **THEN** illumination is rebuilt from the restored player, sources, and blockers without restoring obsolete light buffers
