# Save and frame performance investigation

The repeated floor generation was unnecessary. Each saved action compacted the active campaign and recovery baseline, generating each reference floor twice. Refreshing slot summaries then reconstructed the active and recovery floors for every occupied slot. This caused six generated floors per action with one occupied slot, or ten with three. Perf skipped the entire save callback and concealed the cost.

The final source measured 106.1 FPS during normal graph-floor movement and saving, with 117.4 FPS idle. Perf movement reached 112.0 FPS at 100×100 and 117.2 FPS at 200×200. These are local Edge development-server results. The older-floor stress case at ten actions per second still measured 91.8 FPS initially and 101.6 FPS after returning from Perf. The evidence does not support a universal 120 FPS guarantee.

## Implemented cleanup

- Save compaction uses a private eight-profile baseline cache with a complete generation/profile key, including topology and all versions, attributes, flags, level, seed, and difficulty. Saved startup warms active and recovery baselines. Public generation remains mutable and independent; cache-owned references cannot escape through compact records.
- Current summaries read validated metadata without rebuilding playable floors. A weak per-storage cache reuses unchanged records, including invalid bytes. Legacy migration, unsupported versions, and fog discovery backups remain covered.
- Complete-identity URL runs skip slot-summary initialization and Save & Quit writes. Resuming or overriding a campaign avoids generating a discarded fresh campaign.
- The FPS subscription is isolated. Only the active desktop or portrait layout mounts; portrait Control does not build hidden Info cards. Closed keyboard trays stop processing feedback and discard rows after their close transition.
- HUD components and attribute rows reuse unchanged values. Attribute display avoids constructing unused adjustment controls. Same-floor rendering avoids a second React state commit per action.
- Renderer and character writers share actual sprite-patch state. Identical arrays/scalars leave GPU buffers untouched. Pickup updates submit final oscillated positions and shadow dimensions once.
- Approach routing uses an integer BFS queue instead of repeated predecessor-chain scans. It preserves route tie breaks and the existing obstacle/five-extra-moves policy, stops at a proven minimum distance, and returns owned positions instead of freezing the caller's player. Approach timing is now included in metrics.
- Perf resizing retains the active floor's topology. A legacy active floor stays legacy when future-floor defaults use graph generation.
- Static rows with no permitted sprites skip GPU submission. Cached visibility refreshes on camera/discovery/RT changes. Rows are enabled before refreshing sprite patches, allowing fully hidden rows to return. Floor-layer replacement rebuilds this cache.

The coordinator separately integrated immutable owned generation-metadata sharing in `campaign-copy-system.ts`. Caller data is detached before sharing; malformed/nonplain extensions retain clone behavior. Its final source-pinned 200×200 recovery-copy benchmark fell from 6.7123 to 1.1338 ms. See `output/multi-pass-world-generation/generation-copy-benchmark.md`.

## Save evidence

The original Node fixture used world seed 859270849, floor seed 4241874031, legacy 100×100 terrain, twelve waits, and isolated Map-backed storage. Times are inclusive and must not be added together.

| Occupied slots | Original whole action | Original save | Original summary refresh | Generated floors/action |
| --- | ---: | ---: | ---: | ---: |
| 0, callback skipped | 1.65 ms | 0 | 0 | 0 |
| 1 | 155.18 ms | 92.67 ms | 61.84 ms | 6 |
| 3 | 778.98 ms | 271.00 ms | 505.46 ms | 10 |

After warmup, final Node runs generated zero baseline floors per action with either one or three slots. Legacy whole-action means were 2.53 and 2.83 ms; graph means were 2.84 and 4.69 ms. Timing varies with load, so sequential runs do not establish a fixed cost per extra slot. Exact generation counts establish the removed work. Matched browser callbacks fell from 178.91 ms to approximately 2 ms.

Raw files under `output/perf-entry-investigation/` include `save-cost-benchmark.json`, `save-cost-after-legacy.json`, and `save-cost-after-graph.json`. Reproduce with `node --import tsx output/perf-entry-investigation/profile-loader.mjs --after --legacy`, or omit `--legacy` for graph terrain. Instrumentation modifies imported source in memory only.

## Final browser results

Edge CLI used isolated contexts, synthetic saves, 1600×1000 viewport, DPR 1, zoom 2, RT3, two canvases, and a cleared pointer. Animation, dynamic content, minimap, simulation, and enemy logic remained live. Accepted samples each contain more than 100 frames and verified active metrics. Human saves/preferences were protected.

The graph fixture uses world seed 859270849, floor seed 4241874031, topology `dungeon-graph-1`, and three occupied synthetic slots. Movement repeats A/D/W/S twenty times with a 300 ms pause after each action.

| Final graph capture | FPS | Frame p95 | Save callback mean |
| --- | ---: | ---: | ---: |
| Normal 100×100 idle | 117.4 | 8.4 ms | No actions |
| Normal 100×100 moving and saving | 106.1 | 16.7 ms | 1.90 ms |
| Perf 100×100 idle | 120.0 | 8.4 ms | No actions |
| Perf 100×100 moving | 112.0 | 8.6 ms | 0.01 ms |
| Perf 200×200 idle | 119.2 | 8.5 ms | No actions |
| Perf 200×200 moving | 117.2 | 8.5 ms | 0 ms |

Perf preserved saved bytes, other normal slots stayed unchanged, resizing retained topology, and exit restored seed, dimensions, time, and player position. Raw results are `graph-static-cull-final-browser.log`; collector `graph-final-browser-check.js`.

The matched older-floor fixture explicitly requests `dungeon-chain-1`. Eighteen wait actions use the more aggressive nominal ten actions per second.

| Final legacy capture | FPS | Frame p95 | Save callback mean |
| --- | ---: | ---: | ---: |
| Normal idle | 117.5 | 8.4 ms | No actions |
| Normal waits | 91.8 | 25.0 ms | 2.36 ms |
| Perf entry idle | 113.5 | 16.6 ms | No actions |
| Perf waits | 101.7 | 25.0 ms | 0.01 ms |
| Exit normal idle | 118.5 | 8.5 ms | No actions |
| Exit normal waits | 101.6 | 25.0 ms | 2.08 ms |

Original matched saved waits measured 25.6 FPS with 178.91 ms callbacks, and 27.4 FPS with 180.04 ms callbacks after Perf exit. The final legacy stress sample remains the explicit exception to the above-100 target. Raw results are `legacy-static-cull-final-browser.log`; collector `entry-browser-check.js` pins legacy topology.

Two valid graph captures before empty-row culling measured approximately 79–99 FPS, including confirmed page focus. Empty-page RAF reached 119.9 FPS. Those unfavorable results remain in `graph-post-cleanup-browser-retry.log` and `graph-focused-post-cleanup-browser.log`. Another attempt timed out at startup and supplies no FPS evidence. Earlier high-FPS captures preceded final source and are historical only.

## Actual draw calls and exact pixels

Installed Babylon Lite 1.32.0 hides sprites by zeroing instance size. Its `spriteRendererUpdate` and `spriteRendererRecord` skip only layers with false visibility or zero allocated count. Consequently a fog-hidden allocated row still recorded a draw. This was checked against installed library code, rather than inferred from the game's active-layer count.

A browser-response probe toggled only the new suppression and wrapped the actual main renderer's `_record` result. Both states used the same page, sprites, lighting, and fixed animation frame.

| State | Actual draws before | Actual draws after | Changed canvas pixels |
| --- | ---: | ---: | ---: |
| RT3 start | 72 | 23 | 0 |
| RT3 after exploration | 72 | 32 | 0 |
| RT0 after returning | 72 | 72 | 0 |
| RT1 after returning | 72 | 32 | 0 |
| RT2 after returning | 72 | 72 | 0 |
| RT3 after returning | 72 | 32 | 0 |

All six canvas pairs are identical after decoding to RGB. RT0/2 restore all rows; exploration increases draws as rows become known. A real sprite-buffer test covers fully suppressed row restoration and camera reentry. Evidence is `static-layer-browser.log`, `static-*-before.png`, and `static-*-after.png`; collector `static-layer-browser-check.js`.

## Correctness and source release

- Final `npm run typecheck` passed.
- Focused performance, character/sprite, page, and generation-copy tests passed 83/83, including the final suppressed-row restoration test. Log `static-cull-focused.log`. Coverage includes save round trips, unsupported versions, profile changes, discovery/recovery, three slots, route equivalence, caller mutability, and actual buffer versions.
- Edge UI checks verified inventory, equipment, quick-slot healing, abilities, attributes, layout switching, portrait Control/Info, tray feedback, fullscreen, and sentinel save/backup preservation. Logs `hud-final-browser.log` and `ui-final-browser.log`. The later static-layer change affects no HUD code.
- Final IAB showed the game and minimap, two canvases, renderer ready, no loading/unsupported message, and no console errors. Existing green-shader preference was preserved. Desktop Edge CUA tab creation was restricted by standalone sidebar mode; unrelated user tabs were not used. Edge CLI completed successfully.
- Scoped `git diff --check` reported no whitespace errors. Existing LF/CRLF notices remain.
- Full integrated Node/build/browser gates belong to the coordinator and are pending at this handoff. This report does not claim those gates passed.

All remaining runtime files were RELEASED after final capture, all owner-created browsers were closed, and no CPU tests remained running. No commit, push, deployment, server restart, branch, or worktree was created. Unrelated dirty work was preserved. Generation source/types were released earlier; package configuration and campaign-copy source remain coordinator-owned.

Remaining cleanup scope was `game.tsx`, `a-star.ts`, `performance-session.ts`, `panels/attribute-panel.tsx`, `save-system.ts`, `babylon-render-system.tsx`, `character-sprite-system.ts`, and new `sprite-patch-system.ts` and `static-layer-visibility-system.ts`. Tests changed were `performance-system.test.ts`, `character-sprite-system.test.ts`, and `page.test.ts`. The preexisting approach object-avoidance policy belongs to a separate completed request and was preserved.

`output/perf-entry-investigation/final-source-manifest.json` pins SHA-256 for these nine runtime files, three tests, and integrated generation/types/copy dependencies. Captures used this runtime source. The report and ignored collectors can change without invalidating runtime hashes.
