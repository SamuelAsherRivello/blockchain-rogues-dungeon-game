# Proposal

## Why

Rogue's Dungeon currently fits every landscape session to exactly 16:9 and every portrait session to exactly 9:16. This wastes usable surface space at nearby device and window shapes even though the renderer and HUD already respond to region resizing.

## What Changes

- Fit landscape shells continuously from 16:10 through 16:9 and portrait shells continuously from 9:16 through 10:16, centering a clamped frame when the available surface lies outside the applicable range.
- Keep the landscape title bar and status bar at their present height allocation, keep each right-hand information column at its current pixel width for a given shell height, and allocate each in-range aspect change to the world-view width.
- Preserve the existing portrait Title, Game, Status, Bottom-content order while allowing the fitted portrait width to grow within its range.
- Retain world Zoom, camera, game state, renderer pixel policy, and developer orientation switching while a fitted frame changes size or ratio.
- Add focused unit and browser coverage for both range endpoints and an intermediate aspect.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-template-layout`: fit project frames within an orientation-specific aspect range instead of only one fixed ratio.
- `pixel-game-presentation`: define the responsive landscape panel sizing and the flexible landscape and portrait game-shell behavior.

## Impact

The change affects the layout model and fitted browser surface, landscape and portrait CSS geometry, responsive layout tests, and browser aspect-layout checks. Babylon Lite remains WebGPU-only and its backing resolution and selected world Zoom remain independent of shell fitting. Playwright provides useful evidence because the behavior is visible and depends on browser resizing and fullscreen geometry.
