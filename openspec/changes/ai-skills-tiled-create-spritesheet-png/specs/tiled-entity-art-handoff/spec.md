# Spec Delta

## Purpose

Keep reusable entity PNG authoring separate from live Tiled authoring while making existing object, character, and related skills consume one consistent art-generation contract.

## ADDED Requirements

### Requirement: Route entity artwork through the shared author
Existing object, character, pickup, and animated-object workflows SHALL use `ai-skills-tiled-create-spritesheet-png` when requested artwork needs creation, modification, or extension. They SHALL reuse compatible supplied art without unnecessary generation and retain their existing editor/runtime responsibilities.

#### Scenario: Character artwork is missing
- **WHEN** a user requests a new animated character without a usable sheet
- **THEN** the character workflow obtains validated art through the shared author before its Tiled and actor-integration stage

#### Scenario: Supplied artwork is already compatible
- **WHEN** the supplied static or animated art meets the requested contract
- **THEN** the consuming workflow inventories and uses that art without regenerating it

#### Scenario: Pickup or spawner needs artwork
- **WHEN** a pickup or spawner workflow needs new entity artwork
- **THEN** it routes art creation through the shared author or character workflow without moving population or pickup-lifecycle rules into PNG generation

### Requirement: Preserve the editor-independent first stage
The shared author and PNG-only compatibility wrapper SHALL complete without editor setup or a Tiled dependency declaration. Existing editor consumers SHALL require the live bridge only for their editor stage and SHALL report completed art separately from blocked or unverified editor work.

#### Scenario: Art-only request
- **WHEN** the user asks for a sprite sheet and Tiled is not running
- **THEN** no editor setup is requested and the completed PNG output can be delivered

#### Scenario: Import cannot connect
- **WHEN** art creation succeeds but a subsequent requested Tiled import cannot connect
- **THEN** the verified PNGs and manifest remain delivered and only the editor stage is reported pending
- **AND** the workflow does not claim live editor verification

### Requirement: Keep the existing animated-object commands compatible
`tiled-ai-create-animated-object-png` SHALL delegate visual authoring to the shared skill while preserving its two-frame idle default, user-specified counts, existing object-art grid, and one horizontal final PNG. `tiled-ai-create-animated-object` SHALL retain its art prerequisite and separate Tiled/runtime contract.

#### Scenario: Existing default invocation
- **WHEN** the existing animated-object PNG command is invoked without a frame count
- **THEN** it requests a two-frame looping object idle and delivers one horizontal sheet using the established object-art grid

#### Scenario: Existing explicit count
- **WHEN** the existing command requests six frames
- **THEN** delegation preserves six actual motion frames and does not substitute the default two-frame animation

### Requirement: Preserve all animation and anchor information at handoff
Consumers SHALL interpret the art manifest's pose/frame rectangles, named sequences, directions, timing, and anchors without discarding usable supplied content. They SHALL preserve source PNG geometry and translate playback policy into the existing runtime contract without changing game position or collision based on image bounds.

#### Scenario: Multi-action character handoff
- **WHEN** the generated library contains idle, run, attack, and climb on multiple sheets
- **THEN** the character workflow retains every usable action, timing, and direction, including any action whose gameplay trigger is deferred

#### Scenario: Oversized or animated object preview
- **WHEN** a sheet is larger than its editor palette footprint
- **THEN** the object workflow creates its logical editor preview separately and preserves runtime cell size, anchor, and independent object identity

### Requirement: Preserve terrain and image-import boundaries
The terrain PNG skill SHALL retain its Scene Sheet and Wang contracts and route entity pose/action sheets to the shared author. The TSX importer SHALL retain actual image suitability checks and SHALL NOT interpret animation frames as unrelated terrain tiles or imply that image import authors animation.

#### Scenario: Terrain request
- **WHEN** the user requests a Scene Sheet or Wang terrain art
- **THEN** the terrain skill keeps its established layout and seam checks rather than routing the request as an entity animation

#### Scenario: Entity request reaches terrain author
- **WHEN** the user requests several poses or an action cycle for one object or character
- **THEN** the request routes to the shared sprite-sheet author

#### Scenario: Animation sheet reaches TSX importer
- **WHEN** an animation sheet is supplied to the image-to-TSX workflow
- **THEN** it preserves the real grid/order and reports the appropriate animated entity follow-up without inventing tile animations

### Requirement: Publish coherent source and client packages
The new skill and consumer changes SHALL live in authoritative skill sources and regenerate into supported client packages. The new invocation name SHALL work with each client's documented syntax, and documentation SHALL accurately distinguish imagegen-only authoring from live-editor requirements. Package counts and portable supporting-file links SHALL remain consistent.

#### Scenario: Codex package
- **WHEN** the Codex package is generated
- **THEN** the new skill has matching name/UI metadata and no mandatory Tiled MCP dependency

#### Scenario: Claude package
- **WHEN** the Claude package is generated
- **THEN** examples correctly translate both existing `$tiled-ai-` commands and the new `$ai-skills-tiled-` command into slash syntax
- **AND** the package describes an unavailable image-generation capability honestly rather than inventing tools

#### Scenario: Existing installed wrappers enter maintained sources
- **WHEN** the two installed animated-object skills are incorporated into the source repository
- **THEN** both clients receive the maintained workflows and the documented inventory reflects them without silently replacing global installations
