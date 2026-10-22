# Proposal

## Why

Inventory rows do not show whether their items belong in Quick Slots or Equipment, and empty destinations lose their category accents. Matching item strips and destination colors will help players identify where to drag an item before starting a gesture.

## What Changes

- Apply Proposal C's category palette throughout slot UI: Ability purple `#c0aaff`, Quick green `#79c878`, and Equipment blue `#67b7e8`.
- Add a narrow vertical strip to the left edge of every occupied Inventory row, based on the item's destination category. Both rows of a two-position item share its category color.
- Show matching strips on filled and empty Ability, Quick, and Equipment slots. Keep generic empty Inventory rows neutral until a valid return drag hovers them.
- Reuse shared palette constants in slot rows, pointer previews, valid landing feedback, and existing Ability and Quick status-bar key accents.
- Keep category identity visible when activation is unavailable, while labels, costs, and hotkeys retain disabled feedback. Color identifies a category; the existing compatibility and capacity rules decide whether a drop is legal.
- Replace the Quick Slots specification's neutral-color requirement with green category accents. Preserve slot counts, labels, stacking, equipment groups, time costs, and saves.
- Compare colors with status-bar movement blue, resource colors, and positive/negative stat feedback. Retain neutral text and dark row fills for readability, with a separate outline for valid hovered destinations.

## Capabilities

### New Capabilities

- `slot-presentation`: Shared semantic palette, consistent category cues on slot rows and controls, and readable category versus availability states.

### Modified Capabilities

- `inventory-management`: Show a destination-category strip on occupied Inventory rows.
- `quick-slots`: Replace neutral Quick Slot styling with the green category accent.
- `drag-and-drop-feedback`: Preserve category cues in pointer previews and use category colors for valid landing feedback.

## Impact

The work affects React slot rendering in `rogues-dungeon/src/game/game.tsx`, `rogues-dungeon/src/game/controls/item-drag-preview.tsx`, the shared UI palette and CSS, inventory documentation, and browser presentation coverage. No new dependency or save migration is needed. Existing Weapons/Armor distinctions and action validation remain authoritative. Ability items are not added to Inventory.

Playwright adds useful evidence for computed colors, hover validity, clipping, and unavailable states. Select one focused muted Edge check after the UI implementation group, plus the project's required Edge desktop and in-app browser contexts. Reserve the full applicable browser suite for finalization. Do not launch browsers during proposal.

The working tree contains other ongoing work, including movement/cursor changes. Implementation must preserve it and keep this change scoped to slot presentation. There are no unresolved product decisions; strip width and neutral return-target treatment are proposed design defaults recorded in design.md.
