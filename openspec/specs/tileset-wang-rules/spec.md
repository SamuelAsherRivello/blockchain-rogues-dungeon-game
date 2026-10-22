# tileset-wang-rules Specification

## Purpose
Define one authoritative TileSet-Dash Dungeon contract that binds the supplied atlas art to the Wang and terrain rules required by every procedurally generated Rogue's Dungeon world.

## Requirements

### Requirement: Use one authoritative dungeon tileset contract
The generated-world presentation SHALL use the external `tileset-dungeon.tsx` and the PNG resolved by its declared relative `source` attribute as the only authoritative source for dungeon tile art and Wang rule metadata.

#### Scenario: Validate the dungeon asset contract
- **WHEN** the dungeon rule set is loaded or checked
- **THEN** the TSX resolves its declared PNG reference, uses the declared 32-by-32 atlas geometry, and exposes the named rule sets used by generated worlds
- **AND** no Babylon renderer file is treated as the authoring source for tile rules

### Requirement: Represent every generated topology explicitly
The rule contract SHALL resolve every supported generated and canonical-fixture topology to source-verified production tile roles. Unsupported results SHALL fail acceptance until repaired; an explicit error alone does not constitute complete coverage.

#### Scenario: Inventory generated masks
- **WHEN** the supported generator and fixture corpus is analyzed
- **THEN** each emitted signature resolves in its rule-family context to verified tile IDs with zero unresolved supported cells
- **AND** any unsupported signature fails validation with its coordinates and topology
- **AND** the contract does not claim support for masks that no supplied atlas art can represent

### Requirement: Preserve Tiled Wang ordering and identity
Each Wang signature SHALL use Tiled's `N, NE, E, SE, S, SW, W, NW` ordering and SHALL identify the exact local tile ID and named rule family that owns it.

#### Scenario: Resolve a known room-frame role
- **WHEN** the reported top-corner or repeated side pattern is resolved
- **THEN** the validator preserves the source-verified tile identity, including tile 5 for the applicable top-right corner role and tile 17 for the applicable repeated right-side role
- **AND** a visually similar tile is not accepted as an equivalent replacement

### Requirement: Reject conflicting rule metadata
The rule validator SHALL reject duplicate signatures with incompatible local tile IDs, Wang colors, family names, atlas bounds, missing image references, or malformed eight-value signatures.

#### Scenario: Detect conflicting assignments
- **WHEN** two rule entries claim the same family and signature but different local tile IDs
- **THEN** validation fails with both entries identified
- **AND** no runtime rule table is produced from the invalid TSX

### Requirement: Fail visibly for unsupported topology
The presentation SHALL never choose a nearest or otherwise visually similar tile when an emitted topology has no exact rule assignment.

#### Scenario: Render an unsupported generated shape
- **WHEN** a generated or fixture map contains an unsupported room, corridor, corner, or join signature
- **THEN** the system emits a deterministic diagnostic or validation error for that cell and topology
- **AND** it does not silently render a different wall frame

### Requirement: Keep rule data separate from gameplay authority
Tileset rule resolution SHALL be presentation-only and SHALL not change walkability, collision, pathfinding, entity placement, save data, seed determinism, or floor generation.

#### Scenario: Re-render a saved seeded floor
- **WHEN** the same saved binary map is rendered before and after TSX rule validation
- **THEN** gameplay coordinates and movement outcomes remain unchanged
- **AND** only the presentation rule or diagnostic output can differ

### Requirement: Provide canonical topology fixtures
The project SHALL maintain deterministic Tiled or equivalent fixtures for room perimeters, one-or-more-wide corridors, bends, T/plus junctions, room-to-corridor sockets, layered joins, the start room, deep void, and the reported corner/side mappings.

#### Scenario: Validate the fixture corpus
- **WHEN** the fixture validator runs
- **THEN** every fixture declares its expected topology, generated mask set, rule family, and local tile IDs
- **AND** fixture validation fails if the result depends on nearest-tile fallback or an ambiguous layer assignment

### Requirement: Verify authored art semantics
Rule validation SHALL preserve authored Wang color identities and family context. Binary occupancy normalization SHALL apply only to verified binary families. Expected tile orientation and joins SHALL be checked against the supplied atlas or independently verified Tiled references.

#### Scenario: Audit a corner assignment
- **WHEN** a TSX rule assigns a tile to a corner or side
- **THEN** its orientation and seam agree with the source artwork and neighboring fixture tiles
- **AND** copying an existing runtime table alone does not establish correctness
