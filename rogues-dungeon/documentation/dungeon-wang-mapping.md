# Dungeon tileset Wang mapping

Author: Codex, 2026-10-22. Source art: `../public/assets/art/game-view/tilesets/art/tileset-dungeon.png` (384 × 288 pixels, 12 columns × 9 rows of 32-pixel tiles). Source tileset: `../public/assets/art/game-view/tilesets/data/tileset-dungeon.tsx`, whose declared relative image source resolves to that PNG. Local tile IDs below refer to that exact TSX. The wall and stone floor family occupies the first five rows; animated liquids, dirt, and props are excluded.

The original Tiled composition references are retained in Git history at commit `014d72f50d88f4eedcdcecabcf8c3e83228da88c`, immediately before the vendor examples were removed from the active asset tree: `rogues-dungeon/public/assets/art/vendors/dungeons-and-pixels-v1.4/Tiled_Examples/wall_combinations01.tmx`, `wall_combinations02.tmx`, and `dungeon_example.tmx`. These files are reference evidence only; do not restore them to production assets solely for runtime rendering. A live Tiled comparison remains required when an editor session is available.

The `Walkable floor` region uses a **mixed** Wang set. Values are in Tiled's clockwise order `N, NE, E, SE, S, SW, W, NW`; `1` is painted floor and `0` is outside that region. The assignments follow the documented Dungeon Figure 8 limited profile and were checked against the exact source sheet. Tile 31 is an optional decorative variant of tile 1 and is excluded so the upper boundary has one predictable choice.

| Local tile ID | Wang values | Visual role |
| --- | --- | --- |
| 0 | 0,0,1,1,1,0,0,0 | Upper-left outer turn |
| 1 | 0,0,1,1,1,1,1,0 | Upper wall |
| 5 | 0,0,0,0,1,1,1,0 | Upper-right outer turn |
| 12 | 1,1,1,1,1,0,0,0 | Left wall |
| 13 | 1,1,1,1,1,1,1,1 | Stone floor |
| 17 | 1,0,0,0,1,1,1,1 | Right wall |
| 48 | 1,1,1,0,0,0,0,0 | Lower-left outer turn |
| 49 | 1,1,1,0,0,0,1,1 | Lower wall |
| 53 | 1,0,0,0,0,0,1,1 | Lower-right outer turn |
| 6 | 1,1,1,0,1,1,1,1 | One diagonal void at SE |
| 8 | 1,1,1,1,1,0,1,1 | One diagonal void at SW |
| 30 | 1,0,1,1,1,1,1,1 | One diagonal void at NE |
| 32 | 1,1,1,1,1,1,1,0 | One diagonal void at NW |

Proof result: Tiled 1.12.2 painted all 64 cells of the 8 × 8 room in `dungeon-wang-proof.tmx` using the nine outer-room roles above. `read_region` confirmed every expected local ID, and the rendered room has continuous walls and all four correct turns. Erasing and repainting its lower-right corner restored tile 53 and preserved the neighboring wall and floor tiles. A separate one-cell island probe returned `MISSING_WANG_PATTERN` for Wang ID `0` and changed no cells.

Fitness outcome: **Exact-rule ready** for the supported generator and fixture corpus. The source TSX now separates structural room frames, void frames, detail variants, and generated blocked-cell wall boundaries. A rectangular hole or narrow bridge either resolves through the generated-wall family or produces a deterministic diagnostic; the runtime never selects a nearest authored profile.

## Runtime placement

Walkable cells use the TSX `dungeon:floor-tiles` property. Room-frame wall art belongs on blocked boundary cells, not on walkable corridor cells. Blocked boundaries resolve exact `Generated wall boundary` rules first. A straight boundary is invariant under its diagonal contacts. Remaining shapes use the TSX `dungeon:wall-quarter-profiles` composition, whose index encodes the two adjacent cardinal contacts and diagonal contact. Each quadrant samples the corresponding 16-by-16 production atlas region. Whole-tile cases remain one sprite; complex cases use four crops of the same texture. No new artwork or nearest-mask matching is involved. All static decisions are compiled once per floor.

`Generated wall boundary` is a runtime recipe family loaded from the TSX `dungeon:blocked-cell-rules` property. It is not a native Tiled terrain-brush set: Tiled permits one Wang signature per tile in a set, whereas several blocked-cell contact masks deliberately share source artwork. Keeping that distinction prevents duplicate `wangtile` IDs from overwriting each other in Tiled. The native room-frame set remains limited to its authored footprint; the runtime composition is what supports complex procedural shapes. A fresh live Tiled brush proof was unavailable because no editor session was connected; runtime fitness is established by the Playwright fixtures, not a claim of unrestricted Tiled painting.

The typed artifact is checked against all TSX families, rule counts, complete Wang IDs, floor IDs and composition profiles. `node --import tsx rogues-dungeon/test/generate-dungeon-rules.ts` prints a reproducible module for a reviewed regeneration.

Quarter order is NW, NE, SW, SE. Each profile's index is `firstCardinal + 2 * secondCardinal + 4 * diagonal`. NW uses N/W/NW, NE uses N/E/NE, SW uses S/W/SW, and SE uses S/E/SE. Empty quadrants sample the transparent void interior, tile 19. Corners use source outer room tiles 0/5/48/53 and inner void tiles 6/8/30/32; faces use 1/12/17/49. The isolated rectangle test independently asserts all four corner and side identities.

Deep blocked interiors have no terrain sprites. The game and semantic minimap retain matching coordinates. Production diagnostics must be zero; red markers are visible only with the explicit `debug-wang=1` developer flag. Named inspection fixtures use `?mute=1&world=1&level=1&slot=1&run=1&seed=13579&debug-fix-map-autotiled=1&scenario=wang-topology-matrix`. Normal production verification omits both debug flags.

## Repeatable browser verification

Install Chromium with `npx playwright install chromium`. The configured `chromium` target currently uses the locally installed Google Chrome executable. The `edge` target uses Microsoft Edge. Run from the repository root:

```powershell
$env:PLAYWRIGHT_EXTERNAL_SERVER='1'
$env:PLAYWRIGHT_PORT='6080'
$env:PLAYWRIGHT_HEADED='0'
npx playwright test wang-autotiling --project=chromium --project=edge
```

This reuses the ownership-verified project preview instead of starting a second server. Remove the external-server environment variable to use the suite's managed server after stopping the preview. All fixture URLs include `mute=1`. Screenshots and traces stay ignored under `output/playwright`. The suite checks seeds 17, 914 and 13579 plus corridor joins and the topology matrix at zooms 0.25, 0.5, 1, 2 and 4. Node coverage also checks seeds 1, 42, 404, 2026 and 777 at corridor widths 1, 2 and 3.

## Tile-reference correction

The earlier substitution of outward reference tiles 48/53 at inward joins was incorrect: their transparent areas left black cutouts. The TSX `dungeon:inward-corner-rules` now takes precedence over exact blocked-cell rules for adjacent cardinal floor contacts: N+E selects tile 8, E+S tile 32, N+W tile 6, and S+W tile 30. Diagonal contacts do not change this inward-corner classification. These shared rules apply to every generated level, without seed-specific runtime exceptions.

Regression checks cover all four orientations and all 16 diagonal variations each. For seed `3266798470`, headless Chromium and Edge verified the six reported joins (40,47), (54,53), (40,54), (45,57), (38,47), and (46,47), plus unchanged outward references (46,54) and (58,52). Each location has a closeup screenshot and a rendered-pixel comparison against its production atlas tile. The source-rule suite passes 11 tests; project typechecking passes.

The requested game-to-tile reference is now explicit in the runtime wall table:
the marked corner case resolves to local tile `5` (Wang mask `112`), and the
repeated marked side cases resolve to local tile `17` (Wang mask `64`).
These exact entries prevent the nearest-mask fallback from substituting another
wall frame.
