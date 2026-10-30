# Asset Provenance

The project stores the user-supplied `Dungeons-and-Pixels-v1.4` assets under `rogues-dungeon/public/assets/art/`, organized by use. Characters, enemies, items, and props are direct asset categories; canonical tile atlas PNGs are under `tilesets/art/`; runtime Tiled definitions are under `tilesets/data/`; and non-runtime sample maps are under `maps/examples/`. The source-pack name is retained here as provenance rather than as a required directory name.

Source provided in the conversation: `D:/Documents/Projects/docker-sandboxes/docker-sandbox-codex/babylon-lite-ascii-rpg/ascii-rpg/public/assets/images/Dungeons-and-Pixels-v1.4/`.

The supplied folder contains no license or attribution file that could be located during inspection. The image assets are preserved without modification. Confirm the pack's license and add its required credit before public release.

The Hero Warrior runtime mapping is documented in `documentation/hero-warrior.md`. Its supplied frames are preserved as individual PNGs and are not repackaged or modified.

## Hero Warrior equipment variants

On 2026-10-29, three additional 48-frame appearances were derived from the
supplied Hero Warrior: sword only, shield only, and neither. The original
sword-and-shield PNGs and shared shadow remain byte-for-byte unchanged. The
variants retain the supplied character design and palette and keep their
original-pack provenance.

The completed `ai-skills-tiled-create-spritesheet-png` skill at source revision
`5757a91fd4979f039c3d4e92bee72133ea6502ab` assembled, validated, and reviewed the
libraries. Two built-in imagegen edits were retained as rejected references
because they introduced translucent haze. The user explicitly authorized the
targeted manual pixel repairs used in the final art. Newly exposed hands/body
regions are reconstructed using source pixels and palette; the flattened pack
does not reveal the unknown original hidden anatomy.

Source hashes, masks, real generation/assembly evidence, exact-hash visual
reviews, synchronized playback, and the thirty runtime strip mappings are in
`documentation/player-equipment-animation-sets/`. See its `workflow-evidence.md`
and `runtime-publication.json`. The separately generated menu art and Jewel
atlas edits retain their own provenance below.

## Main menu artwork

The following original menu assets were generated with the built-in image-generation tool on 2026-10-15 and are stored locally for runtime use:

- `public/assets/art/ui/menu/dungeon-hero-background.png` — 16-bit-style dungeon corridor, with the hero composed in the lower-right-center and open space for the menu and logo.
- `public/assets/art/ui/menu/rogues-dungeon-logo.png` — transparent 16-bit-style title treatment with the exact text `ROGUE'S DUNGEON`.

On 2026-10-17, the original menu background was used as the edit target for four transparent parallax layers generated with the built-in image-generation tool:

- `public/assets/art/ui/menu/dungeon-hallway-rear.png` — distant hall and throne.
- `public/assets/art/ui/menu/dungeon-environment-frame.png` — surrounding hallway frame.
- `public/assets/art/ui/menu/dungeon-hero.png` — hero cutout.
- `public/assets/art/ui/menu/dungeon-foreground-rocks.png` — rocks in front of the hero.

They are project-owned generated artwork; they do not derive from the supplied Dungeons-and-Pixels vendor pack.

## Wooden Vest item sprite

On 2026-10-23, `public/assets/art/game-view/items/droppable-item-sprite-sheet.png` was edited with the built-in image-generation tool. The existing atlas was the edit target; the generated Wooden Vest occupies its previously unused final cell. The vest is project-owned generated artwork, while the unchanged surrounding atlas items retain their supplied-pack provenance.

## Jewel item sprites

On 2026-10-26, the built-in image-generation tool created ten original transparent PNGs, one per Jewel, in `public/assets/art/game-view/items/jewels/`. These are project-owned generated artwork. The existing item atlas informed the pixel-art style. The exact common prompt, individual subjects, source output names, and final asset paths are retained in [jewel-art-prompts.json](jewel-art-prompts.json).

The assembly script `scripts/assemble-jewel-art.py` crops transparent margins, fits each image into a 338-pixel square with nearest-neighbor sampling, and centers it in a transparent 362-pixel cell. The runtime atlas now has four columns and six rows, measuring 1448 by 2172 pixels. Frames 0 through 11 retain their prior decoded RGBA pixels exactly. Their combined SHA-256 is `7c593a910e7b535ee0f3457c9c41ac6488476aacefce432f1d7376fc6986d3e2`. Frames 22 and 23 are transparent.

| Frame | Jewel | Source PNG |
| --- | --- | --- |
| 12 | Copper Ring of Vigor | `copper-ring-of-vigor.png` |
| 13 | Silver Ring of Vigor | `silver-ring-of-vigor.png` |
| 14 | Gold Ring of Vigor | `gold-ring-of-vigor.png` |
| 15 | Copper Guard Bracelet | `copper-guard-bracelet.png` |
| 16 | Silver Guard Bracelet | `silver-guard-bracelet.png` |
| 17 | Gold Guard Bracelet | `gold-guard-bracelet.png` |
| 18 | Quartz Amulet | `quartz-amulet.png` |
| 19 | Sapphire Amulet | `sapphire-amulet.png` |
| 20 | Star Sapphire Amulet | `star-sapphire-amulet.png` |
| 21 | Prismatic Amulet | `prismatic-amulet.png` |

The [contact sheet](jewel-item-art.png) shows every labeled frame enlarged and at its native 32-pixel item size. [jewel-art-validation.json](jewel-art-validation.json) records frame numbers, alpha bounds, native visible pixel counts, and the original-section hash. The Node Jewel art test independently decodes the final PNG, checks that hash, verifies ten distinct nonempty frames with transparent borders, and verifies that frames 22 and 23 remain empty.
