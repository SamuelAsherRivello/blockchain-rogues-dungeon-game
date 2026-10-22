# Design

## Context

See proposal.md for the motivation. `SlotItem` in `rogues-dungeon/src/game/game.tsx` renders all slot rows and exposes separate presentation and semantic slot types. Ability rows and the drag preview duplicate a purple literal; CSS defines purple and green variables but no Equipment category color. Empty and unavailable selectors gray the visible content. Landing feedback is globally green and departure feedback uses a purple border.

The same shared row renderer appears in landscape and portrait information panels. Inventory stacks consumables and renders a second row for two-position gear. The status-bar controls already use purple for abilities and green for Quick Slots, alongside blue movement and orange utility keys. The separate `interaction-colors.ts` palette belongs to world reticles and paths and is outside this change.

The durable Quick Slots requirement describes neutral rows labeled 01/02 and `Name XN`, while the inspected UI uses Q/E and `Name x N`. Its delta preserves the existing visible label and quantity format instead of introducing a label change during color work. The old requirement title remains an exact-match delta key; its neutral-color wording is superseded by the user's explicit green requirement. Other older spec/code differences, including occupied equipment swaps and ability count, are outside this change.

## Goals / Non-Goals

Goals are to keep one palette owner across React and CSS, distinguish an item's destination category from the row that contains it, and make category cues independent of activation availability.

Non-goals include domain action changes, new Inventory ability items, item rarity colors, resource recoloring, mouse cursor policy, save migration, and renderer work. The active movement/cursor proposal can continue to use the same validated drag result independently.

## Decisions

### Palette and representation

| Category | Constant value | Representations |
| --- | --- | --- |
| Ability | `#c0aaff` | Filled/empty slot strip, ability preview and valid reorder outline, available 1-3 key accents |
| Quick | `#79c878` | Potion Inventory strip, filled/empty Quick strip, preview and valid landing outline, available Q/E accents |
| Equipment | `#67b7e8` | Weapons/Armor Inventory and slot strips, preview and valid landing outline |

Add `rogues-dungeon/src/ui/slot-colors.ts` with immutable `SLOT_COLORS`. Publish its values as CSS custom properties on the shared game-screen ancestor, where slot panels, controls, and pointer previews inherit them. `SlotItem` consumes a category custom property, and status keys consume the same palette variables. Replace duplicated category hex literals in CSS and React rather than maintaining parallel maps. Derivative hover fills can mix the category variable with the dark background. A CSS-only palette was considered, but exported constants provide the requested shared values to both render callers and styles without reading computed styles.

Keep destination category separate from `data-slot-type="inventory"`; do not rewrite container identity or drag selectors to add color. Derive Inventory category from the existing consumable predicate before considering Equipment group, since consumables can carry item fields unrelated to destination compatibility. Pass the same category to the pointer preview and both displayed rows of two-position gear. Ability reordering uses its existing ability-source branch. No new transfer path is added.

### Persistent identity and transient validity

Proposed default: a 3px strip within each row's existing outer bounds, with explicit left content padding. Use a pseudo-element or inset treatment that does not intercept input and does not reuse the shine animation's `::after`. Filled and empty destination rows use the same strip, leaving text cream and row fills dark. Empty Inventory rows have no fixed category; a legal return hover receives the dragged item's category outline.

Keep the strip independent of disabled label styles, so an empty Ability target or full-resource potion remains recognizable. An unavailable action is still gray and guarded. Source opacity and dashed departure styling can remain, but use its own category color instead of purple for every source. The valid hover adds a separate 2px outline using the accepted destination's category, or source category for Inventory returns. Persistent strip visibility must not imply validity. Use the existing validation result for Equipment, Quick, and Ability gestures; do not recalculate legality from colors or loosen occupied-target rules.

Using colored row fills was considered, but strips preserve contrast for item names, costs, hotkeys, and modifier icons. A universal green landing outline was rejected because it would compete with green's new Quick category meaning.

### Status-bar and resource comparison

Reuse existing Ability purple and Quick green exactly. Equipment blue is brighter than movement blue `#5ba9d6` and defense blue `#5b9ed1`, but these hues are similar; a color adjustment alone does not establish semantic separation. Keep movement keys labeled in the status bar, Equipment under its own title and Weapons/Armor subheadings, and defense beside its resource icon. Keep status-bar outline `--border-color` and fill `--surface-color`, plus positive/negative stat feedback, unchanged. Purple also resembles Mana and green resembles Stamina, so labels and geometry remain necessary cues.

Verify computed contrast against the actual row and pressed-key backgrounds during the focused check. Target at least 3:1 for category indicators against their adjacent dark backgrounds and 4.5:1 for enabled small text. Treat disabled text separately. If a pressed fill reduces enabled text contrast, adjust the fill strength or neutral text color, keeping the category values stable. This avoids recoloring unrelated controls on the assumption that similar hues alone are a readability failure.

### Verification boundary

After the implementation group, run one focused Playwright CLI scenario with Microsoft Edge at the muted URL. Stage potions, one-position gear, two-position gear, filled/empty category slots, and an unavailable activation state. Check computed strip colors, valid and incompatible hovered targets, previews, returns, cancellation, status-bar accent equality, and contrast. Check landscape, portrait information view, and fullscreen within that scenario. Reuse existing fixture/save helpers and existing valid transaction rules; do not add production debug controls.

Follow `rogues-dungeon/AGENTS.md` for the additional desktop Edge and in-app browser visual checks using the same single owned server. Run `npm test` and `npm run typecheck`. Stop that server before the full applicable configured browser suite at finalization. Capture capability failures separately from failed assertions. Prefer observable rendered behavior over new source-regex tests for color literals.

## Risks / Trade-offs

- Blue does not distinguish Weapons from Armor. Keep group labels and existing incompatible-drop rejection and test an armor-to-Weapons hover.
- Disabled and shine selectors can erase the strip or overwrite the landing outline. Keep cue layers separate and check those combined states in the focused browser scenario.
- A two-position item can lose its category on its secondary row. Derive category from the shared item before row expansion.
- Ongoing changes touch `game.tsx` and `style.css`. Apply scoped edits against the current contents and preserve unrelated work.

## Migration Plan

Introduce the palette and category propagation, update row and gesture styles, then verify the visible behavior and update inventory documentation. Existing campaigns need no migration because category colors derive from current items and bindings. Rollback consists of reverting this change's UI and palette edits while retaining unrelated work.
