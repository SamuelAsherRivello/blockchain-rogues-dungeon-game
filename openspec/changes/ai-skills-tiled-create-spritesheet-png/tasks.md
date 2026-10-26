# Tasks

## 1. Establish the maintained source and acceptance fixtures

- [ ] 1.1 Select an authorized workspace for `D:/Documents/Projects/VC/AI/ai-skills-tiled`, resolve its OpenSpec context, and carry this proposal into that planning scope through the applicable OpenSpec workflow before implementation; verify the target path, applicable instructions, branch, and existing unrelated changes are recorded without modifying this game's source.
- [ ] 1.2 Reconcile the installed `tiled-ai-create-animated-object-png` and `tiled-ai-create-animated-object` definitions into authoritative `skills/` sources with portable references and UI metadata; verify their documented defaults and integration responsibilities match the inspected installed baseline and no global installation is overwritten.
- [ ] 1.3 Add a concise source-inspiration/evidence reference and an acceptance matrix covering both entity kinds, both modes, all three operations, and unavailable imagegen/editor cases; verify it links the inspected Forge, Scenario, and Vibedgames tests/records and distinguishes tests, author reports, and unverified visual claims.

## 2. Implement the shared imagegen authoring instructions

- [ ] 2.1 Create `skills/ai-skills-tiled-create-spritesheet-png/SKILL.md`, essential packaged references, and matching Codex UI metadata; verify skill validation passes and neither entrypoint nor metadata requires Tiled, a game project, a third-party generator, or an external API key for the built-in imagegen route.
- [ ] 2.2 Define and document conversational/keyword input handling for modes, operations, pose versus frame counts, per-action timing, directions, exact cell sizes, layouts, sources, and destinations; verify instruction walkthroughs resolve all twelve entity/mode/operation combinations and preserve explicit dimensions/counts without imposing a rigid parser.
- [ ] 2.3 Specify the imagegen create/edit/reference flow, identity baseline, style preservation, requested-change isolation, and coherent-family generation; verify walkthroughs attach actual references, inspect local edit targets, and never substitute scripted visual art or silently switch image providers.
- [ ] 2.4 Specify selective modify and source-preserving extend behavior, including legacy sheets without manifests and explicit whole-family redesign; verify walkthroughs retain unaffected decoded pixels, stable ids, timing, and source files, and resolve conflicting size requests before generation.
- [ ] 2.5 Document acceptance and failure handling with static contact sheets, animated playback, one-shot endings, targeted repairs, stable delivery paths, and honest capability gaps; verify a closed-editor art-only walkthrough contains zero Tiled setup/calls and an unavailable imagegen walkthrough makes no false success claim.

## 3. Implement and test exact image assembly and manifests

- [ ] 3.1 Define and document `spritesheet-manifest.json` version 1 and valid static, multi-action, multi-sheet, and inherited-library fixtures; verify stable ids, rectangles, dimensions, anchors, positive animation durations, and loop policy validate while static fixtures contain no invented animation fields.
- [ ] 3.2 Add focused deterministic regression fixtures before implementing necessary image helpers; verify failing cases cover wrong counts/dimensions, out-of-bounds frames, unused cells, missing alpha, source preservation, ambiguous layouts, and airborne poses independently of real model generation.
- [ ] 3.3 Implement only the needed extraction, padding, shared registration/scale, and regular-grid assembly helpers; verify the regression suite passes for exact horizontal and combined grids, unclipped frame ownership, and retained jump/bob displacement without independent per-frame fitting.
- [ ] 3.4 Implement source-aware modify/extend assembly and validation; verify source file hashes remain unchanged, unaffected decoded frame hashes match, inherited ids/order/timing are stable, and an added sheet preserves the old library without destructive repacking.
- [ ] 3.5 Implement contact-sheet and timing-accurate animation preview output with separate structural and visual review records; verify pixel/smooth and alpha/opaque fixtures, intentional holds, looping and one-shot sequences, and a structurally valid identity-drift example that still requires visual rejection. Document each helper's actual invocation and limitations beside it.

## 4. Wire existing Tiled consumers to the shared PNG stage

- [ ] 4.1 Convert `tiled-ai-create-animated-object-png` to a compatibility wrapper and update `tiled-ai-create-animated-object` delegation; verify walkthroughs preserve the default two-frame idle, explicit six-frame request, established object grid, one horizontal PNG, and a separate editor stage.
- [ ] 4.2 Update `tiled-ai-create-object` and `tiled-ai-create-character` to reuse supplied art or obtain requested create/modify/extend output before setup; verify handoff examples retain every mapped action/direction, true frame size, and logical anchor while preserving editor-preview/runtime separation.
- [ ] 4.3 Update pickup and requested spawner/marker-art routing without moving lifecycle, population, or map responsibility into the PNG author; verify examples route only missing/requested art and reuse compatible existing assets.
- [ ] 4.4 Add entity routing to `tiled-ai-create-tileset-png` and clarify generated-image/animation handling in `tiled-ai-create-tileset-tsx`; verify terrain Scene Sheet/Wang behavior and the grid-suitability gate remain intact and animation cells are never silently converted into unrelated terrain.
- [ ] 4.5 Add and run focused handoff instruction/contract checks and document one static-object and one multi-action-character handoff; verify supplied-art reuse, explicit loop-policy translation, and successful PNG delivery followed by an honestly pending import when editor access is absent.

## 5. Generate portable client packages and documentation

- [ ] 5.1 Extend `scripts/sync-client-skills.py` for the new invocation prefix while preserving old-prefix and setup-adapter behavior; add focused translation regression checks and verify both `$tiled-ai-` and `$ai-skills-tiled-` become the correct slash commands for Claude without changing Codex syntax.
- [ ] 5.2 Update the README, skill index, prerequisite guidance, examples, install information, and maintenance count checks for the actual source inventory; verify they clearly distinguish imagegen-only PNG authoring from live-editor integration and do not claim missing client image tools exist.
- [ ] 5.3 Run `python scripts/sync-client-skills.py`, then its `--check`, all documented source/Codex/Claude skill validators with the resulting count, and `python scripts/validate_repository.py`; verify portable supporting files, matching metadata, generated-package parity, and repository links/examples, reporting unrelated pre-existing failures separately.

## 6. Verify integrated authoring acceptance

- [ ] 6.1 With Tiled closed/disconnected, run real imagegen static-object create, selective modify, and extend cases using a small shared fixture library; verify exact pose counts/cells, consistent identity, alpha, stable retained-pose pixels/ids, source hashes, manifest mappings, and contact-sheet review with no Tiled calls.
- [ ] 6.2 With Tiled closed/disconnected, run real imagegen animated-character create, selective modify, and extend cases with multiple action lengths and at least one added action on a separate sheet; verify timing/order, handedness, scale/anchor, retained source frames, loop/one-shot behavior, and actual playback previews. Add small static-character and animated-object examples to cover both entity kinds in both modes, and label these live samples separately from the full twelve-case contract matrix.
- [ ] 6.3 Review the resulting art-to-Tiled handoff instructions without an editor dependency; when a live bridge is available, perform one focused disposable-fixture editor smoke test and record it separately. Verify missing editor access never blocks PNG-only acceptance and never produces an editor-success claim; report any unexecuted editor smoke explicitly.
- [ ] 6.4 Run the complete focused regression suite, package/repository checks, and proposal-to-spec-to-task acceptance review; verify every requirement has evidence or an explicit limitation, no game code or accepted user source art changed, and no global installation, publication, or release occurred. Record the final art artifacts and separate structural, visual, generation, and optional editor evidence.
