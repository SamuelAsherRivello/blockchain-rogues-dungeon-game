# Spec Delta

## MODIFIED Requirements

### Requirement: Project-defined viewport
The template SHALL fit and center a viewport within the full browser surface using finite positive project-defined CSS-pixel aspect bounds. A project MAY define one fixed ratio or an orientation-consistent inclusive ratio range. For a range, the fitted viewport SHALL use the available surface ratio when it is within the range and the nearest range endpoint otherwise. It SHALL support portrait, landscape, and square orientations and report actionable errors for invalid, inverted, nonfinite, or orientation-inconsistent bounds.

#### Scenario: Orientation and resizing
- **WHEN** a project selects a fixed or ranged portrait, landscape, or square orientation and the browser resizes or enters fullscreen
- **THEN** its viewport uses the selected fixed ratio or the applicable ranged ratio, fits the available surface, and centers with equal opposing gutters

#### Scenario: Fixed-ratio orientation and resizing
- **WHEN** a project selects portrait 9:16, landscape 16:9, or square 1:1 and the browser resizes or enters fullscreen
- **THEN** its viewport preserves the selected ratio, fits the available surface, and centers with equal opposing gutters

#### Scenario: Ranged orientation and resizing
- **WHEN** a project selects a landscape 16:10 through 16:9 range or a portrait 9:16 through 10:16 range and the browser resizes or enters fullscreen
- **THEN** its viewport matches the available ratio within that range and otherwise uses the nearest endpoint while fitting and centering within the available surface

#### Scenario: Invalid configuration
- **WHEN** ratio bounds are zero, negative, nonfinite, inverted, or inconsistent with the declared orientation
- **THEN** the template reports an actionable configuration error rather than silently distorting the viewport
