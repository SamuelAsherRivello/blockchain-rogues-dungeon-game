# Proposal

## Why

Rogue's Dungeon currently has multiple partially overlapping sources for dungeon tile decisions: the external `tileset-dungeon.tsx`, renderer-local Wang tables, and nearest-match fallbacks. That split is why the same generated room, corridor, corner, or join can repeatedly receive the wrong art even after individual mappings are corrected. This change consolidates the remaining room-frame, corridor, layered-map, start-room, and fixture feedback into one authoritative TileSet-Dash Dungeon contract and makes unsupported topology visible instead of silently substituting a similar tile.

## What Changes

- Make `rogues-dungeon/public/assets/art/vendors/dungeons-and-pixels-v1.4/tiled-examples/tilesets/tileset-dungeon.tsx` the authoritative source for the Dungeon art reference and all Wang/terrain rule definitions used by generated worlds; validate its declared relative PNG reference at the resolved vendor-level atlas path.
- Define a durable, validated rule contract in that TSX for the generated topologies that use this atlas: room perimeters, outer and inner corners, one-or-more-wide corridors, bends, T/plus joins, room-to-corridor openings, layered corridor joins, start-room boundaries, void/deep-space boundaries, and intentional detail overlays.
- Inventory the masks emitted by the current world generators and assign only source-verified local tile IDs. The requirement is complete coverage of generator-produced masks, not an invented claim that the 108-tile atlas supports every one of 256 eight-neighbor masks.
- **BREAKING** Remove renderer behavior that chooses a visually similar `nearestFrame` tile for an unsupported mask. Every supported generated floor must resolve to production atlas tiles. Unsupported topology is a validation failure to repair before completion; diagnostic text, colored markers, and guidelines are confined to explicit developer inspection.
- Replace duplicated renderer-only rule tables with data validated against the TSX and consumed by the renderer through one canonical rule representation. Babylon rendering remains a consumer; it is not an alternate rule-authoring source.
- Preserve the existing binary map as gameplay authority and keep walkable floor, rendered walls, deep empty background, props, pickups, actors, and decorations in their established presentation layers.
- Add canonical Tiled fixtures covering the repaired room, corridor-width, bend, junction, room-socket, layered-corridor, start-room, and void cases, including the reported exact corner/side assignments for tile 5 and tile 17 where those masks apply.
- Add focused Node validation for TSX parsing, Wang ordering (`N, NE, E, SE, S, SW, W, NW`), duplicate/conflicting signatures, generated-mask coverage, local tile IDs, and fail-visible unsupported cases.
- Add Playwright coverage that inspects actual rendered output in a seeded, muted production session and a topology fixture matrix. Require zero unresolved cells, positive occurrence of the expected corner/side tiles, and inspected screenshots without diagnostic overlays. Exercise unsupported input separately as a negative test. Retain the required Edge and IAB verification alongside Chromium.

## Revised completion approach

This chat owns the outstanding implementation and verification from retired chat `01a16292-3572-7631-8678-5217d8af9e5a`. Its tile-5 corner and tile-17 repeated-side feedback, TSX authority requirement, source-family cleanup, and unfinished Chromium verification are included here. Existing edits are the implementation baseline. Completion and retirement notification are managed here; no duplicate change is created.

The remaining work addresses three challenges: prove that TSX rules describe the artwork rather than merely copying old lookup tables; resolve complete generated shapes through compatible rule families and layers; and prove production visual quality with Playwright screenshots and meaningful assertions. The design records a primary and backup approach for each. Completion requires continuous room boundaries, correct concave and convex corners, coherent corridor joins, preserved walkability, and a clean production view.

## Capabilities

### New Capabilities

- `tileset-wang-rules`: Defines the single external TSX contract, supported generated topology signatures, validation rules, canonical local tile assignments, and the fail-visible behavior for unsupported masks.

### Modified Capabilities

- `world-map-rendering`: World and minimap presentation must consume the canonical TSX-derived rule contract, preserve the room/corridor/deep-space layer semantics, and never silently replace unsupported topology with a nearest wall frame.
- `playwright-browser-verification`: Browser-visible Wang rendering requires a documented Chromium target, deterministic seeded fixture/session URLs, and one focused apply-time smoke check followed by the relevant finalization suite.

## Impact

- Primary asset contract: `rogues-dungeon/public/assets/art/vendors/dungeons-and-pixels-v1.4/tiled-examples/tilesets/tileset-dungeon.tsx` and the `tileset-dungeon.png` atlas resolved by its declared relative `source` path.
- Runtime consumers: dungeon map planning/rendering, Babylon Lite sprite selection, minimap projection, and any export/import or debug tooling that currently duplicates Wang assignments.
- Tests and fixtures: renderer-neutral Node tests, TSX/atlas validation, canonical Tiled fixture maps, and Chromium Playwright smoke coverage.
- No new art pack, fallback renderer, gameplay-map migration, or arbitrary 256-mask art expansion is proposed. Any unresolved decision about whether a generator should be constrained or the atlas expanded for a newly discovered topology must be recorded during design and resolved before implementation.
