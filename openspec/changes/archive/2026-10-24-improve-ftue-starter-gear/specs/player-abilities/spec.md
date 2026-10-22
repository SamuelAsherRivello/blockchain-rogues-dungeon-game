# Spec Delta

## MODIFIED Requirements

### Requirement: Provide four positional ability bindings
Abilities SHALL retain their three existing positions without group titles. A newly created or post-death replacement run SHALL initialize positions 01–03 empty. Keyboard keys 1–3 and matching mobile buttons SHALL activate the ability in the corresponding position after an ability is assigned. Empty positions SHALL not activate an action.

#### Scenario: Activate by position
- **WHEN** Heal has been assigned to position 01 and the player presses 1
- **THEN** Heal is requested

#### Scenario: Press an empty binding
- **WHEN** the player presses any ability binding in a new run before assigning an ability
- **THEN** no action, Mana cost, message, or world tick occurs
