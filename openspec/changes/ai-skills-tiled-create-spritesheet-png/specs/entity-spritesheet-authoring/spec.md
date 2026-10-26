# Spec Delta

## Purpose

Create, modify, and extend consistent static and animated PNG artwork for reusable objects and characters, independently of Tiled editor availability.

## ADDED Requirements

### Requirement: Author PNG artwork independently of the editor
The skill SHALL create and edit visual artwork through imagegen without requiring Tiled, a Tiled MCP connection, a map, or a running game. It SHALL report missing image-generation capability without fabricating artwork or silently substituting another provider.

#### Scenario: Author with Tiled closed
- **WHEN** imagegen is available and Tiled is closed or disconnected
- **THEN** the user can complete the PNG-authoring workflow and receive validated outputs
- **AND** the workflow makes no Tiled setup or editor calls

#### Scenario: Imagegen is unavailable
- **WHEN** the required image-generation capability is unavailable
- **THEN** the skill reports that specific limitation and does not claim generated art or invoke an unrequested fallback

### Requirement: Support both entity kinds across modes and operations
The skill SHALL support objects and characters in static and animated modes, each with create, modify, and extend operations. It SHALL accept conversational requests and honor explicit pose/frame counts, cell dimensions, directions, visual constraints, references, and destinations.

#### Scenario: Static and animated objects and characters
- **WHEN** a user requests any combination of object or character, static or animated, and create, modify, or extend
- **THEN** the skill resolves the same authoring contract and fulfills the requested combination without requiring a different art skill

#### Scenario: Resolve incomplete or conflicting input
- **WHEN** the request omits noncritical parameters or contains incompatible explicit sizes or counts
- **THEN** the skill records reasonable inferred values for omissions and resolves the blocking contradiction before generating
- **AND** it does not force a fixed style, square cells, or game-specific resolution

### Requirement: Produce named static poses without invented animation
Static mode SHALL produce the requested number of independently named poses or views in the requested order, including a one-pose sheet. It SHALL distinguish views and alternate states from temporal motion and SHALL NOT invent playback timing or loop behavior for static output.

#### Scenario: Four chest states
- **WHEN** the user requests four static 32x32 poses named closed, unlocked, open, and broken
- **THEN** the delivered sheet and mapping contain exactly those four poses in order, with 32x32 cells and no animation sequence

#### Scenario: Single static character
- **WHEN** the user requests one static character pose
- **THEN** the delivered one-cell sheet is accepted without demanding additional poses or motion

### Requirement: Produce independently described animation sequences
Animated mode SHALL preserve each requested action and direction as an ordered frame sequence with its own frame count, positive frame durations, and explicit loop or one-shot behavior. A pose count in a single-action animated request SHALL mean frame count. Static views SHALL NOT be treated as consecutive motion frames.

#### Scenario: Different action lengths
- **WHEN** the user requests idle with four frames, run with eight, and attack with six
- **THEN** all three sequences retain their exact counts and independent timing and playback behavior
- **AND** the attack reads as the requested action rather than unrelated poses

#### Scenario: A one-shot must end
- **WHEN** the user requests a one-shot death or break animation
- **THEN** the sequence retains its terminal pose and is not forced into a seamless return loop

### Requirement: Ground every family in a consistent entity identity
The skill SHALL use inspected source artwork or a canonical generated reference to preserve the entity's proportions, palette, rendering, perspective, lighting, equipment, and handedness across related outputs. It SHALL distinguish identity references, style references, edit targets, and target poses when passing images to imagegen.

#### Scenario: Multiple actions share one character
- **WHEN** a character is generated across separate idle, run, and attack families
- **THEN** each family uses the accepted entity reference and retains the same identity and rendering style

#### Scenario: Mirroring would change identity
- **WHEN** an opposite-facing pose would move an asymmetric marking or weapon into the wrong position
- **THEN** the skill produces a correct pose rather than accepting an identity-breaking mirror

### Requirement: Modify only the requested visual scope
Modify SHALL identify affected poses/actions and requested changes, use imagegen to produce visual changes, and deliver a new version by default. Unaffected frames SHALL retain their decoded pixel content. An explicitly requested family-wide change SHALL use a revised consistent identity baseline.

#### Scenario: Repair one damaged pose
- **WHEN** the user requests a change to only the open-chest pose in an existing four-pose library
- **THEN** only that pose is visually regenerated or edited
- **AND** the other three poses retain their decoded pixels in the delivered version
- **AND** the original source files remain unchanged

#### Scenario: Apply a deliberate redesign
- **WHEN** the user requests a new armor color across all character actions
- **THEN** the revised baseline and every affected action consistently use that requested color change while preserving the other identity constraints

### Requirement: Extend an existing library without losing accepted content
Extend SHALL add the requested poses, views, directions, or actions using the accepted identity and inherited geometry. Existing source files, stable ids, unaffected pixels, frame order, and declared timing SHALL remain preserved unless the user explicitly requests a migration. New sheets SHALL be allowed to avoid destructive repacking.

#### Scenario: Add an action to an animated character
- **WHEN** the user adds an eight-frame climb action to a character with accepted idle and run sequences
- **THEN** climb uses the same character style, scale, and anchor
- **AND** the original idle and run files, pixels, ids, ordering, and timing remain preserved

#### Scenario: Add static views
- **WHEN** the user adds back and side views to a library containing a front-view object
- **THEN** the two new views match the accepted object and the original front view is retained unchanged

#### Scenario: Legacy source has no manifest
- **WHEN** an existing sheet has no art manifest
- **THEN** the skill inspects the actual layout and establishes a mapping before modification or extension
- **AND** ambiguous animation semantics are resolved rather than silently invented

### Requirement: Deliver exact regular cells with stable scale and registration
The delivered PNGs SHALL match declared cell and sheet dimensions and contain complete, unclipped art. Related outputs SHALL share a consistent scale and logical registration point. Alignment SHALL preserve intentional jumps, bob, recoil, and squash/stretch instead of independently fitting each frame to its current visible bounds.

#### Scenario: Requested exact horizontal strip
- **WHEN** six 48x64 frames are requested in one row with zero spacing and margins
- **THEN** the delivered PNG is exactly 288x64 and each frame occupies its declared 48x64 cell without neighboring fragments

#### Scenario: Preserve airborne motion
- **WHEN** a jump sequence includes an airborne pose
- **THEN** the pose remains displaced from the ground baseline after assembly and does not shrink to fit a per-frame bounding box

#### Scenario: Generated layout is unusable
- **WHEN** generated poses overlap or a required body part is clipped
- **THEN** the source is repaired or regenerated before acceptance rather than concealed by slicing or stretching

### Requirement: Support one or multiple sheets with explicit mappings
The skill SHALL support a requested combined sheet or separate compatible sheets and deliver a versioned art manifest mapping stable pose/frame ids to actual sheet rectangles. Animated output SHALL also map named actions and directions to ordered frames, durations, and playback behavior. Unused grid slots SHALL not count as frames or poses.

#### Scenario: Combined multi-action grid
- **WHEN** idle, run, and attack occupy one grid with some unused cells
- **THEN** the manifest identifies every used frame and sequence without including unused slots

#### Scenario: Separate sheets form one library
- **WHEN** a new action is delivered in a separate sheet
- **THEN** the manifest retains one entity identity and shared geometry while referencing both inherited and new verified sheets

### Requirement: Preserve the requested background and rendering policy
The skill SHALL deliver actual alpha transparency for cutout artwork unless an opaque background is requested. It SHALL preserve requested rendering style and apply pixel-grid-preserving processing to pixel art. Background removal SHALL not erase subject colors, and a painted checkerboard SHALL not count as transparency.

#### Scenario: Transparent cutout
- **WHEN** a transparent entity sheet is requested
- **THEN** the final PNG contains verified alpha and is visually inspected against light and dark backgrounds

#### Scenario: Smooth or opaque artwork
- **WHEN** smooth rendering or an opaque background is explicitly requested
- **THEN** the result preserves that choice rather than forcing pixel quantization or transparency

### Requirement: Separate deterministic verification from visual acceptance
The skill SHALL report geometry, count, mapping, alpha, and source-preservation checks separately from identity and motion review. Static output SHALL have a contact-sheet review; animated output SHALL also have playback review at declared timing. Numeric checks alone SHALL NOT justify a claim that identity or animation quality passed.

#### Scenario: Structure passes but identity drifts
- **WHEN** a sheet passes dimension/count checks but changes the character's weapon or proportions
- **THEN** visual acceptance fails and the affected family is repaired without discarding unrelated accepted output

#### Scenario: Animation review
- **WHEN** an animated sheet is delivered
- **THEN** a playback preview demonstrates the actual sequence timing and its loop seam or one-shot ending
- **AND** the report names any unresolved limitation rather than claiming full acceptance

### Requirement: Preserve useful artifacts when a later step fails
The skill SHALL save accepted PNGs and mappings in stable destinations, preserve source provenance, and distinguish generated artwork from deterministic processing. A failed generation, validation, or subsequent editor handoff SHALL NOT overwrite an accepted library or be reported as successful completion.

#### Scenario: Partial generation failure
- **WHEN** idle passes and a later attack generation fails
- **THEN** the accepted idle artifact remains available and the missing attack is reported explicitly

#### Scenario: No overwrite permission
- **WHEN** the destination already contains accepted source artwork and replacement was not requested
- **THEN** the workflow writes a new sibling version or sheet instead of overwriting the source
