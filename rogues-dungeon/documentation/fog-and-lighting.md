# Fog and lighting

Exploration records where the player has been. Illumination describes the current scene. Enemy detection remains governed by Perception and its existing line of sight. Tactical dimming is the final gameplay overlay above the lit, fog-masked world.

## Exploration

`DISCOVERY_RADIUS` starts at four tiles. The brush includes cell centers within radius plus half a tile and clips at grid bounds. It crosses walls and ignores facing, lighting, Perception, enemies and diagnostic RT settings. Accepted movement and realm arrival reveal cells without adding a simulation tick. An unchanged reveal retains the same discovery record.

Knowledge uses dimension-prefixed base64 row-major bitmaps. Canonical keys include world identity, run, realm kind, dungeon level or prefab ID, floor seed and dimensions. Slots own independent campaign records. Home knowledge never aliases dungeon knowledge. Compatible numeric legacy keys can supply knowledge only to matching retained dungeon dimensions. Original save bytes are backed up before a legacy record is normalized; malformed or mismatched records supply no knowledge. Cached buffers are immutable, and reveals copy them before writing.

New slots, worlds and levels start unknown apart from arrival. Returning to the same realm retains its exploration. Journey restores precisely the checkpoint's knowledge, excluding later exploration. Adventure clears knowledge and reveals the recovery arrival. Classic has no recovery. Coverage counts the whole grid; 100 percent means every cell bit is set, not that generation guarantees every cell is reachable.

Before the first saved-record rewrite, retain its original bytes under `rogues-dungeon.slot.discovery-v2-backup.<slot>`, unless an identical legacy backup already preserves them. The discovery backup is not replaced on later saves, and this compatibility path does not replace an older v1 backup. Preserving the whole record also protects malformed discovery in an inactive realm.

The separately authorized development compatibility reset runs before these save readers. A missing or older compatibility epoch clears `rogues-dungeon.*` once, including old slots and backups, while preserving unrelated origin data. New saves and preferences survive subsequent starts in the same epoch. Discovery migration protects supported records after that startup boundary; it does not bypass the development reset.

## Grid light

The surrounding player radius is 3; the forward 180-degree radius is 6. Wall torches, authored home torches and campfires share `CAMPFIRE_LIGHT`: radius 5 and RGB (0.90, 0.58, 0.25). Change that definition to tune all three together. Ambient RGB is (0.30, 0.32, 0.36). Player RGB contributions are (0.58, 0.56, 0.50) around the player and (0.34, 0.33, 0.29) ahead. Linear radial falloff reaches zero at radius plus half a tile. Contributions add and clamp to [0, 1].

Wall-mounted artwork samples the strongest incident light at its own grid anchor, so the torch lights itself at full campfire strength. Its distance falloff is centered on the actual fixture. Only its occlusion ray starts on the exposed adjacent cell via `castFrom`, preventing its supporting wall from extinguishing it. Neighboring wall tiles receive weaker light through the same falloff. Wall geometry selects an exposed face on the viewer's side, including shallow viewing angles; the opposite face and cells behind the wall stay occluded. Exact diagonal corner hits use an exposed receiving face instead of a face buried against the next wall tile.

Opaque endpoints receive light on the face facing its source and stop further light. Two blocked neighbors pinch a diagonal corner; one alone permits it. Closed gameplay doors are opaque. A wall torch emits from the first adjacent walkable cell in N/E/S/W order. A wall's player-facing receiver does not inherit light on its opposite face. Light positions follow committed grid cells, preserving the existing four cardinal headings and diagonal movement tie behavior. Lighting never writes detection, combat, facing or campaign state.

Source footprints and additive sums are retained. Moving or turning the player subtracts its old contributions and adds its new ones. Door changes invalidate intersecting sources; distant footprints remain cached. Idle scenes do no receiver traversal or pixel updates. Disabled lighting bypasses source preparation. The first update after a disabled interval reconciles the current scene.

## Rendering integration

The two authored home torches join the same emitter path as generated wall torches. The fixture left of bookshelf 1 is tile GID 137 in `player-home.tmx`, layer `Decoration 2`, local grid (1,0); the matching fixture is at (8,0). Both use full campfire strength at their own anchors. Loading a saved realm applies the normal arrival brush, including older saves that did not reveal the player's restored location.

Both effects default on. The session-only developer control cycles `RT:0` neither, `RT:1` fog, `RT:2` lighting, `RT:3` both. Tracking exploration continues in every mode. RT does not change tactical dimming, enemy detection, simulation ticks or saved bytes. It survives renderer and Perf remounts within the page; reload restores 3. Hiding developer eligibility restores effective mode 3. No RT value enters preferences, campaign, checkpoints or share URLs.

The game uses one nearest-sampled RGBA field: RGB is illumination, alpha is exploration permission. The floor shader converts framebuffer coordinates through the layer's live view into world cells. Geometry stays retained. Crossing between RT 0 and enabled modes replaces only floor presentation layers from retained tile records using public add/remove APIs. Other RT changes reuse the field and shader. Whole-field GPU uploads occur only on dirty revisions; counters report their bytes. Teardown releases textures and derived caches.

Walls use their owning cell and player-facing receiver. Actors, props, shadows and effects sample their anchor. An oversized sprite receives a single tint and permission, preserving transparent pixels and its head. Main/shadow pairs keep their depth and hop behavior; stair clipping remains active. An interpolated enemy also requires committed detection and its displayed anchor's permission.

The semantic minimap uses the same discovery with its own colors and no scene light. Knowledge/object revisions repaint its background; marker-only movement does not. Hidden views skip preparation. Recap forces actual discovery even after diagnostic fog-off play. Create World explicitly requests a complete unlit preview without writing discovery.

Mouse walking uses the same white reticle, white route dots and boot cursor on revealed, unknown and dark terrain, within the normal travel budget and terrain rules. Unknown cells do not display object, hazard or enemy indicators. Hidden objects cannot be attacked, bumped or collected by mouse travel. A click on an unknown occupied tile walks toward it without queuing an interaction when it becomes discovered. Keyboard exploration remains available.

Fog and illumination do not reject reachable walking destinations or clip routes at the discovery boundary. The neutral white navigation preview is permitted inside fog, while world artwork and identifying targets remain subject to their normal presentation permissions. Hovering or selecting a route does not reveal the map; accepted movement applies the existing discovery brush. Normal collision and turn rules continue to apply.

Composition is illuminated artwork, fog permission, optional S color treatment, then tactical SVG dimming. Membership, the extra artwork row, wall/door checks and overlap union retain their meaning. Both tactical attenuation classes can contain varying scene light. Bright non-tactical torches receive final dimming. Unknown cells cannot expose identifying tactical hints.

The start-room decoration plan renders once in registered wall-row layers. Its cells replace matching canonical wall sprites instead of drawing a duplicate ring. These layers share wall depth, owning-cell fog permission, wall-face light tint and nearest texture sampling. The semantic minimap remains unchanged.

## Tuning

| Setting | Definition | Current value |
| --- | --- | --- |
| Exploration brush | `DISCOVERY_RADIUS` in [map-discovery-system.ts](../src/systems/procedural/map-discovery-system.ts) | 4 tiles |
| Ambient color | `GRID_LIGHTING.ambient` in [grid-lighting-system.ts](../src/systems/rendering/grid-lighting-system.ts) | RGB 0.30, 0.32, 0.36 |
| Surrounding player light | `GRID_LIGHTING.playerRadius` and `playerColor` | 3 tiles, RGB 0.58, 0.56, 0.50 |
| Forward player light | `GRID_LIGHTING.forwardRadius` and `forwardColor` | 6 tiles, RGB 0.34, 0.33, 0.29 |
| All fires and torches | `CAMPFIRE_LIGHT.radius` and `color` | 5 tiles, RGB 0.90, 0.58, 0.25 |

The forward angle is currently a half-plane in `footprint`, selected by the heading dot product. Changing it to a narrower cone requires changing that predicate and its tests. Distance falloff is linear in the same function. The reveal brush has its own rounded-radius predicate and is independent of these lighting choices. Tactical attenuation remains in the Battle presentation and takes precedence over all light values.

## Measurements

[The historical raw comparison](fog-and-lighting-performance.json) contains six matched RT samples from before the coordinated save/HUD, graph-generation and final campfire-matching changes. [The renderer checkpoint](renderer-performance.md#fog-and-lighting-comparison) reports those CPU/frame costs, the retained-reader paint comparison and limits. Later attempts were rejected when runtime source changed during their capture periods; final integrated performance acceptance remains open. Both effects remain the production default. The separate normal-save slowdown and its corrections are tracked by the coordinated program.
