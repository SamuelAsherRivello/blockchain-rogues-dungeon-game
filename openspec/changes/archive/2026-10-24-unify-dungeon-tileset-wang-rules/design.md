# Design

## Context

See [proposal.md](proposal.md) for the motivation and consolidated scope. The current project already has a 32-by-32 Dungeons-and-Pixels atlas referenced by `rogues-dungeon/public/assets/art/vendors/dungeons-and-pixels-v1.4/tiled-examples/tilesets/tileset-dungeon.tsx`, several named Wang sets, and renderer-local maps such as `DUNGEON_WANG_TILE_BY_MASK` and `DUNGEON_WANG_WALL_BY_MASK`. The TSX's relative image source resolves to the vendor-level `tilesets/tileset-dungeon.png`; the PNG is intentionally not adjacent to the TSX. The renderer also has a `nearestFrame` path that can turn an unsupported shape into plausible but incorrect art. The existing world and minimap share a renderer-neutral map model, while the current browser-verification contract already supports muted local sessions.

## Goals / Non-Goals

**Goals:**

- Establish the external TSX plus its resolved vendor-level PNG as the single source of truth for dungeon art, Wang signatures, and rule-family identity.
- Make coverage measurable against the actual masks emitted by every supported procedural-world topology and the canonical fixture corpus.
- Keep runtime rendering, exported Tiled maps, diagnostics, and minimap output aligned to one validated rule representation.
- Make unsupported topology deterministic and visible, with no nearest-tile visual guess.
- Provide a repeatable Chromium smoke check for a seeded world or fixture while preserving the repository's existing WebGPU-only and `?mute=1` constraints.

**Non-Goals:**

- Adding a new art pack or fabricating atlas art for all 256 theoretical masks.
- Changing collision, pathfinding, save formats, seeded generation, or gameplay rules.
- Making Babylon renderer source files an authoring surface for Wang metadata.
- Reopening or modifying the older OpenSpec change directories; this proposal absorbs their still-relevant requirements into one implementation against the current checkout.

## Decisions

### Treat the TSX as authored data and derive one canonical runtime model

The implementation will parse and validate the exact external TSX, resolve its declared relative image reference, verify atlas dimensions, Wang sets, Wang colors, and local tile IDs. A small renderer-neutral canonical model will expose named rule families, normalized eight-neighbor signatures, local tile IDs, role metadata, and unsupported diagnostics. The runtime and fixture tooling will consume that model.

This is preferred over keeping a handwritten TypeScript table because it prevents the TSX and renderer from drifting again. Direct browser parsing is not required: if runtime bundling makes XML parsing undesirable, the build/test path may generate a checked-in or build-produced typed artifact from the TSX, provided validation proves the artifact is derived from the TSX and no second authored mapping exists.

### Validate exact identities before rendering

Validation will use Tiled's `N, NE, E, SE, S, SW, W, NW` order and reject malformed signatures, duplicate incompatible assignments, out-of-range local IDs, missing atlas references, and Wang-family ambiguity. The reported corner and repeated-side assignments will be represented by exact local IDs (including tile 5 and tile 17 for their verified roles), not by image similarity or cardinal-only matching.

### Measure support from generators and fixtures, not theoretical masks

The world-generation test harness will enumerate masks and topology labels from room frames, corridor widths, bends, junctions, sockets, layered joins, start-room boundaries, and void boundaries. The fixture corpus will cover the same cases. The supported set is the union of those observed outputs. A topology is either assigned an exact TSX rule or returned as an explicit unsupported diagnostic; a missing atlas role is not filled by a guessed mapping.

This is preferred over requiring all 256 masks because the supplied atlas has finite authored coverage and the user asked to improve the actual generated worlds. If a future generator emits a new topology, the validator will fail with the new mask and fixture context before it can silently render incorrect art.

### Remove nearest-frame substitution at the rule boundary

The wall planner will resolve exact canonical roles only. It will return a supported tile entry or a structured diagnostic containing world coordinate, mask, topology, and rule family. Supported production floors must have zero unresolved cells. Red text, diagnostic sprites, pivot markers, grids, and guidelines must be absent from the production game view and minimap. Developer inspection may expose diagnostics only through explicit opt-in. An unresolved cell fails validation and remains unfinished work; hiding the marker does not repair its shape. No fallback weighting based on cardinal or diagonal similarity will remain in the active path.

### Preserve explicit presentation layers

Production completion uses floor variants plus blocked-cell wall recipes stored as TSX properties. Native Tiled Wang sets keep one assignment per source tile; the canonical `Generated wall boundary` family is derived from `dungeon:blocked-cell-rules`, not duplicate native Wang assignments. Complex contacts use `dungeon:wall-quarter-profiles` and source atlas crops. This is an explicit runtime composition, not a claim that Tiled's brush paints arbitrary masks. See `rogues-dungeon/documentation/dungeon-wang-mapping.md` for contact ordering and the exact source roles, and `dungeon-wang-verification.md` for current evidence and wider-checkout limitations.

Grounds remain walkable terrain, walls remain nonwalkable boundary art, deep unreachable space remains empty, and objects/actors retain the existing shared world-depth pass. Rule-family metadata will distinguish room frame, corridor/edge/junction, void frame, and details so a tile with a similar signature cannot be reused across incompatible contexts. The binary map remains authoritative for all simulation behavior.

### Use deterministic Tiled fixtures plus focused Chromium evidence

Fixtures will use explicit layer roles (`Grounds`, `Walls`, `Pickups`, and `Decorations`) and expected rule outputs. Node checks will prove XML/rule correctness and complete generator coverage. After the related implementation group, a focused Playwright run will open a deterministic muted production route without debug query flags. It must check initialization, console health, zero unresolved cells, and positive counts at explicit coordinates for expected rendered roles. It must capture the actual canvas for visual inspection. An intentionally unsupported fixture belongs in a separate negative test and cannot satisfy production acceptance. Broader fixture and browser coverage remains a finalization concern.

The repository requires Playwright CLI Edge, desktop Edge through CUA, and IAB through CUA. Complete those checks with the same muted project-owned server. Chromium remains an additional automated target. Browser unavailability is recorded as a limitation, never a successful rendering check.

### Challenge 1: correct metadata can still describe incorrect artwork

Current validation proves mask lookup consistency but the parser collapses all nonzero Wang colors into a binary mask. A copied legacy table can therefore be internally consistent without proving the tile's orientation or family is correct.

Primary solution: inspect the resolved atlas and existing Tiled examples, record source-backed expected tile IDs for each fixture coordinate, and audit TSX Wang colors, family identity, orientation, and edge/corner meaning. Preserve full authored Wang identities until an explicitly binary family is validated. Compare generated runtime data against the TSX reproducibly.

Backup solution: use small isolated Tiled reference fixtures to disambiguate roles and compare them with atlas crops. Reuse a verified compatible family or existing atlas layer composition where justified. Never invent signatures merely to make coverage pass. Genuine absent art remains an explicit blocker with its smallest reproducible example.

### Challenge 2: unsupported shapes are unfinished production work

The previous plan allowed every emitted mask to return either a tile or a diagnostic. That proves failure reporting, not complete autotiling. Local masks also need family context and consistent joins with neighboring cells.

Primary solution: audit rooms, convex/concave corners, corridor widths, bends, T/plus joins, sockets, layered joins, start-room and void boundaries. Resolve each case through verified TSX family semantics and existing production layers. Test whole arrangements and matching seams, not just isolated IDs. Keep generation and gameplay data unchanged and compile static decisions outside the frame loop.

Backup solution: decompose a complex presentation into verified atlas roles on existing layers, with explicit depth and transparency checks. If the supplied artwork cannot express a topology without changing walkability or adding art, record the exact shape and needed decision. Do not silently change generation, omit a wall, or substitute a similar frame.

### Challenge 3: the smoke test currently rewards diagnostics

The current test requires diagnostics greater than zero and accepts a combined tile-5/tile-17 count of zero. Its DOM rule attributes prove a lookup exists, not that the expected shape appears correctly on the canvas.

Primary solution: replace that acceptance with zero diagnostics in supported production scenes, positive coordinate-specific rendered evidence, and screenshots of the canvas. Inspect room silhouettes, wall continuity, corner orientation, sockets, layering, and void boundaries at native and other exposed zooms. Compare against independently reviewed atlas/Tiled expectations. Check the normal route has no debug text or guidelines, even if diagnostic tooling remains available.

Backup solution: isolate a failing case in a minimal deterministic fixture, capture its canvas at native scale, and compare the affected region with an independently verified reference. On browser session failure, recreate only a task-owned session and retry once. Use a working WebGPU browser for additional evidence and report any required context still unavailable. A skip or self-generated screenshot baseline alone cannot establish success.

## Risks / Trade-offs

- [Some current generator outputs may be genuinely unrepresentable by the atlas] → Fail validation with topology and coordinates, then either constrain the generator or explicitly approve new art in a later change; do not guess a tile.
- [Parsing XML or producing a derived artifact can drift from Tiled's versioned format] → Validate the exact TSX version/fields used by this pack, assert atlas dimensions, and run the validator in CI and focused tests.
- [Removing nearest-frame fallback can expose visible gaps] → Resolve the failing topology using verified TSX roles and canonical fixtures; keep diagnostic overlays opt-in and require zero unresolved production cells.
- [Old renderer-local maps may be relied on by unrelated dirty work] → Preserve unrelated edits, migrate only the active dungeon rule path, and add compatibility tests until all consumers use the canonical model.
- [Chromium may lack usable WebGPU in a local environment] → Report unavailable WebGPU/browser capabilities honestly; the smoke test must not claim rendering passed when initialization is unavailable.

## Migration Plan

1. Inventory the current TSX, atlas, generator masks, renderer-local mappings, and prior fixtures without changing gameplay data.
2. Extend the external TSX with only source-verified rule metadata and add the canonical fixture corpus.
3. Implement validation and the derived canonical rule model, then migrate runtime consumers and remove active nearest-frame substitution.
4. Re-audit source identities and complete generated topology coverage; reopen prior completed work where the new acceptance criteria expose gaps.
5. Remove production diagnostic drawing, run the focused Playwright production check, inspect screenshots, repair failures, and run the applicable finalization suites.
6. If the implementation must be rolled back, restore only this change's runtime edits while retaining fixture/validator diagnostics; no save or map migration is required.

## Open Questions

None. The design deliberately resolves the only material ambiguity: coverage means every mask emitted by the current generators and canonical fixtures, not unsupported theoretical masks for which the supplied atlas has no authored art.
