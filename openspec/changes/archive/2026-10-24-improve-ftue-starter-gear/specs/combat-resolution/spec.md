# Spec Delta

## MODIFIED Requirements

### Requirement: Meet the floor-one encounter target
A newly created or post-death character SHALL begin with no equipped weapon and cannot make a melee attack until an attack-capable weapon is assigned. The nearby Wooden Stick SHALL grant `+1` Offense, remain weaker than every other attack-capable weapon, and enable deterministic melee after assignment.

#### Scenario: Evaluate the opening encounter
- **WHEN** a fresh character bumps an adjacent enemy before assigning an attack-capable weapon
- **THEN** no melee damage, Stamina cost, combat animation, world tick, or enemy phase occurs

#### Scenario: Arm with the starter weapon
- **WHEN** the player collects and assigns the nearby Wooden Stick
- **THEN** the character has `+1` Offense from that weapon and can make deterministic melee attacks
