# Tasks

## 1. Start-room geometry and compatibility

- [x] 1.1 Record the central start-room bounds on newly generated floors and normalize that metadata for valid saved floors without changing their binary terrain, entities, or coordinates; verify with focused dungeon/save tests.
- [x] 1.2 Remove the experimental nearest-50 wall override and blocked-cell floor underlay; verify the ordinary binary terrain renderer remains the fallback outside start-room decoration.
- [x] 1.3 Add deterministic test coverage showing equal seed and level produce equal start-room metadata and unchanged reachability/player-start behavior.

## 2. Room-aware Tiled decoration planning

- [x] 2.1 Inspect `wall_combinations01.tmx`, `wall_combinations02.tmx`, and `dungeon_example.tmx` in Tiled to establish a verified fixed mapping for perimeter faces, corners, and doorway ends; document the source frame roles beside the mapping.
- [x] 2.2 Implement a pure start-room decoration planner that examines only the recorded room ring, omits corridor doors, and never emits obstacle-center frames; verify each side, corner, doorway, and non-ring blocked-cell case in Node tests.
- [x] 2.3 Document the room-aware decoration boundary and deterministic seed expectation in the project README; verify the documented URL example matches the seeded-launch behavior.

## 3. Shared renderer integration

- [x] 3.1 Extend the renderer-neutral world model with a presentation-only decoration collection while keeping terrain, actor, object, player, and exit coordinates unchanged; verify main-view/minimap geometry equality in focused tests.
- [x] 3.2 Render only the planned room decorations in a dedicated ordered Babylon Lite layer, cache plans by floor geometry, and retain pixel-perfect texture handling; verify no decoration is created for the minimap.
- [x] 3.3 Run one focused browser validation against Saved Game 2 at `?mute=1&randomSeed=1`, comparing the start room to the Tiled references and confirming the interior has no black bands, columns, or gaps.

## 4. Integration verification

- [x] 4.1 Run the applicable Node test suite and production build; resolve regressions attributable to this change and report unrelated pre-existing failures separately.
- [x] 4.2 Recheck the fixed seed after a fresh reload to confirm save resumption, start-room decoration determinism, and gameplay movement remain unchanged.
