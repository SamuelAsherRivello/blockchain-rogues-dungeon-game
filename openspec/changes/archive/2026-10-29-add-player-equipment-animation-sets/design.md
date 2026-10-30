# Design

## Context

See `proposal.md` for the motivation and agreed selection table. The current Hero Warrior adapter registers idle, run, and attack for down/side/up and one death clip, totaling 48 individual PNGs. Directional frames are 32x48; death frames are 48x48. Base frame durations are 140/100/90/120 ms, respectively, and the entity speed is 0.5. The renderer selects run only for Gridless travel, death for the existing fatal sequence, and idle otherwise. Attack is cataloged but not selected by gameplay. West mirrors side art.

The renderer packs hero images into a nearest-sampled GPU atlas and owns a single generic animation entity. The player uses bottom-center main-sprite pivot, offset `[-1, 6]`, and shadow offset `[0, -5]`. Current artwork has no layered source. The original PNGs and one shadow matched the supplied source pack during exploration. Current equipment has Weapons, Armor, and Jewels groups; Jewels are irrelevant to this appearance rule. Shared files contain other ongoing work and must be edited without reverting it.

The completed sprite-sheet workflow lives at `D:/Documents/Projects/VC/AI/ai-skills-tiled/skills/ai-skills-tiled-create-spritesheet-png/SKILL.md`. Its source repository was verified by the referenced chat as completed, archived, and pushed. Apply must read the actual current skill and references, record its source commit, and invoke its packaged helper. Its accepted output includes manifests, source preservation, contact sheets, timed previews, and hash-bound structural/visual reports. Reading the skill alone is not evidence of generating or accepting artwork.

## Goals / Non-Goals

Goals are exact correspondence between appearances, bounded reconstruction of newly exposed pixels, reproducible art acceptance, and equipment changes that preserve animation state. Keep asset authoring, content mapping, generic playback, and Babylon resource ownership separate.

Non-goals are changing worn armor design, drawing each inventory item's specific shape, adding attack gameplay triggers, fixing unrelated movement behavior, changing equipment compatibility or save schemas, changing Tiled maps, or modifying the shared skills. A live Tiled editor is unnecessary for generating and integrating these runtime frames.

## Decisions

### Use the completed skill in animated modify mode

Use `ai-skills-tiled-create-spritesheet-png` with the built-in imagegen editing path. Build baseline manifests from inspected existing pixels at scale 1 and provenance `artSource: existing`. The helper requires one cell size per library, so establish separate 32x48 directional and 48x48 death libraries. Each appearance then has two manifests; sheet/frame ids remain stable within each geometry family. This preserves existing canvases without padding every directional frame into a wider cell.

On 2026-10-29, two actual imagegen trials introduced translucent haze in the exposed-hand region. The user then explicitly authorized targeted manual pixel edits while preserving protected original pixels and retaining the new skill's assembly/validation workflow. This authorization permits bounded palette-matched equipment removal, hand repairs, and copying original body pixels revealed in other supplied frames. Retain the generated trials as references, identify manual repairs honestly in provenance, and continue using the packaged skill for manifests, assembly, and review. The exact-registration and visual-acceptance requirements are unchanged.

Use `sword-and-shield`, `sword-only`, `shield-only`, and `unarmed` as stable appearance ids corresponding to sets 1 through 4. Keep existing set-1 source paths unchanged. Deliver review/build requests and reports under `rogues-dungeon/documentation/player-equipment-animation-sets/`; deliver runtime sheets and active frame mappings under the hero asset directory. Use lowercase kebab-case filenames. Do not add Python/Pillow as a runtime dependency.

For every imagegen attempt, attach and inspect the original affected frames before editing. The user-authorized manual method may handle other clips without regenerating their visible body art. Explicitly identify the original as the edit target and canonical identity reference. Define reviewed per-frame editable equipment/reconstruction regions and copy protected original pixels deterministically. Include the whole sword, its white swing trails, shield edges, and detached equipment in death. Share accepted reconstructed anatomy between corresponding variants wherever both expose it. Do not redraw the whole character, auto-fit alpha bounds, change the pose, or stretch a frame. Manual drawing is restricted to the explicitly authorized equipment/repair masks and the original palette.

Inspect a representative extracted frame before processing its family. Build each delivery with `spritesheet-tool.py build --request ... --output-dir <new-directory>`, then run `validate`, `review`, and `validate --acceptance`. Output folders are new versions, not overwritten accepted parents. Every logical set contains all 48 mapped frames even when a particular equipment item is fully occluded and its original pixels remain valid.

### Make alignment measurable

Record original PNG hashes before authoring. Set 1 and the shared shadow remain byte-for-byte unchanged. For each corresponding frame, retain original canvas dimensions, scale 1, zero registration translation, frame order, and source motion trajectory. The directional and death metadata use bottom-center anchors `[16, 48]` and `[24, 48]` respectively; retain existing renderer offsets instead of introducing new set-specific corrections.

Reject any decoded RGBA change outside reviewed editable regions. Inspect unchanged body landmarks, overlay differences, restored hands/body, weapon handedness, palette, and dropped equipment. The editable regions do not excuse moving unchanged anatomy inside them. Inspect contact sheets at native and enlarged sizes on light and dark backgrounds, and play all ten clips in all four sets at effective timing. Use exact-timing APNG as authoritative when GIF timing rounds. Only record passing visual verdicts after inspecting those exact sheet hashes. Use stationary-region checks only where the original sequence actually has invariant pixels; do not freeze idle breathing or run movement to satisfy a check.

The source does not reveal hidden anatomy. Reconstructed pixels cannot be claimed to be the unknown original underlying body. Acceptance instead requires consistent reconstruction, preserved visible source anatomy, correct equipment removal, and zero displacement of corresponding protected landmarks.

### Derive appearance from committed group occupancy

Add a pure selector beside the hero adapter that checks `equipment.weapons.some(Boolean)` and `equipment.armor.some(Boolean)`. It ignores item names, categories, modifiers, Jewels, Inventory, Quick Slots, and abilities. Multiple occupied slots or one item spanning both positions do not change the result. A shield in Weapons still enables sword art. Keep compatibility and item data untouched.

Resolve from the committed campaign shown by the world renderer, not the UI's projected drag equipment. This naturally handles successful equip, unequip, swap, load, and replacement-run reset. Invalid/canceled transactions leave the appearance unchanged. Derive the variant on load rather than serializing a new field. Use the fatal campaign's equipment throughout the existing death sequence; a replacement run starts with set 4 once it becomes the rendered campaign.

### Keep one animation clock and a separate image lookup

Retain the generic entity's animation name, frame index, elapsed fractional time, loop count, completion, and playing state. Resolve the visual image through `(appearance, animation, frameIndex)` independently. Do not select/restart an animation merely because equipment changed, and do not maintain four independently advancing clocks. The adapter validates every set/clip/frame mapping and reports missing images rather than falling back to frame zero.

Preload all four appearances into the existing hero atlas resource lifecycle, with one shared shadow. Sprite-frame descriptors can use the generic system's existing sheet source support; decode/crop declared sheet frames for atlas packing without altering pixels. Use qualified frame keys rather than only sheet paths, because several frames share one PNG. This avoids multiplying public per-frame requests while still providing 192 addressable frames. Keep atlas construction out of equipment transactions and animation updates.

Preserve pivots, main/shadow offsets, west mirroring, nearest sampling, movement hops, damage scale, depth, lighting, stair clipping, and current minimap markers. Appearance changes patch the current sprite image only. Keep current gameplay trigger rules; tests may select attack explicitly to verify deferred clips.

### Verify the authored library and the live integration separately

Asset checks cover all 192 mappings, source hashes, exact geometry, protected pixels, review hashes, and actual skill/helper provenance. Pure runtime checks cover the selection truth table, both positions, two-slot items, unrelated Jewels, saved campaigns, and phase-preserving frame lookup. The existing default npm test list does not include `hero-warrior-catalog.test.ts`; run the hero and generic animation tests explicitly and register new relevant tests appropriately.

After the integration group, run one focused browser scenario through the project-mandated Edge Playwright CLI, desktop Edge, and IAB contexts. Verify all four appearances, transaction cancellation, reload, direction/mirroring, Gridless travel, grid hops, death, and stairs. Use the existing owned server, always include `?mute=1`, wait for renderer readiness, and verify no WebGPU-unavailable message or console errors. Run `npm test`, `npm run typecheck`, and production build. Reserve full applicable browser-suite coverage for finalization, with the owned server stopped before the configured suite starts its own server.

## Risks / Trade-offs

- Imagegen may alter protected art or miss small equipment fragments. Reject the affected output, retain accepted families, and repair only that family through the skill. No geometry-only approval or reduced frame inventory is allowed.
- Forty clips require substantial visual review. Track acceptance by exact hashes and clip ids so partial success cannot be reported as a completed set.
- Additional frames increase startup atlas size. Pack small native sprites once, share the shadow, and verify that repeated equipment changes allocate no new atlas or engine resources.
- Hash-bound review JSON can change under Git line-ending conversion. Use a narrow byte-preservation policy for these metadata files and verify staged bytes if a later commit is requested.
- Other chats are editing shared rendering, equipment, tests, and documentation. Re-read before editing and preserve their changes; this change owns only the appearance behavior and its assets/tests/docs.

## Migration Plan

Add accepted art and mappings first, then integrate the selector and visual lookup. Existing saves derive the correct appearance from current equipment and need no compatibility reset. Rollback removes the appearance lookup and new variant assets while retaining all original set-1 PNGs. A commit, push, release, or deployment requires its own requested workflow.
