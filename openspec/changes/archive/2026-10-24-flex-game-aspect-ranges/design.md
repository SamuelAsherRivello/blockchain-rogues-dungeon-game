# Design

## Context

The fitted viewport currently receives one width:height layout preset, so `fitViewport` always preserves a fixed ratio. The browser surface has the measured CSS-pixel size needed to choose a ratio, while the Babylon world surface independently observes and redraws when its host changes size. Landscape panels currently consume fixed proportions of shell width.

## Goals / Non-Goals

**Goals:**

- Represent landscape and portrait aspect bounds in the layout model and choose a fitted ratio from the measured browser surface.
- Preserve the baseline landscape panel column width by deriving it from shell height, leaving the world view as the flexible region.
- Keep all existing gameplay, renderer, fullscreen, developer orientation, and portrait control behavior stable while geometry changes.

**Non-Goals:**

- Add an aspect-ratio player setting, a renderer fallback, or automatic changes to world Zoom and camera framing.
- Redesign card contents, mobile controls, or the compact-layout hierarchy.

## Decisions

### Clamp the measured surface ratio to the orientation range

The layout model will carry a lower and upper aspect bound for each orientation. The fitted-ratio calculation will clamp the measured surface width-to-height ratio to that interval before calculating the centered rectangle. This fills surfaces that already lie in range and preserves endpoint frames with gutters outside it.

A set of discrete 16:9 and 16:10 presets was considered, but would introduce visible jumps and does not satisfy the requested intermediate sizes.

### Keep landscape information columns height-derived

Each panel column will use the CSS-pixel width produced by the present 22%-of-16:9-width baseline at the current shell height. The total panel block will be positioned from the right edge, and the world region will occupy the remainder. This holds the familiar panel size while the flexible landscape width belongs entirely to the game view.

Keeping the panels at 22% of every fitted width was rejected because it resizes their actual pixel width when the aspect changes.

### Preserve renderer and game-state boundaries

The UI layout layer changes the host rectangle only. The existing renderer resize observer remains responsible for its canvas backing surface and visible world bounds; it does not derive a new tile scale from the fitted frame. Orientation remains the only value exposed to game UI components, so the developer override continues to switch the complete shell without persisting a ratio preference.

## Risks / Trade-offs

- [Narrower 16:10 landscape has less world width than 16:9 at the same height] -> Preserve panel widths and existing compact layout thresholds; validate all range endpoints and an intermediate ratio.
- [Fullscreen or browser zoom can change the fitted ratio while overlays are open] -> Continue using viewport resize notifications and verify dialog and shell containment in the focused browser check.
- [Existing fixed-ratio tests can mask a range regression] -> Replace fixed-ratio assertions with endpoint, intermediate, clamping, and panel-width assertions.

## Migration Plan

1. Update layout contracts and fitting tests before changing shell geometry.
2. Update the browser-surface layout model and the responsive CSS geometry.
3. Run focused Node and Playwright checks, then retain the change artifacts for normal OpenSpec finalization.

## Verification Record

- Focused Node layout coverage and `npm run typecheck` passed.
- Built-in-browser checks covered both endpoints and an intermediate ratio for each orientation, with a ready renderer and zero measured geometry error.
- The complete `npm test` command currently fails in unrelated in-flight persistence, world-generation, and UI expectation tests. The focused aspect tests pass.
- Playwright CLI could not launch Microsoft Edge because its sandboxed temporary profile could not be created; desktop Edge tab creation is restricted in this session. The built-in browser verification completed successfully.
