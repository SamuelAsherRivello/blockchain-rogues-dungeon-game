# Spec Delta

## MODIFIED Requirements

### Requirement: Isolate the development compatibility reset
When an incompatible development change invalidates game data, the compatibility mechanism SHALL clear every localStorage key on the game origin once for the new epoch. It SHALL preserve records subsequently created under that epoch. Normal same-epoch save and recovery behavior SHALL continue after initialization.

#### Scenario: Enter the new development epoch
- **WHEN** the game first starts with a new incompatible epoch and prior game data or an older epoch exists
- **THEN** all localStorage keys on the origin are cleared before the new epoch is recorded

#### Scenario: First visit on a shared origin
- **WHEN** there is no prior game data or compatibility epoch
- **THEN** the current epoch is recorded without deleting other origin data

#### Scenario: Reload a new Jewel campaign
- **WHEN** the game reloads after a Jewel campaign has been saved under the new epoch
- **THEN** the campaign remains stored and no second compatibility reset occurs
