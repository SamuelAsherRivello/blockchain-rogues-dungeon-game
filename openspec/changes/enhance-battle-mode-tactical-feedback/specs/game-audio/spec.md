# Spec Delta

## ADDED Requirements

### Requirement: Select soundtrack by game mode
The soundtrack SHALL select Spooky Dungeon for General and JRPG - End Dungeon for Battle, retaining the third bundled track and its provenance. Mode transitions SHALL crossfade over 0.5 seconds, pause the outgoing track, and resume each incoming track's retained playback position. Rapid reversals SHALL fade from current gains. Music volume, Mute All, and mute=1 SHALL apply throughout.

#### Scenario: Change modes twice
- **WHEN** General transitions to Battle and back
- **THEN** each transition takes 0.5 seconds and General resumes its retained position

#### Scenario: Reverse during a fade
- **WHEN** the mode reverses before its fade completes
- **THEN** the next fade starts from current gains without restarting either track

#### Scenario: Enforce silent testing
- **WHEN** the page opens with mute=1
- **THEN** neither track plays regardless of mode or saved preferences
