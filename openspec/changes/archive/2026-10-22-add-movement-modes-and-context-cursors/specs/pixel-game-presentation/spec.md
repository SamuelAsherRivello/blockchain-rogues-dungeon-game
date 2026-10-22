# Spec delta

## MODIFIED Requirements

### Requirement: Arrange titlebar controls and counters
The titlebar SHALL order title, centered World/Dungeon Level space, Time/Keys/Gold, Zoom, Camera, Movement, Fullscreen, and Settings. Zoom, Camera, Movement, and Settings SHALL have icons without text labels, retaining accessible names and dropdown values. Movement SHALL use a simple monochrome walking-person silhouette matching the utility icons, outside Dev Settings. Dividers SHALL NOT appear between Time/Keys/Gold or Camera/Movement/Fullscreen/Settings.

#### Scenario: Read the titlebar
- **WHEN** the game is running
- **THEN** World/Dungeon Level is centered between title and Time, Settings is at the far right, and the counters have no separating divider lines

#### Scenario: Select movement
- **WHEN** the player opens Movement immediately to the right of Camera
- **THEN** Grid-snap, Grid-tween, and Gridless are available with an accessible Movement mode label and explanatory tooltip
