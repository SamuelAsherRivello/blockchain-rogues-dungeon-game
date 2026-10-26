# Design

## Context

See `proposal.md` for motivation and scope. This is a reusable skill change, not a change to Rogue's Dungeon playback. The planning artifacts live in this chat's resolved OpenSpec root. The implementation target is the inspected `D:/Documents/Projects/VC/AI/ai-skills-tiled` checkout; `skills/` is authoritative and `.agents/skills/` and `.claude/skills/` are generated packages. Apply must obtain an authorized workspace for that target and re-resolve its planning context before implementation; the current repo-local action context does not grant writes to another repository.

Observed integration facts:

- `tiled-ai-create-object` handles static or animated supplied art and separates the editor preview from runtime textures.
- `tiled-ai-create-character` inventories supplied animations and integrates a complete actor. It currently starts from supplied artwork.
- The installed `tiled-ai-create-animated-object-png` and `tiled-ai-create-animated-object` skills are absent from the source checkout. Their installed definitions supply the compatibility baseline, not permission to overwrite global installations.
- `tiled-ai-create-tileset-png` owns terrain Scene Sheet 24x10 art and Wang companion generation. It must retain those formats.
- `tiled-ai-create-tileset-tsx` rejects unsuitable grids and explicitly does not author animation.
- The existing package adapter only translates `$tiled-ai-` invocation prefixes for Claude. The requested `$ai-skills-tiled-` name needs an additional explicit translation.

Design is required because the change crosses several skills, introduces a shared art manifest, and must preserve installed command behavior.

## Goals / Non-Goals

**Goals:**

- One PNG-authoring contract for either entity kind, either mode, and all three operations.
- Imagegen visual creation and editing with deterministic assembly and verifiable geometry.
- Reusable entity identity and stable downstream mappings across later library extensions.
- An editor-independent first step with an explicit, separate Tiled integration step.

**Non-Goals:**

- Tiled bridge setup or calls during PNG authoring; Tiled data, placement, colliders, spawners, and gameplay authoring in the new skill.
- Requiring Scenario, PixelLab, a video model, Aseprite, or an external account. Research sources inform the design but are not dependencies.
- Replacing terrain formats, imposing a universal pixel-art style or cell size, adding game runtime APIs, or silently modifying existing source art.
- Installing globally, publishing packages, committing, or releasing as part of this proposal.

## Decisions

### 1. Keep imagegen and Tiled as separate stages

The new entrypoint is `skills/ai-skills-tiled-create-spritesheet-png/SKILL.md`, with Codex metadata that declares no Tiled MCP dependency. Read the installed `imagegen` skill when producing or editing artwork and use its built-in tool path. Inspect local source images before submitting them as references or edit targets. Distinguish the identity reference, style reference, edit target, and optional target-pose reference; a path merely mentioned in prose is not an attached reference.

Request native transparency for cutouts and verify the delivered alpha. Do not impose a chroma-key generation pipeline inherited from external examples. Chroma cleanup is only a recovery option when the actual source requires it and must protect subject colors. Preserve opaque backgrounds when requested. If imagegen is unavailable, report that capability gap and preserve any useful plan; do not launch Tiled, fabricate artwork, or silently switch providers, APIs, keys, or video workflows. The installed imagegen skill governs any explicitly requested fallback.

Alternative considered: make this another Tiled MCP skill. Rejected because editor availability is unrelated to visual generation and the user explicitly requires independent operation.

### 2. Normalize a small request contract

Accept conversational briefs as well as readable keyword examples. Keywords describe inputs, not a new parser or strict command-line grammar:

| Field | Contract |
| --- | --- |
| `mode` | `static` or `animated` |
| `operation` | `create`, `modify`, or `extend`; create is the default for a new entity |
| `entity` | Object or character, with a stable entity name/id |
| `size` | Delivered cell width and height in pixels, not whole-sheet size or world footprint |
| `poses` | Ordered static pose/view names or a count; defaults to one static pose |
| `animations` | Named action/direction sequences with frame counts, durations, and loop/one-shot behavior |
| `source` | Existing stills, individual frames, sheets, and optional art manifest |
| `changes` | The requested visual delta or new pose/action inventory |
| `layout` | One sheet, multiple sheets, or automatic; explicit requests take precedence |
| `destination` | User-specified output location, otherwise a stable project art location |

In animated mode, a bare `poses=N` means N ordered frames for one action. For multiple actions, record frame counts separately. Never multiply a static pose count into animation frames or mistake directions for temporal progression. Infer unprovided style, size, and timing from source/project art where available; otherwise choose and disclose reasonable values before generation. Ask only when a contradiction prevents a usable result. A free-form request must not require every field.

Illustrations:

```text
$ai-skills-tiled-create-spritesheet-png static object poses=4 size=32x32
wooden chest: closed, unlocked, open, broken

$ai-skills-tiled-create-spritesheet-png animated character size=48x64
animations=idle:4,run:8,attack:6 use this knight reference

$ai-skills-tiled-create-spritesheet-png extend source=<knight-sheet.png>
animated animations=climb:8 preserve the current style and equipment
```

Alternative considered: fixed 14-frame sequences, fixed pet rows, or the prop wrapper's two-frame default for everything. Rejected because entity sheets include single static poses and actions with different lengths.

### 3. Use an identity baseline and a deliberate delta

Record an identity brief from inspected artwork: silhouette/proportions, palette, rendering style, pixel density when applicable, perspective, lighting, handed equipment, anchor, and action envelope. With no source, establish a usable canonical still before expanding a complex family; a single static-pose request can be that baseline itself. Every generated family uses this baseline rather than chaining newly generated frames as the sole identity source.

- `create` establishes a new identity and the requested pose/action inventory.
- `modify` identifies affected poses/actions and requested changes. Edit those through imagegen, then preserve unrelated source frame pixels by deterministic copying. An explicitly requested family-wide redesign establishes a revised baseline and applies the intended change consistently.
- `extend` adds new poses, directions, or actions from the accepted baseline. Existing files stay untouched, old stable ids remain valid, and retained frames are copied without visual regeneration or independent resizing. New sheets are allowed so an existing sheet need not be repacked.

For a legacy sheet without metadata, inspect and establish its actual grid, ordering, and sequence interpretation first. Do not invent timing or identity for ambiguous cells. Inherit cell size, style, and anchor on extension unless the user explicitly requests a migration. A conflicting requested size is resolved explicitly rather than silently rescaling the old library.

Alternative considered: rerender the full sheet for every edit. Rejected because an image model can change unrelated frames even when prompted to preserve them.

### 4. Generate coherent families, then assemble exact geometry

Generate a small coherent pose family or one animation action at a time using imagegen. Split oversized requests into smaller families sharing references. An action brief names its ordered spatial progression, including anticipation, impact, and recovery when appropriate. Static poses have independent meaning and no playback requirement.

Do not trust a generated picture of a grid as exact geometry. Inspect the actual returned image, identify complete pose/frame ownership, and reject overlapping or clipped bodies before extracting. Deterministic helpers may extract, pad, register, apply a shared verified scale, assemble a regular grid, validate outputs, and produce review media. They must not invent poses, synthesize in-betweens, or substitute procedural artwork.

Use one common scale per identity and a stable logical registration point. A cell is a canvas, not the current alpha bounding box. Preserve jump height, bob, recoil, and deliberate squash/stretch. Independently fitting each frame to its bounding box would erase motion and create size popping. For pixel art, use nearest sampling on a verified grid; preserve the requested rendering style for smooth art. Enlarge cells only with an explicit reconciled output contract, never silently change a caller's exact dimensions.

Support one regular-grid sheet with several named sequences or separate sheets with shared identity geometry. Default to per-action horizontal strips for animated output and one horizontal strip for static poses; honor a requested combined grid. Use zero outer margin and spacing unless the caller requests otherwise. Transparent unused cells are permitted and explicitly excluded from pose/frame counts.

### 5. Deliver a small art manifest

Deliver PNG sheet(s) and `spritesheet-manifest.json` with `schemaVersion: 1`. Keep this separate from Tiled TSX/TSJ/TMX data and engine playback configuration.

The manifest records:

- entity id, mode, requested operation, canonical/source references and their hashes;
- rendering style, cell width/height, shared anchor, and verified output paths;
- per-sheet dimensions, rows, columns, margin, spacing, and unused slots;
- stable pose/frame ids mapped to sheet-relative pixel rectangles and direction labels;
- named sequences as ordered frame-id lists with positive durations in milliseconds and explicit loop/one-shot behavior;
- inherited and changed/new ids for modify/extend, plus parent-manifest identity when available;
- geometry/alpha checks and links to review artifacts, without falsely treating numeric checks as visual approval.

Static manifests have no manufactured timing or loop data. Animated manifests permit variable frame durations and repeated holds when intentional and documented. Sequence loop behavior is an art description; downstream consumers translate it to their runtime's established loop-count semantics. Do not copy Tiled global tile ids or collision data into this manifest.

Alternative considered: deliver only a PNG. Rejected because multi-action, multi-sheet, and extension workflows need unambiguous mappings independent of texture packing.

### 6. Update consumers without moving editor responsibilities

| Skill | Planned change |
| --- | --- |
| `tiled-ai-create-object` | Reuse compatible supplied art; delegate missing/requested static or animated object artwork to the new skill before editor setup. Preserve one logical palette item and editor/runtime preview separation. |
| `tiled-ai-create-character` | Retain supplied-art inventory and full actor integration. Add a generation/modification/extension preflight when art is missing or the user requests it; consume all mapped actions. |
| `tiled-ai-create-animated-object-png` | Bring the installed definition into maintained sources as a thin compatibility wrapper. Delegate to animated object mode while preserving its two-frame idle, exact user frame count, and single horizontal PNG contract. |
| `tiled-ai-create-animated-object` | Bring the installed workflow into maintained sources; use validated supplied art or the wrapper/shared generator before live editor work. |
| `tiled-ai-create-pickup-object` | Delegate requested or missing pickup artwork through static/animated object mode; retain pickup lifecycle and no-spawner responsibilities. |
| `tiled-ai-create-tileset-png` | Keep terrain generation; route entity pose/animation sheets to the new skill. |
| `tiled-ai-create-tileset-tsx` | Accept suitable generated images, preserve actual grid inspection, and route animated entities to their consumers. Do not reinterpret frames as terrain or add animation authoring. |
| `tiled-ai-create-spawner-object` | If new actor/marker artwork is requested, route to the shared author/character workflow; keep spawner placement/configuration separate. |

No editor calls occur in the shared author or PNG wrapper. A combined create-art-and-import request completes the PNG stage first, then runs the existing setup boundary. If the editor is unavailable, retain and report the completed art separately from the pending import; never claim that file verification proves editor verification.

### 7. Author once and package correctly

Keep essential instructions in the new `SKILL.md`; package only the request/output contract and verification references and deterministic helpers actually needed. Add independently installable references/scripts and UI metadata. Apply the repository naming convention to new helper files.

Update `scripts/sync-client-skills.py` to translate both `$tiled-ai-` and `$ai-skills-tiled-` invocation prefixes in Markdown for Claude, preserving existing translation and the setup adapter. Do not embed a workstation-specific imagegen path in portable skill instructions or misrepresent a missing client image-generation capability. Regenerate packages from source; never hand-edit generated package files. Update source-derived counts, skill index, dependency guidance, install/handoff examples, and maintenance commands for the actual resulting inventory, including the two previously untracked installed workflows.

### 8. Adopt tested mechanisms, not provider restrictions

The earlier exploration inspected the following primary sources. They are design evidence, not installed dependencies, and their code has not been rerun in this proposal.

| Source | Mechanism to adapt | Evidence and limits |
| --- | --- | --- |
| [Forge generate2dsprite](https://github.com/0x0funky/agent-sprite-forge/blob/main/skills/generate2dsprite/SKILL.md) and [video2dsprite](https://github.com/0x0funky/agent-sprite-forge/blob/main/skills/video2dsprite/SKILL.md) | Canonical identity, shared scale/registration, selective edits, action-set review, source provenance | [Validation record dated 2026-10-06](https://github.com/0x0funky/agent-sprite-forge/blob/main/docs/validation-2026-10-06.md) reports 3,063 Python and 83 JS tests plus live trials. Counts are author-reported across that repository. [Sprite-set test source](https://github.com/0x0funky/agent-sprite-forge/blob/main/tests/test_sprite_set.py) uses fake media to test orchestration, not visual-model quality. Do not adopt its API routing, video requirement, or fixed class sizes. |
| [Scenario sprite animation](https://github.com/scenario-labs/skills/blob/main/skills/scenario-sprite-animation/SKILL.md) | Frame-order verification, directional geometry, baseline/key-color checks, explicit loop review | [Directional-cycle regression tests](https://github.com/scenario-labs/skills/blob/main/tests/scenario-sprite-animation/test_directional_cycles.py) and [successful CI](https://github.com/scenario-labs/skills/actions/runs/40241358877) were inspected. These support deterministic processing, not a guarantee of generated identity. |
| [Vibedgames animated spritesheets](https://github.com/kyh/vibedgames/blob/main/plugins/vibedgames/skills/animated-spritesheets/SKILL.md) | One reference per family, ordered motion beats, sheet QC, shared processing and playback review | [Asset regression tests](https://github.com/kyh/vibedgames/blob/main/packages/asset-tools/test/asset.test.ts) and [successful CI](https://github.com/kyh/vibedgames/actions/runs/40247834143) were inspected. Keep dimensions and style configurable; do not inherit its provider-specific pose-board command. |
| [Scenario consistency](https://github.com/scenario-labs/skills/blob/main/skills/scenario-consistency/SKILL.md) and [identity library](https://github.com/scenario-labs/skills/blob/main/skills/scenario-identity-library/SKILL.md) | Baseline-plus-delta requests, separate identity/style references, curated library extension | Readable supporting design patterns. Their [application-test protocol](https://github.com/scenario-labs/skills/blob/main/docs/application-test.md) is not proof of an individual generation run. No claim that these two skills' visual outcomes were independently tested. |

Write original guidance and focused helpers. If implementation copies or adapts source code, first inspect that file's license and retain required attribution. Avoid importing any external skill's process, permission, or publication rules into this workflow.

## Risks / Trade-offs

- Imagegen can drift in identity or miscount poses. Mitigate with canonical references, small families, actual frame inventory, contact-sheet review, and targeted regeneration. Preserve a passing family while repairing another.
- Uniform baseline correction can erase jumps. Mitigate with shared logical anchors and tests where the airborne frame must remain airborne.
- Pixel counts and hashes cannot judge anatomy or motion. Mitigate with separate recorded visual and playback verdicts; a passing geometry report alone is insufficient.
- A whole-sheet edit can modify unrelated frames. Mitigate by extracting targets for imagegen editing and copying unaffected decoded pixels into the new version.
- External source code is tied to provider assumptions. Adapt only mechanisms needed for imagegen and keep evidence claims qualified.
- The source checkout differs from installed global skills. Bring only the two named compatibility workflows into source, recheck current contents before edits, and preserve unrelated changes. Global reinstall remains a separately authorized operation.
- The planning and implementation repositories differ. Keep this proposal portable; before Apply, select the target checkout and resolve an authorized planning/workspace scope rather than treating the current action context as cross-repository write permission.

## Migration Plan

1. Reconcile the named compatibility workflows into the source repository and implement/test the shared art contract there.
2. Add consumers' art-stage delegation, package-prefix adaptation, and source documentation.
3. Regenerate and validate both client packages. Keep old command names working; do not globally reinstall or publish as part of implementation unless separately requested.
4. Validate static and animated creation plus modification and extension, with Tiled closed/disconnected. Retain a small reviewable fixture set and record actual imagegen use.
5. Exercise downstream editor handoff only when a live Tiled connection is available. Report editor evidence separately; unavailable editor integration cannot invalidate completed PNG-only acceptance or be mislabeled as passed.
6. Roll back by reverting only this change's source/package/docs additions in the target repository. Existing user artwork and source libraries remain intact throughout.
