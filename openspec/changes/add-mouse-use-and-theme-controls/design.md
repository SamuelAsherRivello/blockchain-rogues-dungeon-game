# Design

## Context

`StatusControls` renders desktop developer settings while `game.tsx` owns theme state. `SlotItem` currently renders the whole row as one button and attaches drag metadata to it. Abilities and quick slots already dispatch their actions on row clicks and share this component across layouts.

## Goals / Non-Goals

**Goals:** Make actions discoverable without duplicating game rules, and retain current mouse and keyboard behavior except the explicitly removed theme shortcut.

**Non-Goals:** Change action costs, targeting, drag rules, save formats, sneak controls, or add theme persistence.

## Decisions

- Pass the active theme and a cycle callback into desktop settings, sharing the existing theme state used by world and minimap. Remove the T handler instead of maintaining two ways to change the theme, as requested.
- Restructure actionable slot rows to allow a real Use button without nesting buttons. Keep the row's existing click target as a separate sibling or otherwise valid interactive structure, route both through the same callback, and stop propagation where needed to prevent double activation. A decorative label inside the existing button would avoid restructuring but would not provide an independent button.
- Keep drag source and drop target semantics on the row area and exclude the Use button from initiating a drag. Preserve existing availability and disable the new button when the action is unavailable. Leave non-actionable equipment and inventory behavior intact.
- Style the new control in the existing compact row, with truncation and available width checked in desktop and mobile layouts. No new dependency is needed.

## Risks / Trade-offs

- [Nested interactions or pointer bubbling cause duplicate actions or accidental dragging] → Use valid sibling controls and test clicks and drags separately.
- [Reduced row width obscures names or controls] → Verify compact desktop and mobile layouts and keep the Use control visible.
- [The active mobile layout change touches shared UI] → Inspect current code and preserve concurrent changes during implementation.

## Migration Plan

No data migration is needed. Reverting the UI change restores the former shortcut and slot presentation.
