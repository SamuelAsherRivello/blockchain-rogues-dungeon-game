# Player equipment animation artwork

The completed `ai-skills-tiled-create-spritesheet-png` skill was used from
`D:/Documents/Projects/VC/AI/ai-skills-tiled/skills/ai-skills-tiled-create-spritesheet-png`.
Its source revision is `5757a91fd4979f039c3d4e92bee72133ea6502ab`.
`source-inventory.json` records the actual skill/helper/reference hashes and all
48 original PNG hashes plus the shared shadow hash.

Two real built-in imagegen edits attempted shield removal for the sword-only appearance for
the four front idle frames. Both generated drafts introduced translucent haze.
They remain in the `sword-only-idle-down-generated-v1.png` and `-v2.png` references.
Their native repair candidate changed zero protected pixels but retained
65–76 partially transparent pixels per frame, so it was rejected. Those outputs
are not runtime art.

On 2026-10-29 the user explicitly authorized targeted manual pixel edits. The
accepted frames were then repaired at native coordinates using the original
palette, source body pixels exposed in raised-weapon poses, and bounded hand
repairs. Masks and exact decoded hashes are in `authored-frames-v6/` and
`manual-pixel-repair-validation.json`. Newly exposed anatomy is reconstructed;
the flattened source cannot establish its unknown original hidden pixels.

The skill's real `spritesheet-tool.py build`, `validate`, `review`, and
`validate --acceptance` commands assembled and reviewed the libraries. There
are two unchanged baseline manifests and six variant manifests, with one
geometry family for 32x48 directional frames and one for 48x48 death frames.
The current accepted variant deliveries end in `-v3`. Earlier unaccepted
iterations are retained as drafts. Automatic approval review rejected their
optional deletion because cleanup was not explicitly authorized. They are not
runtime appearances and do not count as accepted deliveries.

Each current library has its native crops, light/dark contact sheet, GIF/APNG
previews, and hash-bound `visual-review.json`. Agent review used the actual
`animation-review.html?mute=1` gallery in Edge at speed 0.5 as well as all current
contact poses. The original breathing/gait registration and one-shot endings
were preserved. Review found and removed detached hilt and up-attack trail
fragments before recording passing verdicts. The user's separate approval of
the shared skill's demo video is not approval of this Hero Warrior artwork.

`pixel-preservation-validation.json` verifies 48 unchanged originals and 144
additional frames, zero changed protected pixels, native canvas registration,
source-only palette, and binary alpha. This structural evidence complements
the recorded visual inspection; it does not prove unknown hidden anatomy.

`runtime-publication.json` maps the 30 accepted active strips to runtime paths.
Inherited and superseded physical cells in skill deliveries are excluded from
runtime loading. Original frame files and the shadow remain unchanged.

The four-column `hero-equipment-comparison.mp4` is a Hero Warrior-specific
21.12-second video, rendered at 50 fps to represent every 280/200/180/240 ms
effective frame duration exactly. Its extra one-shot ending holds are preview
presentation only. It is independent of the shared skill's demo video.

## Reproduce the checks

Run from the repository root:

```text
python scripts/validate-player-animation-art.py
python rogues-dungeon/test/player-animation-art.test.py
python scripts/publish-player-animation-libraries.py
node --import tsx --test rogues-dungeon/test/hero-warrior-appearance.test.ts rogues-dungeon/test/hero-warrior-visual-frames.test.ts rogues-dungeon/test/hero-warrior-atlas.test.ts rogues-dungeon/test/hero-warrior-catalog.test.ts rogues-dungeon/test/sprite-sheet-animation-system.test.ts
```

Publishing re-runs the shared skill's acceptance checks before copying sheets.
The preparation and authoring scripts deliberately refuse existing output
versions. Preserve accepted directories; use new sibling versions for another
art revision. Build staging uses `output/player-animation-libraries/` outside
the watched app tree to avoid the observed Windows directory-rename failures.
The exact failure cause was not independently diagnosed.
