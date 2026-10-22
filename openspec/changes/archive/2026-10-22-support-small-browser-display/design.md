# Design

## Context

The existing Rogue's Dungeon shell is a fitted 16:9 viewport with a landscape
gameplay composition, menu overlays, and bounded dialogs. The viewport already
uses a size container, while several UI surfaces still depend on rem-based
minimum widths, fixed header/padding values, copied menu bounds, and fixed
height additions. See `proposal.md` for the motivation and observed failures.

## Goals / Non-Goals

**Goals:**

- Preserve the current ideal-size presentation exactly where its existing size
  budget is sufficient.
- Define compact PC landscape behavior from the fitted viewport's available
  CSS size rather than from mobile detection or the outer browser surface.
- Make dialogs self-contained, size-safe, and internally scrollable when
  needed.
- Keep the world view, primary gameplay actions, renderer geometry, and game
  state available through the compact tiers.
- Add focused source and browser checks for the compact layout contract.

**Non-Goals:**

- No mobile or portrait layout changes.
- No renderer fallback, world Zoom changes, camera changes, or gameplay-rule
  changes.
- No redesign of the established colors, artwork, card styling, typography
  family, or generous-size visual hierarchy.
- No new dependency or persistent user preference for compact layout.

## Decisions

### Use viewport container queries as the responsive authority

The fitted `#viewport` is the correct responsive boundary because it is the
surface that contains the game and overlays. Existing `container-type: size`
support will provide container-relative thresholds and sizing variables. This
avoids coupling compact behavior to the outer browser gutters or to mobile
user-agent classification.

Alternative considered: viewport-wide `@media` queries. Rejected because the
same browser width can produce different fitted shell sizes depending on
height, fullscreen state, or aspect ratio.

### Apply a staged layout budget

The landscape shell will use a monotonic progression:

```text
generous shell
    --> reduce container gaps and padding
    --> reflow or reduce non-critical typography
    --> compact titlebar/statusbar and secondary information
```

The generous tier remains the default. A tier may activate only when the
current geometry cannot satisfy its readability and containment budget.

Alternative considered: immediately replacing the HUD with a separate mobile-
like layout. Rejected because the request is PC landscape support and the
existing full-size visual design is already successful.

### Give each dialog an independent size budget

Dialogs will be measured against the fitted viewport safe area rather than
blindly inheriting the main-menu window's bounds. Dialog headers and action
rows remain visible, while dialog bodies receive `min-height: 0` and internal
overflow where required. Menu-specific styling remains intact.

Alternative considered: allow dialog contents to overflow visibly. Rejected
because it causes the Settings and Create Character failures shown in the
screenshots.

### Preserve the renderer/UI boundary

All compact behavior stays in React/CSS layout and dialog geometry. The
Babylon Lite world renderer continues to own only the world region, so shell
resizing cannot alter world Zoom, backing resolution, camera state, or input
ownership.

### Verify with focused checks

Add renderer-free assertions for the compact layout contract and one focused
browser-visible check after the related implementation group. The browser
check will use the repository's muted URL convention and will record the
required browser capability if the current environment cannot launch it.

## Risks / Trade-offs

- [Risk] A compact threshold may be chosen from incomplete browser evidence.
  -> Mitigation: define the smallest supported CSS shell dimensions explicitly
  during implementation and test a generous, intermediate, and minimum tier.
- [Risk] Typography reduction can harm readability.
  -> Mitigation: resize spacing and containers first, preserve a readable floor,
  and prefer wrapping or bounded scrolling over illegible text.
- [Risk] A compact secondary-panel arrangement may increase interaction steps.
  -> Mitigation: keep the world and primary controls visible and make the
  secondary information affordance persistent and keyboard reachable.
- [Risk] Existing bounded-dialog animation or geometry assumptions may regress.
  -> Mitigation: test each dialog type at both generous and compact sizes and
  preserve the existing close, focus, and dismissal behavior.
