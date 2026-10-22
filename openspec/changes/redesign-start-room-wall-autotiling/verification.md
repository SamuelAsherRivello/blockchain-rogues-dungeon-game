# Start-room verification, 2026-10-25

Coordinator: `01a17384-49d7-78c2-ab8d-a242e90b3156`. Program: [all active proposals](../../programs/all-active-proposals/program.md).

## Source and focused checks

HEAD was `6a928e97d9b78be2aec3232f2812aa55cd5d3103`, with pre-existing dirty UI/prefab files. No production code was edited by this verification owner.

SHA256 at initial browser verification:

- `src/content/world/start-wall-autotile.ts`: `4D3C1FAB0738D09BC6D4A6E202273AEE6975A04E4A43E8E73DC01E122640C250`.
- `src/systems/rendering/babylon-render-system.tsx`: `536FC0117F978B5C3890A699773963E7A9EAB8D529B6880819875E40BCECAF8D`.
- `src/systems/procedural/level-grid-system.ts`: `49CC83DA838C0515B4CA5E63D5AF11A4D731DA99282EDADF12E464ED1B734171`.

`node --import tsx --test rogues-dungeon/test/start-room-decoration.test.ts` passed all four tests. Coverage includes deterministic room metadata, compatible save metadata restoration, ring-only frame selection/open doorways/no tile 19, and game/minimap geometry equality.

## Live browser evidence

Reused project Vite PID 6336 on 127.0.0.1:6080, confirmed by its exact repository-root command and listening socket. HTTP returned Rogue's Dungeon's expected title. No additional server started.

Playwright CLI Edge 156 used isolated in-memory session `program-verification`, complete unsaved run identity with seed 1, slot 2, run 1, world 1, level 1, and `mute=1&randomSeed=1`. Source URL initialization removes identity parameters from the address bar when URL display is off; the target campaign still uses slot 2. Normal slot storage stayed empty in this isolated browser.

- Game ready, two canvases, no unsupported-WebGPU message, zero application console/page errors.
- 25 start-room perimeter entries, with corners 0/5/48/53 and faces 1/12/17/49. Wang diagnostics zero.
- Right movement changed (50,50) to (51,50), then left returned to (50,50).
- Screenshot `output/program-seed-1-checked.png` inspected. Walkable room interior has no black bands, columns, or gaps. Black outside the walls is unrendered blocked terrain.
- Compared wall faces/corners with the current production atlas and the supplied `Tiled_Examples/dungeon_example.png`. The original vendor reference is at `D:/Documents/Projects/docker-sandboxes/docker-sandbox-codex/babylon-lite-ascii-rpg/ascii-rpg/public/assets/images/Dungeons-and-Pixels-v1.4/Tiled_Examples/`.
- Seed 2 also rendered with zero diagnostics/errors, two canvases, 28 ring entries and working right/left movement, screenshot `output/program-seed-2-checked.png`.
- IAB rendered seed 1 with a visible dungeon/minimap, two canvases, no preparation/unsupported message and zero error logs. Its existing shader setting was 1; preserved it.
- Desktop Edge is unavailable through CUA inventory; CLI Edge is available. Three-context acceptance therefore remains incomplete.

## Required remaining evidence

The user connected Tiled on 2026-10-25. Live session `c21fa533-cbc7-4b71-a17f-150c60dc3398`, Tiled 1.12.2, opened the three inspection copies as doc-2, doc-9 and doc-10. `get_region_image` rendered all three 15x15 maps, and `read_region` inspected their full wall/base layers. All reference documents remained unmodified; no map or tileset was saved.

`wall_combinations01` Walls has obstacle motif at x2..4/y2..4: 6/7/8, 18/19/20, 30/31/32. This proves the opaque void center 19 is distinct from room-perimeter art. `wall_combinations02` Walls has NW/N/NE 0/1/5 at (2,1)/(3,1)/(4,1), W/E 12/17 at (2,2)/(4,2), SW/SE doorway ends 48/53 at (2,3)/(4,3), an empty doorway at (3,3), and south face 49 at (11,4). `dungeon_example` Base Layer confirms all outer faces/corners, plus distinct inner joins 6/8/30/32 and void 19. Its rendered rooms and doorway joins visually agree with those roles. Documented these live source coordinates beside the fixed mapping in `start-wall-autotile.ts`.

The historical-reference path in `documentation/dungeon-wang-mapping.md` names deletion commit `014d72f5`; the files exist in its parent, `014d72f5^`, rather than that commit's tree. `git ls-tree -r --name-only 014d72f5^` confirmed all three TMX paths. Do not restore vendor references to production merely to inspect them.

Prepared three inspection-only copies under `output/tiled-reference/`: `wall-combinations-one.tmx`, `wall-combinations-two.tmx`, and `dungeon-example.tmx`. Their XML comes from `014d72f5^`; only external tileset paths were changed to the existing supplied vendor pack's absolute paths. No tile geometry changed, and all six external tileset references per map resolve. These copies can be opened when a Tiled session connects; preparing them is not the missing live-editor inspection.

Task 3.3's visual room check is supported above, but final acceptance must repeat after fog/lighting changes the renderer. No program proposal is accepted complete yet. Full Node/build/browser claims from earlier checkmarks are historical, not a clean gate for the eventual integrated snapshot.

## Reopened integration acceptance

The completed live Tiled audit briefly brought CLI tracking to `all_done` 11/11. Independent code acceptance then found that `startRoomDecorationLayer` is allocated and populated in `babylon-render-system.tsx`, but omitted from the renderer's registered `staticLayers`/`viewLayers`. Existing screenshots can show canonical Wang walls without proving that planned decoration collection is rendered. Reopened task 3.2 honestly instead of accepting a historical checkbox. The fog owner currently owns this shared renderer and received the defect to resolve with registered, owner-cell-gated presentation or an evidence-backed account of existing registered ownership. Do not reintroduce an unmasked decoration layer or silently remove the original acceptance criterion.

## Corrected registered layer, independent checkpoint

The fog owner corrected the shared renderer. Planned start-room sprites now belong to dedicated wall-row layers registered in `staticLayers` and `viewLayers`. Corresponding canonical ring sprites are omitted to prevent duplication. The row layers use the existing wall depth order, nearest atlas sampling, camera bounds, and owning-cell fog/light permission. The plan remains floor metadata, computed during generation/restoration rather than every animation frame. The simplified minimap has no start-room decoration collection.

Coordinator independently reran all four `start-room-decoration.test.ts` tests: four passed, zero failed. An isolated Playwright CLI Microsoft Edge156 session ran `output/program-autotile-final.js` on complete-identity unsaved seed1 and seed2 URLs, with slot2 and `mute=1&randomSeed=<seed>`. Both passed:

- Exactly25/28 planned sprites registered, matching the full planned frame collections. No frame19 and zero Wang diagnostics.
- Two ready canvases, defaultRT3, no unsupported-WebGPU message, zero console/page errors, and no occupied save keys.
- Right/left movement returned to the original cell; RT3→0→1→2→3 retained coherent rendering.
- Fresh navigation reproduced every planned frame and registered count exactly.
- Inspected `output/program-autotile-seed-1-rt0.png` and `output/program-autotile-seed-2-rt3.png`: coherent perimeter roles and no black bands, columns, or gaps inside the walkable start room. Fog black outside earned knowledge is intentional.

Raw results: `output/program-autotile-final-result.log`. Browser `program-autotile` was confirmed closed before performance ownership release. This was a correctness check while other Node work was active, not an FPS benchmark.

At this checkpoint the17-file fog performance manifest matched current source, including rendererSHA256 `57819df832a3bfc43768ff43a629401170f20ded0e02039bab982058d502dfb2` and plannerSHA256 `fec1709f3c22077acc2fd35191c912d5c8fe9405f7843adb4b8d3b15d2ae7fff`. CLI now reports `all_done`11/11 after completing3.2. Program acceptance remains provisional until the scheduled integrated production build/browser gates; later performance and generation edits must reverify affected evidence. No spec archival or commit occurred.
