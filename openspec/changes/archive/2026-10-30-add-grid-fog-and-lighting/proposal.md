# Proposal

## Why

Rogue's Dungeon records exploration but currently exposes the full terrain, and its artwork has no scene illumination. Add persistent exploration fog and grid-based lighting together, with production defaults and an independent developer comparison control so the visual result and its cost can be evaluated on the same campaign.

## What Changes

- Enable exploration fog and lighting in normal play. Unexplored terrain and world details are concealed; previously explored terrain stays known even when its illumination decreases.
- Uncover cells from player position using a configurable, direction-independent reveal brush. Keep exploration independent of lights, Perception, enemy presence, and tactical time. Preserve knowledge separately for each campaign and realm, including standalone prefabs.
- Calculate per-cell illumination from ambient light, a small surrounding player light, a forward-facing 180-degree contribution, existing wall torches, and campfires. Walls and closed doors occlude direct light. Tint the existing PNG artwork without engine light objects or a fallback renderer.
- Keep enemy detection governed by the existing Perception and line-of-sight rules. Brightness and facing do not change detection, awareness, combat, or simulation. Fog remains a separate presentation mask.
- Allow mouse walking to and through reachable fogged or dark terrain with the same white reticle, white route dots and boot cursor as ordinary revealed-terrain walking. Discovery does not clip walking routes. Concealed objects and enemies remain protected from identifying hints, mouse attacks and interactions; a hidden-target selection carries walking intent only.
- Preserve the existing mode contracts: Journey restores checkpoint discovery, Adventure restarts with fresh discovery, and Classic provides no recovery. New slots, new worlds, and unvisited levels start unexplored apart from their arrival reveal. Preserve compatible existing discovery on load.
- Add a session-only developer button labeled `RT:<mode>` that cycles `0` both off, `1` fog only, `2` lighting only, and `3` both on. Default to `3`; disabling fog never marks the campaign explored. Disabled effects skip their rendering and derived computation work, while normal discovery tracking continues.
- Keep tactical dimming above scene lighting. The user confirmed that its gameplay role takes precedence. Preserve its existing region membership and two attenuation classes, rather than requiring the final lit image to contain only two absolute brightness values.
- Retain static geometry, camera culling, semantic minimaps, pixel-perfect output, and world-depth ordering. Measure all four RT modes using repeatable routes and report combined-mode cost toward the existing 120 FPS target without promising a hardware-independent frame rate.

## Capabilities

### New Capabilities

- `grid-lighting`: Occluded per-cell scene illumination, surrounding and directional player light, source composition, and cosmetic independence from gameplay detection.

### Modified Capabilities

- `map-discovery`: Position-based reveal parameters, realm-scoped persistence, independent fog presentation, and explicit production/developer behavior with unchanged recovery policies.
- `world-map-rendering`: Fog and lighting composition without static terrain reconstruction; shared exploration in game/minimap/recap; tactical dimming precedence and unknown-cell interaction masking.
- `enemy-detection`: Explicit independence from illumination, facing, and fog controls while permitting exploration to conceal presentation separately.
- `world-renderer-performance`: RT comparison modes, effect-specific work counters, bounded updates, and reproducible combined-on profiling.

## Impact

Implementation will affect discovery helpers and realm transitions in `world-procedural-system.ts`, campaign/save compatibility, renderer-neutral visibility data, the Babylon sprite renderer, semantic minimap presentation, developer settings and `StatusControls`, and focused logic/browser checks. New files use lowercase kebab case. No new package, artwork replacement, generator redesign, combat rebalance, or change to death-mode contracts is planned.

Acceptance requires both effects enabled on an ordinary fresh launch; correct four-state RT cycling without save mutations; concealed unexplored details in gameplay views; retained exploration under existing mode policies; occluded directional light; hidden enemies remaining hidden even in bright terrain; neutral white mouse-walking presentation and routes across fog boundaries while concealed-target attacks/interactions remain blocked; and tactical dimming composing last without illuminating unknown cells. Source discovery is complete enough to name the integration points; visual radii, falloff, and ambient values are documented starting values for implementation tuning, not claimed human acceptance.

Playwright adds useful evidence for fog boundaries, shader composition, RT state changes, camera movement, and persistence. Apply includes one focused muted Microsoft Edge check after integration; finalization includes the repository's three browser contexts, focused Node/type checks, and the applicable full browser suite. No browser or runtime test is run as part of this proposal.
