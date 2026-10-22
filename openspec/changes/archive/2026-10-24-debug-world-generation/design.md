# Design

## Context

The current campaign entry point parses only `randomSeed`; `Game.jsx` chooses a slot through the menu and `dungeon.js` generates a 100-by-100 floor with `generateFloor(level, seed, difficulty)`. A campaign already contains the complete in-memory floor map and entity coordinates, while `WorldRender.js` projects that state into the game and minimap views. Tiled assets and examples live under `cryptbound/public/assets/`.

## Goals / Non-Goals

**Goals:**

- Make a generated world reproducible from a shareable URL.
- Provide a controlled Tiled export/import loop for map repair.
- Keep generated and repaired maps on the same renderer-neutral world model.
- Make map-fix behavior opt-in and safe to remove from ordinary player URLs.

**Non-Goals:**

- Changing procedural generation quality or gameplay rules as part of the debug tooling.
- Making Tiled maps the normal save format.
- Allowing arbitrary remote map URLs or network-backed map loading.
- Replacing local campaign saves or exposing hidden difficulty as player UI.

## Decisions

### Use a dedicated URL options parser

Add one pure parser for `world`, `level`, `slot`, `seed`, `mute`, and `debug-fix-map-autotiled`. The parser will validate numeric ranges and expose a typed options object to React. This keeps URL behavior testable and prevents string checks from spreading across the UI.

The existing `randomSeed` behavior should be migrated behind the parser or retained as a compatibility alias during the change. The public deep-link contract uses `seed`, while invalid values fall back to normal new-game behavior.

### Start the selected slot through the existing campaign path

The direct-link effect will call the same campaign initialization path as a clicked Saved Game button. This preserves migration, autosave, audio, fullscreen, event projection, and session behavior. A valid empty slot creates a campaign with the requested seed; an occupied slot remains authoritative unless the URL explicitly requests a repair-map session.

### Export a Tiled map plus metadata properties

Export the active floor as a TMJ/Tiled JSON document because it is straightforward to validate and compare in Node. Include tile layers for walkability and renderer roles, object layers for gameplay entities and markers, and map properties for `world`, `level`, `seed`, `generatorVersion`, tile size, and coordinate convention. If human editing benefits from TMX, generate it as a compatible companion rather than making it the only machine-readable representation.

### Keep imported maps local and explicitly selected

The import path will accept a user-selected local file or a repository-hosted fixture path only while `debug-fix-map-autotiled=1` is present. It will validate the same 100-by-100 shape, required layers, and gameplay coordinates before replacing the renderer/session floor. No arbitrary network fetch is added.

### Share one renderer-neutral model

Convert generated and repaired map data into the existing campaign floor shape before calling `WorldRender.Render`. Babylon rendering and minimap rendering remain consumers of the same model; export/import code stays outside Babylon and React presentation code.

## Risks / Trade-offs

- [Risk] Generator changes can make an old seed produce a different floor. -> Export and validate a generator version and retain it in fixtures.
- [Risk] A repaired map could make the player or exit unreachable. -> Validate start, exit, entity bounds, and walkability before activation; report errors without replacing the active floor.
- [Risk] Tiled layer conventions may drift from the binary simulation map. -> Keep a dedicated walkability layer and compare imported dimensions and cell values before rendering.
- [Risk] Direct links to an empty slot could overwrite an existing campaign after edits. -> Require explicit slot selection for autosave and show the selected slot in map-fix mode.
- [Risk] Browser coverage cannot exercise Babylon WebGPU in every environment. -> Cover parsing, serialization, validation, and renderer-neutral projections in Node; add one muted Playwright smoke test and report unavailable WebGPU capability during finalization.

## Migration Plan

1. Add parser, serializer, validator, and focused unit tests.
2. Add direct-slot startup while retaining the menu for ordinary URLs.
3. Add map-fix controls and local export/import behind the dedicated flag.
4. Add a checked-in repaired fixture and seeded browser smoke coverage.
5. Remove or ignore the repair flag to roll back the feature without changing campaign save records.

