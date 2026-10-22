# Spec Delta

## MODIFIED Requirements

### Requirement: Reevaluate enemy detection after relevant changes
Automatic detection SHALL update when player or enemy positions, effective Perception, sight blockers, or the active floor change. Detected-enemy presentation SHALL remain separate from authoritative enemy simulation. Exploration fog SHALL be an independent presentation mask rather than an additional detection statistic or a persistent enemy reveal.

#### Scenario: Increase Perception
- **WHEN** confirmed progression raises Perception enough to include an enemy with clear line of sight
- **THEN** detection updates without requiring a movement turn

### Requirement: Hide enemies until perceived
An enemy SHALL expose a sprite, shadow, minimap marker, tooltip, silhouette, or identifying combat cursor only while it currently satisfies both Perception range and line of sight, subject also to the view's independent exploration mask. Losing either detection condition SHALL hide all such presentation again, including stale hover disclosures. Detection SHALL NOT retain a persistent reveal or last-known marker. The enemy SHALL remain active for collision, enemy actions, and awareness-based Battle activation. Hidden presentation SHALL not remove the authoritative enemy from the floor.

#### Scenario: Enemy appears in the viewport before detection
- **WHEN** an enemy is inside the visible screen area but has not been perceived
- **THEN** its sprite and shadow remain hidden and its location is not revealed by a minimap marker, tooltip, silhouette, or identifying cursor

#### Scenario: Hidden enemy triggers Battle
- **WHEN** an undetected enemy qualifies under its awareness range
- **THEN** it can act and trigger Battle while its identifying presentation remains hidden

#### Scenario: Previously detected enemy leaves range
- **WHEN** a detected enemy moves outside current Perception range while line of sight remains clear
- **THEN** all identifying presentation hides again without a last-known marker
- **AND** collision, enemy actions, and awareness-based Battle evaluation continue

#### Scenario: Previously detected enemy loses line of sight
- **WHEN** a detected enemy remains within Perception range but a wall or closed door blocks line of sight
- **THEN** all identifying presentation hides again, including any open tooltip or identifying cursor
- **AND** the loss of player detection alone does not end Battle

#### Scenario: Reacquire a hidden enemy
- **WHEN** a previously detected enemy again satisfies both current Perception range and line of sight
- **THEN** its detected presentation becomes eligible again without a separate detection-discovery action
- **AND** enabled exploration fog still conceals it if its occupied cell is unknown

## ADDED Requirements

### Requirement: Keep detection independent from lighting and Render Test
Scene brightness, player light direction, exploration state, and Render Test mode SHALL NOT change calculated enemy detection, awareness, or Battle activation. Presentation SHALL still obey enabled exploration masking and existing detection restrictions. Disabling fog or lighting SHALL NOT grant omniscient enemy presentation.

#### Scenario: Compare a bright and dim enemy tile
- **WHEN** an enemy's position, Perception range, and line of sight remain unchanged while illumination changes
- **THEN** its calculated detection state remains unchanged

#### Scenario: Cycle Render Test
- **WHEN** Render Test cycles through all four values without a gameplay action
- **THEN** detected enemy identities, enemy awareness, and Battle activation remain unchanged
- **AND** enemies failing detection remain unidentified even with both effects off

#### Scenario: Perceive an enemy outside exploration knowledge
- **WHEN** an enemy satisfies detection but its occupied cell is undiscovered
- **THEN** enabled fog conceals its world presentation without adding or removing its calculated detection
- **AND** exploration is not expanded solely because that enemy was detected

#### Scenario: Walk toward a concealed enemy with the mouse
- **WHEN** a mouse walking selection targets or approaches a cell containing a concealed enemy
- **THEN** it can use neutral white navigation presentation without an identifying attack cursor, tooltip or enemy marker
- **AND** that walking selection does not authorize or queue an attack on the concealed enemy
- **AND** collision, enemy detection, awareness and enemy simulation retain their existing rules
