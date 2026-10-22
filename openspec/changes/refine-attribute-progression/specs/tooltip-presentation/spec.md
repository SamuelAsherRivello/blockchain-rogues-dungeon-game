# Spec Delta

## ADDED Requirements

### Requirement: Describe attribute adjustment results
Attribute adjustment arrow tooltips SHALL describe the resulting attribute value without displaying a raw point delta in parentheses.

#### Scenario: Hover an increase arrow
- **WHEN** the player hovers an enabled attribute increase arrow
- **THEN** the tooltip reads the attribute name and resulting value, such as `Increase Perception to 5.`, without a `(+1)` suffix

#### Scenario: Hover a decrease arrow
- **WHEN** the player hovers an enabled attribute decrease arrow
- **THEN** the tooltip reads the attribute name and resulting value, such as `Decrease Perception to 4.`, without a `(-1)` suffix

#### Scenario: Preserve gameplay help text
- **WHEN** the player hovers an attribute label
- **THEN** the existing plain-language gameplay-effect tooltip remains available independently of the arrow result tooltip
