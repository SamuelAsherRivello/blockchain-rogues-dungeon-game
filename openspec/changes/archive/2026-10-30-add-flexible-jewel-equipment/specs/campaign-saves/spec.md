# Spec Delta

## ADDED Requirements

### Requirement: Persist both Jewel positions and Jewel instances
Supported campaigns SHALL save and restore both Jewel positions and Jewel instances in Inventory, generated or dropped floor state, container rewards, and applicable recovery snapshots. Instance identity, definition, fixed modifiers, and location SHALL be retained. Loading and normalization SHALL NOT discard the Jewels group or double-apply its effects.

#### Scenario: Reload a mixed Jewel loadout
- **WHEN** Silver Ring of Vigor and Sapphire Amulet are equipped, Gold Guard Bracelet is carried, and Prismatic Amulet is dropped before saving
- **THEN** reload restores those locations and identities with the expected Health, Mana, and Defense effects and the same ground graphic

#### Scenario: Restore modes without Jewel-specific exceptions
- **WHEN** Classic death, Adventure replacement, or Journey checkpoint recovery occurs
- **THEN** Jewel ownership follows that mode's existing item-retention rules and creates no extra item copies or persistent Jewel buffs

### Requirement: Initialize missing Jewel groups safely
A supported record within the active compatibility epoch that lacks a Jewels group SHALL initialize exactly two empty Jewel positions without changing existing Weapons, Armor, Inventory, abilities, Quick Slots, progression, or resources. Fresh campaigns and fresh replacement runs SHALL initialize both positions empty.

#### Scenario: Load a supported pre-Jewel record
- **WHEN** a supported record has valid Weapons and Armor but no Jewels group
- **THEN** it gains two empty Jewel positions and preserves its remaining committed state

### Requirement: Isolate the development compatibility reset
When this change's incompatible generation balance becomes active, the existing development compatibility mechanism SHALL clear only `rogues-dungeon.` storage once for the new epoch. It SHALL preserve unrelated origin data and records subsequently created under that epoch. Normal same-epoch save and recovery behavior SHALL continue after initialization.

#### Scenario: Enter the new development epoch
- **WHEN** the game first starts with the new epoch and older incompatible game keys exist
- **THEN** only game-namespaced keys are cleared before the new epoch is recorded

#### Scenario: Reload a new Jewel campaign
- **WHEN** the game reloads after a Jewel campaign has been saved under the new epoch
- **THEN** the campaign remains stored and no second compatibility reset occurs
