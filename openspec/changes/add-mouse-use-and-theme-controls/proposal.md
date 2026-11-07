# Proposal

## Why

Ability and quick-slot rows can already be clicked, but their dual role as drag sources makes activation hard to discover. Theme selection also requires a keyboard shortcut even when developer settings are visible.

## What Changes

- Rename the desktop developer settings heading to `(D.Set.)` and add a theme button showing the active theme as `T:1`, `T:2`, or `T:3`; remove the T keyboard shortcut.
- Show a clear `Use` button after the item name on populated ability and quick-slot rows. Preserve current row-click activation, keyboard shortcuts, availability rules, and drag-and-drop behavior.
- Keep empty slots free of a Use button and show unavailable actions as disabled.
- Use a focused Playwright check during implementation because the click, drag, and layout behavior is browser-visible; reserve the broader required browser checks for finalization.

## Capabilities

### New Capabilities

- `slot-mouse-activation`: Discoverable mouse activation for ability and quick-slot rows.
- `developer-theme-control`: Developer settings control for cycling the dungeon theme.

### Modified Capabilities

None.

## Impact

The desktop developer settings, shared slot presentation, ability and quick-slot interactions, styles, and relevant tests are affected. Existing gameplay rules and save data are unchanged. The mobile information panel uses the shared slot presentation and must remain usable.
