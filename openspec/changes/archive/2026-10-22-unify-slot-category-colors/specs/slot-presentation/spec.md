# Spec Delta

## Purpose

Help players match carried items to destination categories through consistent slot colors while distinguishing category identity from activation and drop availability.

## ADDED Requirements

### Requirement: Present consistent slot category colors
Ability slots SHALL use purple `#c0aaff`, Quick Slots green `#79c878`, and Equipment slots blue `#67b7e8`. Filled and empty category slots SHALL show a vertical strip at their left edge. Existing Ability and Quick status-bar key accents SHALL use the corresponding category color when available.

#### Scenario: Recognize empty destinations
- **WHEN** Ability, Quick, and Equipment positions are empty
- **THEN** their left strips remain purple, green, and blue respectively, with centered empty markers and existing positional labels

#### Scenario: Match controls to slots
- **WHEN** Ability and Quick controls are available in the collapsed or expanded status-bar controls
- **THEN** their key accents match the corresponding slot category colors

### Requirement: Separate category identity from action availability
A category strip SHALL remain visible when a slot cannot currently activate. Existing disabled labels and controls SHALL continue to indicate unavailable actions. A category color alone SHALL NOT indicate a valid hovered drop. Panel titles, item names, positional labels, and drop feedback SHALL provide cues in addition to color.

#### Scenario: Show an unaffordable ability
- **WHEN** a populated Ability slot has insufficient Mana
- **THEN** its purple strip identifies its category while its activation content remains greyed and activation remains unavailable

#### Scenario: Show an unusable potion
- **WHEN** a Quick Slot contains a potion for a full resource
- **THEN** its green strip remains visible while its use action remains unavailable under the existing rules

### Requirement: Keep category cues readable across layouts
Category strips and valid landing outlines SHALL remain distinct against the dark slot backgrounds without obscuring names, costs, hotkeys, empty markers, or drag handles. The same category mapping SHALL apply in landscape, portrait information panels, and fullscreen. Status-bar structure and resource-meter meanings SHALL retain their existing treatments.

#### Scenario: Read slots in portrait and fullscreen
- **WHEN** the player views the information panels in portrait or enters fullscreen
- **THEN** strips stay aligned to row edges and the row content remains readable without overlap
