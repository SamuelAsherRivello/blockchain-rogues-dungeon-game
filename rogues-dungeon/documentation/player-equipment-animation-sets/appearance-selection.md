# Player appearance selection

The pure selector `heroWarriorAppearanceForEquipment` reads only the committed
Weapons and Armor arrays. It does not read Inventory, Quick Slots, abilities,
Jewels, drag previews, item names, category, modifiers, or compatibility metadata.

| Weapons occupied | Armor occupied | Appearance |
| --- | --- | --- |
| Yes | Yes | Set 1, sword and shield |
| Yes | No | Set 2, sword only |
| No | Yes | Set 3, shield only |
| No | No | Set 4, neither |

Either occupied position counts. An item spanning two positions does not change
the result. A shield placed in Weapons enables sword artwork, as requested.
This changes the presentation rule only; it does not reclassify equipment.

`createHeroWarriorVisualFrames` resolves each appearance, clip, and frame index
without owning an animation clock. A switch therefore retains fractional frame
time, speed, loop progress, stopped state, and one-shot completion. Sheet-backed
frames have qualified atlas keys so their common PNG path cannot collapse them
into a single frame. Missing mappings and invalid crop dimensions throw explicit
errors.

`createHeroWarriorAppearanceSelection` derives live appearance from committed
equipment and holds the fatal appearance through death. It clears that hold
when the replacement actor begins, allowing empty equipment to show set 4.
Appearance has no new save field.

The renderer now uses this selector with the committed campaign, retaining the
existing actor handles and one shared playback clock. All thirty additional
runtime strips were published only after the shared skill's acceptance checks
passed.

Run the focused selector checks from the repository root:

```text
node --import tsx --test rogues-dungeon/test/hero-warrior-appearance.test.ts
node --import tsx --test rogues-dungeon/test/hero-warrior-visual-frames.test.ts
```
