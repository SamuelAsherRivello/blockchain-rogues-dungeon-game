# Design

## Context

See proposal.md for motivation. Game owns input repeats and a memoized mouse path result. The pathfinder uses cardinal routes and can return an approach route with reachable=false. BabylonWorld excludes the path origin and selected green interactive endpoint when drawing dots, including green intermediate interactive dots, and uses shared world-to-screen projection. TurnPresentationSystem holds renderer positions separately from campaign grid coordinates. Its current boolean disables interpolation for all movers, so it is not a suitable player-only mode switch.

Keyboard input currently uses the last held cardinal direction. Durable specs also describe paired-key diagonals; Gridless needs explicit two-axis input rather than assuming that code already exists. The camera controls live in TitleBar, so the requested placement right of Camera means that top utility group.

## Goals / Non-Goals

Goals: separate precise player position, logical occupancy, tactical time, input intent, and presentation; preserve shared world/minimap coordinates; allow a temporary Battle override without overwriting the selected preference.

Non-goals: replacing the existing dotted preview, changing enemy AI or enemy/barrel playback timing, adding another renderer, adding a fourth movement mode, or implementing game code during planning.

## Decisions

### Position and time ownership

Keep integer cell coordinates authoritative for combat range, triggers, and occupancy. Add validated integer world-pixel coordinates for the player, measured in the 32 px tile coordinate system. Cell ownership follows the containing cell with a fixed boundary convention. Both views and the camera consume the same precise coordinate. Rendering must not independently advance gameplay time.

Enumerate crossings of vertical lines x=32*n+16 and horizontal lines y=32*n+16 along each accepted movement segment. A column crossing emits one tactical tick and a row crossing emits another. Process by segment fraction; exact ties use deterministic X-before-Y processing with one enemy phase per tick. Revalidate after every phase, stopping if death, a floor transition, or a newly blocked segment interrupts travel. Count departure from the initial center zero times, count arrival once, and avoid replaying a crossing while standing on the line. Reversing and crossing the same line again is a new crossing. Moving along a center line is not crossing it.

Crossings and occupied-cell changes are distinct. Validate cell entry before accepting pixels in a blocked cell even if no center line has been crossed yet. Use existing bump interactions for occupied actionable targets. A discrete Battle step follows ordinary one-step action accounting; it does not also run free-movement crossing accounting. For pickups and triggers, preserve once-per-entry effects without adding a second movement charge. Exact interaction scheduling at sub-cell entry must be covered by the reconciliation and domain tests.

### Mode and input behavior

Game mode and movement mode are independent. The game-mode state machine has General and Battle states; the preference has Grid-snap, Grid-tween, and Gridless values. The following effective-mode mapping is confirmed:

| Selected movement mode | Game mode: General | Game mode: Battle |
| --- | --- | --- |
| Grid-snap | Grid-snap | Grid-snap |
| Grid-tween | Grid-tween | Grid-tween |
| Gridless | Gridless | Grid-tween |

| Mode/state | Keyboard | World mouse |
| --- | --- | --- |
| General / Grid-snap | Accepted direction moves instantly to the next cell center; held-repeat cadence remains available | Snap each accepted step, up to 30 steps or the first unconfirmed trap; each step resolves its own tactical turn |
| General / Grid-tween | Preserve 250 ms player interpolation and retargeting | Tween each accepted step, up to 30 steps or the first unconfirmed trap |
| General / Gridless | Continuous two-axis whole-pixel travel while held; release stops at the current whole pixel | Snap to occupied center, walk smoothly with looping run art and no hop/tween, then finish centered at the destination, 30-step limit, or pre-trap stop; release does not cancel travel |
| Battle / any selection | One non-repeated directional keypress requests one grid step | One click requests at most one next cardinal route step; no automatic continuation |

Gridless diagonal input normalizes speed. Use elapsed-time accumulation and integer pixel stepping, not one pixel per display frame. Do not reuse the grid repeat timer for continuous motion. Mouse dots remain a mouse feature in every state and never become a keyboard-path display. The Movement selector uses the same selection-time focus return as Zoom and Camera so WASD/arrows immediately control the game. Accepted Gridless pixel displacement keeps directional run art looping; the input loop explicitly stops locomotion on arrival, release, blockage, or cancellation, without a short timeout that could flicker on slow frames. The initial mouse recenter is turn-free; route traversal retains center-line accounting.

The selected mode remains separate from effective behavior. Entering Battle cancels held repeats and queued destinations; returning to General requires fresh input before movement resumes. Battle retains Grid-snap versus Grid-tween visuals and uses Grid-tween when overriding Gridless. Confirmed transition rule: an off-center Gridless player tweens to the occupied cell center without changing cells, advancing tactical time, charging an extra turn, or running an alignment enemy phase. Use the existing 250 ms player tween as the duration default. Mode changes outside Battle likewise cancel pending input and settle within the same cell as a draft default. Updated playtest decision: preserve the cardinal A* route but center Gridless mouse travel at both departure and arrival; only keyboard travel retains arbitrary whole-pixel stops. A new click replaces an existing General destination, keyboard movement cancels it, and modal/blur/floor transitions cancel travel.

### Mouse travel limit and trap courtesy

Use a fixed limit of 30 cardinal route steps per mouse gesture. Exclude the origin from this count, so a capped preview contains at most 30 dots and its route contains at most 31 cells. Count route steps rather than straight-line distance. A farther target previews the first 30 steps; exact reachability is false for that click and travel stops at the capped endpoint. Track the gesture's remaining budget so route recomputation cannot extend travel beyond 30 steps. Zoom, camera, C-controlled panel visibility, viewport size, and attributes do not change the limit. Keyboard travel retains its existing behavior. Battle still limits each click to one step.

Trap decorations are hazards, not hard navigation obstacles. The preview may pass through them and continues beyond them within the 30-step cap. Draw every previewed trap cell red, including a trap selected as the endpoint. Other dots retain their existing white/green rules. A trap reticle uses the existing red palette, without implying an enemy or revealing an undetected enemy.

Separate the preview route from the current click's permitted travel. The first click stops at the safe cell center immediately before the first unconfirmed trap, even when the trap is retracted. Cancel automatic continuation there rather than advancing on a held button. A fresh second click from that stopping point toward the same trap or beyond it confirms that adjacent trap only. Another trap along the resumed route requires its own pause and fresh gesture. A first click while already adjacent warns without entering; the second permits entry. Keyboard movement clears stale mouse confirmation and can still deliberately enter traps. Mode/floor changes and modal cancellation retain their existing input-reset behavior.

The courtesy pause, preview, and confirmation alone add no tactical time or enemy phase. Accepted movement still uses the selected mode's existing time rule, and a confirmed trap crossing retains normal trap damage. Gridless approaches finish at the safe center without hopping. Closed doors remain hard blockers; a second click cannot authorize crossing one.

### Battle proximity

Evaluate living enemies on the active floor after accepted movement, enemy updates, death, floor changes, and load. Battle uses the same Chebyshev cell-distance comparison and effective awareness range as enemy AI, including its existing sneak adjustment. Any qualifying living enemy enters/maintains Battle even through walls, outside the viewport, or without player detection. Return to General only when no enemy qualifies. Perception and line of sight never gate this predicate. Do not use wall-clock expiry. A 2 px red inset overlay marks Battle on the main game view only, consumes no layout space, accepts no pointer events, and remains visible in fullscreen and either aspect. Add an accessible General/Battle state label so color is not the sole signal.

### Perception and enemy detection

Replace the unused Vitality entry with Perception in the typed attribute set, labels, character roll, progression allocation, effective attributes, tooltip, and persistence normalization. Retain exactly ten attributes. Perception accepts integer values 0..99; other attributes retain their existing 1..99 bounds. Keep the existing 30-point initial roll with its existing 1..5 roll bounds; Perception 0 remains supported for migrated or authored characters and focused tests. This does not turn 5 into a hard cap.

Use rangeCells=max(1,2*Perception). The 1-cell minimum at 0 is a tuning assumption implementing the user's very-close detection request; positive-value scaling is confirmed. Use Chebyshev cell distance as a consistent initial metric. Test 0, 1, 4, 5, and 99 with exact inclusive range boundaries. Do not cap detection at 10 cells. Line of sight blocks detection regardless of range. Initial opacity policy: walls and closed doors block; open doors do not; diagonal rays cannot see through two touching blocked corners. Use a general grid-ray test, not the current cardinal-only ranged-attack helper.

Keep a derived detected-enemy set separate from Battle and the renderer's viewport-culling set. An enemy is visible only while it currently satisfies both Perception range and line of sight. Otherwise hide its sprite, shadow, silhouette, minimap marker, tooltip, and identifying combat cursor, even if it was previously detected. Clear stale hover disclosures when detection is lost. Do not retain a persistent reveal or last-known marker. Reveal the enemy again when both conditions return. Hidden enemies remain authoritative entities for collision and enemy AI. Terrain stays visible; this does not introduce terrain fog-of-war. Recompute detection conditions after player/enemy position, door, floor, or effective Perception changes. Higher Perception can reveal a clear-line enemy before its awareness triggers Battle; low Perception can leave the player in Battle without identifying the nearby threat. Losing player detection alone does not end Battle.

Migration default: when Perception is absent, map the stored unused Vitality rank to Perception within 0..99, preserving previously spent ranks and unrelated progression. If both are present, explicit Perception wins. Map legacy Vitality item modifiers consistently. Save the new field and remove Vitality from active UI/contracts; retain legacy reads for compatibility. Do not reinterpret very old saves' Vitality-as-Health migration as Perception.

### Utility control and persistence

Order: Zoom, Camera, Movement, Fullscreen, Settings. Use a small monochrome inline SVG walking silhouette, matching utility size and color; avoid a platform emoji. Pair it with the same select treatment and a Movement mode accessible name and tooltip. Grid-tween is the default for absent/invalid preferences. Proposed default: persist selected mode with existing preferences, independent of save slots. Preserve precise pixel position in saves, normalize legacy saves to cell centers, and recompute Battle instead of persisting stale proximity. No preference selection itself ticks time.

### Mouse interaction and cursor mapping

| Existing mouse use | Proposed icon/state |
| --- | --- |
| Hover or travel toward reachable ground | Walking boot; running variant while sprint input applies |
| Hover enemy; approach or bump attack | Crossed swords; do not imply ranged targeting |
| Pickup, unopened chest, campfire, usable stairs | Open interaction hand |
| Unopened breakable crate | Strike icon shared with fighting |
| Legally pushable barrel | Pushing hand |
| Blocked terrain, sealed route, illegal push | Forbidden symbol |
| Walking onto a trigger or open door | Walking boot; trigger itself is not a separate click command |
| Hover the player or passive decoration | Neutral arrow unless an actual action is available |
| Mouse wheel over world | Preserve zoom; keep contextual world cursor |
| Screen-camera edge advance | Walking cursor, subject to Battle one-step limit |
| Hover enemy details | Combat cursor in world; retain tooltip display |
| Click abilities or quick slots | UI pointer; unavailable states use disabled affordance |
| Drag inventory, equipment, quick slots, abilities | Grab, then grabbing with valid-drop or forbidden state |
| Hover attributes, resource meters, card help | Help cursor |
| Scroll Log, Slots, Inventory | Native wheel behavior; pointer track and grab/grabbing thumb |
| Menus, save slots, character creation, progression, Settings, help, dialogs | UI pointer; standard controls and disabled states |
| Zoom/Camera/Movement selectors, fullscreen, panel tabs, control tray | UI pointer and native select behavior |
| Click portrait movement, abilities, quick-use, sneak, wait, Control/Info | UI pointer; movement arrows submit one action per click |
| Developer aspect/pivots/URL/map controls, repair file picker, source link | Standard pointer/file/link behavior |
| Minimap, plain text, non-actionable HUD | Neutral arrow; no world targeting |

Resolve cursor intent with the same legal action information that input uses, including endpoints requiring approach. UI/drag state wins over world hover. Prefer native CSS cursors with small local cursor assets, explicit hotspots, and native fallbacks; avoid a React-following fake cursor or A* on every pointer pixel. Preserve distinct reticle and dotted preview rendering.

### Authoritative path and reticle baseline

The user explicitly selected current path and reticle code as the source of truth. Reconcile the change deltas with that baseline, superseding the former durable blanket rejection of unreachable targets. Leave implementation unchanged during this update.

Source anchors: game/mouse-selection.ts, game/a-star.ts, systems/rendering/babylon-render-system.tsx, ui/interaction-colors.ts, and ui/style.css under rogues-dungeon/src/.

Routing first tries the complete cardinal A* path, preferring routes through empty cells before routes through pickups. If unavailable, it returns a reachable approach with reachable=false. When an otherwise viable route is blocked by a linked closed door, the approach stops at the first blocked cell's predecessor; otherwise it uses the reachable cell closest by Manhattan distance, with shortest route breaking ties. Enemy cells, campfires, barrels, walls, and closed linked doors remain obstacles under the current mouse options. The input helper still requests the approach's next step; if none remains, a cardinally adjacent enemy, campfire, unopened chest/crate, or barrel can receive its existing bump interaction. General/Battle affects how many input steps are requested, not whether these route outputs exist.

| Current drawing condition | Preserved output |
| --- | --- |
| Selected player cell | Invalid reticle, nearly black |
| Enemy target | Red reticle, even if exact destination is not traversable |
| Trap target | Red hazard reticle; crossing still requires the courtesy confirmation |
| Barrel or item/potion/key/gold/chest/campfire/stairs target | Green reticle, even when exact reachability is false |
| Other target with exact reachability false | Nearly black reticle; an approach path can still exist |
| Other walkable reachable target | Pale white reticle |
| Route origin | No dot |
| Selected green-classified interactive endpoint | No endpoint dot; the green reticle identifies the target |
| Intermediate green-classified interactive cell | Green dot |
| Previewed trap cell, including a selected trap endpoint | Red dot; preview continues beyond it within the cap |
| Other previewed route cell | Pale white dot; no separate red enemy-dot variant |

Classification is the renderer's current list, not a promise that every green object is currently usable. Crates and discoveries do not belong to that green list. Preserve the shared palette: valid #f5f1e6, interactive #6dd873, enemy #dc3d40, invalid #090909. Dots are circular with glow, four CSS pixels at native tile size, scaled by tileCssSize/32, and ignore pointer input. The corner-bracket reticle occupies the selected tile. Held selection remains fixed in world coordinates and reprojects with the camera; hover selection follows mouse-to-cell projection. Game-view overlays refresh on projection and viewport changes, without a new A* search merely for pointer pixels within one cell. The minimap remains passive.

The future Perception work is an explicit additional presentation gate for undetected enemies; it is not evidence that the current renderer already filters them. Existing drawable targets otherwise retain the classification and dot policy above. The custom cursor can communicate actual interaction availability separately without recoloring or deleting the preserved reticle/approach preview.

## Risks / Trade-offs

- Center-line ticking can make logical cell entry precede an enemy phase. Keep occupancy and crossings separate and test the interval between cell edge and center.
- A long frame can cross multiple rows/columns. Enumerate all accepted crossings and revalidate between phases rather than combining ticks.
- Battle transitions can accidentally continue a held path. Cancel all queued input, require a fresh press, and test both entry and exit.
- Per-pixel React state would increase renders and pathfinding. Keep the movement integrator separate, reuse routes until navigation inputs change, and publish gameplay changes at domain boundaries.
- Exact-diagonal double phases can kill the player during the first phase. Revalidate before the second; never apply it to a replacement run.

## Migration Plan

Add backward-compatible preference and precise-position normalization, then integrate player motion and turn accounting, the dropdown, Battle override, and cursor resolution. Existing saves without pixel coordinates start at their stored cell centers. On rollback, retain readable grid coordinates and ignore optional precise fields. Preserve unrelated working-tree changes.

## Initial planning review outcome

Both three-question reviews confirmed General click travel, Battle awareness through walls, separate Perception-based line-of-sight detection, turn-free Battle-entry centering, and complete enemy hiding whenever detection is lost. These decisions are retained. The user's later approved playtest decisions add the fixed 30-step mouse budget and red-dot trap preview with stop-and-confirm crossing. The code already implements these additions; this planning-only reconciliation updates their contracts and records existing verification. Initial review text is not a claim that implementation remains outstanding, and this update does not claim a new full-browser-suite pass.
