# Spec Delta

## MODIFIED Requirements

### Requirement: Celebrate a level gain
Crossing a level threshold SHALL present sparkles converging on the player from surrounding directions, merge them on the player, and play the documented level-gain chime once after the merge. The celebration SHALL not stop the world or require an immediate allocation.

#### Scenario: Gain a level during play
- **WHEN** an XP award increases the character level
- **THEN** sparkles arrive from surrounding directions, merge on the character, and the level-gain chime plays once after the convergence

### Requirement: Award experience and stat choices
Successful attacks, enemy defeats, discoveries, first opens of chests or crates, and a first arrival at a Dungeon Level SHALL award configured experience exactly once per qualifying event. Movement, waiting, and reused world objects SHALL not award experience. Each level threshold SHALL increase level by one through level 99, retain excess experience, and grant three unspent Attribute Points. Attribute Points SHALL persist until committed in Progression and SHALL not advance a tactical turn.

#### Scenario: Level up
- **WHEN** earned experience crosses a level threshold below level 99
- **THEN** level increases by one, excess experience remains toward the next threshold, three Attribute Points become available, and the player sees the level and newly available point count

#### Scenario: Award a one-time world reward
- **WHEN** the player opens a particular chest or crate, records a discovery, or first arrives at a Dungeon Level
- **THEN** that source grants its configured experience once and cannot grant it again from reuse

#### Scenario: Attack an enemy
- **WHEN** the player successfully attacks an enemy
- **THEN** the attack grants its configured experience and the normal tactical turn resolves once

#### Scenario: Spend Attribute Points
- **WHEN** the player confirms a valid Progression allocation
- **THEN** each selected attribute increases by its confirmed amount, the matching number of Attribute Points is spent, and displayed time does not advance

#### Scenario: Preview an allocation
- **WHEN** the player adjusts a draft allocation or closes Progression without confirmation
- **THEN** committed attributes and Attribute Points remain unchanged, and the dialog shows only the aggregate pending gameplay benefits for attributes with draft points

## ADDED Requirements

### Requirement: Summarize pending attribute benefits
Progression SHALL show the remaining allocation count in the form `Spend N of 3 attribute points.` above the attribute controls. The Progression window title SHALL be `Level Up — Character`. Below the attribute controls, Progression SHALL show an `Earned Results` heading and a borderless results field that is always three lines tall. The results field SHALL remain empty until points are drafted, SHALL show only attributes with pending points as body-text bullets, and SHALL combine all pending points for one attribute into one plain-language total-effect line. Health SHALL be expressed as the projected percentage increase in maximum Health. Strength and Stealth SHALL use an explicit placeholder such as `No gameplay effect yet.` while their effects remain unimplemented.

#### Scenario: Show no pending benefits
- **WHEN** Progression opens with no draft allocation
- **THEN** the window title reads `Level Up — Character`, the allocation count reads `Spend 3 of 3 attribute points.`, the `Earned Results` heading is present, and the three-line results field is empty

#### Scenario: Aggregate one attribute
- **WHEN** the player assigns multiple pending points to one attribute
- **THEN** the earned-results count is one and the results field shows one bullet for that attribute containing the combined pending gameplay effect rather than one bullet per point

#### Scenario: Show only affected attributes
- **WHEN** the player assigns points to some but not all attributes
- **THEN** the earned-results count equals the number of distinct affected attributes and the results field contains no bullets for attributes without pending points

#### Scenario: Preview an unimplemented effect
- **WHEN** the player assigns pending points to Strength or Stealth
- **THEN** the corresponding summary line explicitly states that the gameplay effect is not implemented yet
