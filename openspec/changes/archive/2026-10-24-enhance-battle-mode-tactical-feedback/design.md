# Design

## Context

See proposal.md for motivation. Game owns the audio manager and developer controls. BabylonWorld owns the main canvas, projection revision, detected enemy set, and screen overlays. gameMode currently uses only effective enemy awareness; detectedEnemyIds uses max(1, 2 * Perception) and line of sight. The audio manager prewarms three HTMLAudio tracks and randomly selects one looping track.

## Goals / Non-Goals

Deliver stable Battle identity, binary tactical shading, and deterministic crossfaded music. Preserve AI range, route previews, input, saves, and the minimap. Do not add enemy comparison panels, new music assets, or a renderer.

## Decisions

- Battle entry requires warning distance and the shared terrain/door line-of-sight check. Retain enemy AI awareness unchanged. Track a fixed 750 ms sight-loss deadline in a session-only WeakMap propagated across accepted actions on the same floor. Keep gameMode reads side-effect free. A cancellable UI timeout refreshes presentation at expiry without a simulation turn. Nearby unseen enemies cannot initiate Battle; reacquisition resets grace and loss of all nearby living threats ends it immediately.
- Compute inclusive rectangles from logical player/enemy cells, extend each rectangle one full row upward for sprite headroom, union their horizontal intervals per visible row, and project through the renderer's actual camera. A 3x3 region around the player plus one row above it is always included. The nearest clear-line threat also contributes even outside Perception detection range, giving a spatial hint without identifying it. Wall-concealed enemies never affect the mask. This avoids through-wall location leaks and overlapping opacity. Filled rectangles are the chosen area, rather than a narrow path that could imply a movement route.
- Render a pointer-transparent SVG mask above the canvas and below reticles/tooltips. Keep the tactical area at normal brightness and apply a uniform dark fill outside. This is the only treatment. Remove the E-VIS selector, alternate fill, and stored setting readers and writers.
- Use a separate React Battle overlay. On entry slide the icon in, extend the text ribbon from behind it, hold, and retract the text. Keep the square in place until exit. Cancel timers on exit, rapid re-entry, floor/session changes, and unmount. On loading an active Battle, show the entry presentation when gameplay becomes visible. Approximate large-view icon size is 50px, capped to 9% of view height and reduced on compact screens; ribbon fits view width. Pointer events pass through. Reduced motion shows the persistent icon directly. Accessible state text names Battle Mode.
- Retain the existing red border. No battle visual control appears in the bottom UI. The mask changes with world projection; the badge does not move or scale with game Zoom.
- Choose music indices 0 and 1, Spooky Dungeon and JRPG - End Dungeon. Keep all three bundled assets and credits. Replace random music selection with retained paired audio elements and frame-driven gains. On first gesture unlock both elements at zero gain, then use the current mode. Fade linearly for 500ms, pause the outgoing element at completion, and resume both tracks from their retained times. Reverse fades from current gains. Reapply bus gain on preference changes, cancel animation on dispose, and preserve hard URL mute before creating audio. Do not restart on each gameplay action.

## Risks / Trade-offs

- A rectangular area includes walls and is not a traversable route. Document this explicitly and retain existing route dots.
- A high Perception warning may remain active across a large room. It does not make enemies attack from farther away.
- Browser autoplay may reject play. Retain gesture retry and swallow rejection without blocking gameplay.
- Rapid mode reversals can race fades and banner timers. Cancel prior generations and test reversals.
- Other chats are changing game.tsx and renderer assets. Preserve all unrelated changes and use narrow patches.

## Migration Plan

No campaign migration. Add one developer storage key with fallback 2. Remove only this change's overlays, warning extension, and soundtrack selection to roll back. Existing audio volume and mute preferences remain authoritative.

## Verification

Unit tests cover warning boundaries, hidden enemies, rectangle unions, and audio fade timing/reversal/mutes with a controllable clock. Run npm test, typecheck and build. Run one focused Edge CLI browser group after integration, then desktop Edge and in-app browser checks on one project-owned muted server. Wider browser-suite finalization remains for archive. Listening approval of musical mood and loops remains a human check; automated sessions must be silent.
