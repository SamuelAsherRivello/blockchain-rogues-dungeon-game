# Tasks

## 1. Static presentation and game-view culling

- [x] 1.1 Add a floor-keyed compiled static world presentation model that resolves autotile frames outside the render loop, with focused unit tests proving unchanged data is reused.
- [x] 1.2 Partition terrain and walls into camera-culled chunk layers that are deactivated outside the cull area, verifying camera movement, zoom, and resize retain correct map coordinates.
- [x] 1.3 Deactivate every offscreen dynamic visual and skip its sprite updates and animation sampling while preserving depth and phase on re-entry; verify focused renderer tests pass.

## 2. Semantic minimap and future mask boundary

- [x] 2.1 Replace minimap game-art sprite setup with a compact semantic cell-marker renderer that loads no gameplay sprite atlases, verifying player, walls, exit, pickups, and enemies retain matching coordinates.
- [x] 2.2 Add renderer-agnostic per-cell discovery and normalized-light interfaces that do not invalidate static chunks, with focused tests for independent updates.

## 3. Combat decal lifecycle

- [x] 3.1 Change landed damage particles to fade independently and expire ten seconds after their own landing time, with unit tests for staggered expiry and opacity.
- [x] 3.2 Ensure offscreen landed decals perform no visual update and are released on expiry; verify particle and renderer-focused tests pass.

## 4. Integration verification

- [x] 4.1 Run npm test and npm run typecheck, resolving renderer regressions.
- [ ] 4.2 Run the required three-context muted browser verification for the renderer and record that the game, canvas, minimap, and browser consoles remain healthy.
- [ ] 4.3 Profile sustained player running at every supported zoom, report FPS/frame-time results against the 120 FPS optimization target, and document remaining bottlenecks.
