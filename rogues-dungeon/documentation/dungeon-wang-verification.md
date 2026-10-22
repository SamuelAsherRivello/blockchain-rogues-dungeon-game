# Dungeon autotiling verification

Verified on 2026-10-22 against the shared checkout and the project-owned Vite preview on port 6080. This chat incorporates the retired `tiles old` chat, ID `01a16292-3572-7631-8678-5217d8af9e5a`.

## Source and production behavior

The authoritative TSX references the unchanged 384-by-288 production atlas. Native Wang identities and custom blocked-cell recipes remain in that TSX; the renderer consumes a validated typed derivative. Native Tiled painting remains limited to authored footprints. The procedural renderer composes remaining contact patterns from source atlas quarters. No connected live Tiled editor was available for a new brush proof.

The former renderer left hundreds of walkable and wall cells unresolved and drew red diagnostic squares across them. The new planner uses actual floor art for walkable cells, preserves exact corner/side assignments, resolves complex boundary contacts, and leaves deep void empty. Red diagnostic sprites require `debug-wang=1`. Production routes have zero unresolved cells and no diagnostic text or guidelines.

The manual corridor fixture had its width axes reversed. Correcting that fixture makes widths 1, 2 and 3 exercise the intended perpendicular cross-sections. Production generation and gameplay walkability were preserved.

## Coverage and evidence

The Node corpus covers seeds 17, 914, 13579, 1, 42, 404, 2026 and 777 at widths 1, 2 and 3, plus the corridor and topology fixtures. Every generated boundary resolves, and all four source quarter profiles cover their eight contact patterns. Independent rectangle expectations assert corners 0/5/48/53 and faces 1/12/17/49. Negative tests reject invalid masks, absent composition profiles, conflicting signatures, out-of-range IDs, and undeclared/nonbinary colors.

Playwright covers three production seed identities, corridor joins and an isolated topology matrix at zooms 0.25, 0.5, 1, 2 and 4. Additional native-scale focus fixtures cover corridor widths, a bend, T and plus joins, an inner hole and a room socket. Each checks WebGPU initialization, clean consoles, zero unresolved cells, and positive coordinate-specific tile-5/tile-17 occurrences. The matrix also checks fixed independently specified corner coordinates. Screenshots are inspected against the enlarged source atlas; metadata assertions alone are insufficient.

Reviewed captures include the complete matrix overview, the native rectangle, all six native focus fixtures, production seed 17 at native scale, and the corridor arrangement. They show continuous production artwork without red markers or construction guidelines. Artifacts are ignored under `output/wang-visual-final`, with final isolated runs under `output/wang-final-browsers`. Browser logs are retained under `output/`.

Desktop Edge through CUA and the built-in browser both initialized the playable game and minimap, reported three canvas elements, zero unresolved cells, no remaining preparation message and no console errors. Playwright CLI Edge also captured the production view and verified its zero diagnostic count.

## Integration findings

The initial full Edge run finished with 19 passes and 14 failures. Its log is `output/wang-browser-finalization.log`. The failures involve old persistence/test-fixture assumptions, menu and settings selectors/geometry, keyboard controls, movement border expectations, and a trace-artifact collision. All five autotiling cases in that full run passed. Those unrelated interaction results are not represented as successful checks.

Two source-text Node assertions became stale during concurrent slot-color and drag changes. They now accept the shared ability-color constant and the added drag destination field. The application behavior was preserved. Current typecheck passes.

Final focused Node coverage is 12/12 passing. The final combined visual run passed 21/22 cases on its first attempt. The Edge bend page returned to the main menu during the shared server's live edits; its isolated retry passed, so all 22 distinct Chromium/Edge cases have successful evidence. The earlier Chromium-only close-up run also passed 11/11. The final combined artifacts are under `output/wang-final-browsers`, with the recovered bend capture under `output/wang-bend-recheck`. Logs are `output/wang-final-browsers.log` and `output/wang-visual-final.log`.

The first full Node run passed 237/237. A later full run on the concurrently changing checkout finished 233/238: failures concern changed starter enemy types, two generator-version-dependent seed-coordinate expectations, enemy population count, and trap population count. These are retained in `output/wang-node-final.log`. The new independent rectangle, source contract, composition, multi-seed coverage, and renderer-cache tests pass. The wider checkout therefore does not have a blanket green regression result. These generation/UI findings remain outside this autotiling change, whose source and observed rendering checks are complete.

The current change's visual acceptance is source artwork plus observed runtime output. It does not claim unrestricted native Tiled terrain-brush coverage or a clean result for unrelated browser interactions.
