# Movement and enemy detection

Movement is the walking-person selector immediately after Camera. It is a normal utility control, not a Dev Setting. The selected value persists independently of save slots. Missing or invalid values use Grid-tween.

| Selection | General keyboard | General mouse | Battle |
| --- | --- | --- | --- |
| Grid-snap | Instant accepted steps, held repeats | One click follows the cardinal route, snapping each step | One fresh press or click per step, instant placement |
| Grid-tween | Existing 250 ms tween and held repeats | One click follows the cardinal route, tweening each step | One fresh press or click per step, 250 ms tween |
| Gridless | Continuous normalized two-axis movement, release stops on a whole pixel | Snap to occupied center, walk smoothly along the cardinal route without hopping, finish at destination center | Temporarily uses Grid-tween without changing the selection |

General mouse travel does not require holding the button. Gridless left and right clicks both use center-to-center smooth pixel travel, with a turn-free initial recenter. Actual Gridless travel loops directional run art and returns to idle on stopping; discrete modes keep their existing art. Choosing Movement returns focus to gameplay like Zoom and Camera, so WASD and arrows work immediately. Keyboard input replaces a clicked destination. New clicks replace old destinations. Mode and floor changes, dialogs, and blur cancel queued input. Battle entry and exit require fresh input before travel resumes. Enemy and barrel animation are independent of the selected player mode.

## Pixel positions and tactical time

The world uses 32-pixel tiles. A pixel position belongs to `floor(x / 32), floor(y / 32)`, including exact left/top boundary pixels. Cell centers are `32 * cell + 16`. Old or invalid precise positions normalize to the stored cell center. Both views and the camera use the same precise position.

General Gridless travel advances time once per crossed column-center line and once per crossed row-center line. Departure from a starting line does not count; arrival does. Exact diagonal ties resolve X before Y. Each phase rechecks interruption before continuing. Cell entry handles pickups, traps, triggers, and stairs separately, without an extra turn charge. Movement cannot enter blocked cells or cut blocked corners. Free motion stops on entering stairs so the existing stair presentation can take over.

Battle uses living active-floor enemies and their effective awareness, including the existing sneak adjustment. It uses Chebyshev cell distance even through walls. It does not depend on Perception or visibility. Battle shows a 2 CSS pixel red inset border and an accessible game-mode label, with no layout or hit-test change. Entry from an off-center position tweens to the occupied cell center without changing cells, adding time, or running an enemy phase.

## Perception

Perception replaces the unused Vitality attribute. There are still ten attributes and a 30-point initial roll with the existing 1..5 roll bounds. Perception supports integer ranks 0..99. The initial range is `max(1, 2 * Perception)` cells using Chebyshev distance. The one-cell minimum at zero is a tuning default. Walls and closed linked doors block sight, open doors permit it, and diagonal rays cannot pass pinched opaque corners.

An enemy is drawable only while currently within range and line of sight. Losing either condition hides its sprite, shadow, pivot marker, minimap marker, tooltip, and identifying cursor again. There is no permanent reveal or last-known marker. Hidden enemies remain in authoritative collision, AI, and Battle evaluation. Terrain is not hidden.

Existing unused Vitality ranks and item modifiers migrate to Perception. Explicit Perception wins, including zero. The oldest Vitality-as-Health records keep their Health migration meaning. Other progression and saved run state are preserved.

## Cursor and preview assets

The six cursor SVGs in `public/assets/cursors/` are original geometric icons authored for this change, with no third-party source. They use a 24 by 24 viewport and a 12,12 hotspot. Walking and running use boot shapes, fighting uses crossed swords, interaction and pushing use hands, and unavailable actions use a forbidden symbol. Each has a native fallback. Existing help, control-pointer, drag, and passive minimap semantics take precedence over world targeting.

The dotted path and reticle were already implemented. This change retains cardinal A*, complete and reachable-approach routes, origin exclusion, green interactive intermediate dots, green endpoint-dot omission, palette priorities, and shared projection. Only undiscovered enemy identification receives the new detection gate. Navigation is reused within a target cell until navigation state changes. The minimap has no path preview.
