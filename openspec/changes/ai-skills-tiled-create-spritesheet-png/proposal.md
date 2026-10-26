# Proposal

## Why

The existing Tiled workflows separate PNG creation from editor and runtime integration, but lack one reusable way to create consistent static poses and animated action sets for objects and characters. A shared imagegen skill will also let users modify or expand existing entity libraries without requiring Tiled to be running.

## What Changes

- Add `ai-skills-tiled-create-spritesheet-png` with independent `static` and `animated` modes and `create`, `modify`, and `extend` operations. Accept natural-language briefs and optional explicit pose counts, per-action frame counts, cell sizes, directions, references, and output locations.
- Use the installed `imagegen` skill and built-in image generation/editing for visual artwork. No Tiled process, Tiled MCP connection, map, game project, third-party generation account, or video generator is required for PNG authoring.
- Preserve entity identity, style, palette, scale, handedness, and registration across poses, actions, sheets, and later extensions. Preserve existing source files and unaffected decoded frame pixels by default.
- Deliver verified PNG sheet(s), a small versioned art manifest with pose/frame mappings, and static contact sheets or animation previews appropriate to the mode. Keep Tiled metadata and runtime behavior in the second step.
- Route object and character art creation through the new skill. Retain the installed `tiled-ai-create-animated-object-png` command as a compatibility wrapper with its existing two-frame idle and horizontal-strip defaults. Reuse compatible supplied art without generating replacements.
- Keep terrain Scene Sheet/Wang authoring in `tiled-ai-create-tileset-png`; add explicit routing between terrain and entity sheets. Preserve the TSX importer's source-suitability gate and explicit animation follow-up.
- Implement in the maintained `ai-skills-tiled` source repository, regenerate its Codex/Claude packages, and update package adaptation, documentation, and focused verification.

## Capabilities

### New Capabilities

- `entity-spritesheet-authoring`: Imagegen-based creation, selective modification, and extension of static and animated entity PNG libraries, including identity, geometry, manifests, and evidence of visual quality.
- `tiled-entity-art-handoff`: Shared PNG-stage routing and backward-compatible handoff to existing Tiled object, character, terrain-routing, and image-import workflows.

### Modified Capabilities

None. The existing game sprite playback and actor specifications remain unchanged; this change concerns reusable authoring skills.

## Impact

- Planning home: this repository's scaffolded OpenSpec change. Implementation target: `D:/Documents/Projects/VC/AI/ai-skills-tiled`, whose authoritative sources are `skills/`. Its client package directories are generated outputs.
- The two installed animated-object skills exist under `C:/Users/srive/.agents/skills/` but are absent from the inspected source checkout. Bring those bounded workflows into the source repository as part of this change, preserving their behavior and provenance.
- Add deterministic image-processing/validation helpers only where needed, with focused regression tests. Use the strongest inspected test-backed sources for design inspiration, not as runtime dependencies.
- Acceptance includes successful authoring with Tiled closed/disconnected, all six mode/operation combinations, multi-action and multi-sheet output, source-preserving extension, and correct downstream routing. Live Tiled checks apply only to a separately exercised editor handoff.
- No game source, existing project artwork, generated OpenSpec skills, renderer, collision rules, or gameplay changes. No automatic installation, global skill replacement, publication, or release.
- Playwright does not add evidence for this change's primary behavior. Use image inspection, playback previews, deterministic regression tests, and skill/package checks; no browser is launched during proposal.
