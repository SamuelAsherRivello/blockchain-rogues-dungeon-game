# game-audio Specification

## Purpose

Give Cryptbound adjustable, restrained audio feedback for dungeon actions and interface operations while making silent automated browser sessions reliable and documenting the bundled music assets.

## Requirements

### Requirement: Independent audio levels
Settings SHALL expose separate SFX and Music volume controls from 0 through 100 and a Mute All control. The levels and mute state SHALL persist across reloads for ordinary sessions.

#### Scenario: Adjust and restore levels
- **WHEN** a player changes either level or Mute All and reloads Cryptbound
- **THEN** the selected values and mute state are restored independently

#### Scenario: Zero volume
- **WHEN** either volume is set to 0
- **THEN** sounds on that bus are silent while the other bus remains governed by its own level

### Requirement: Silent AI URL override
Opening Cryptbound with the query argument `?mute=1` SHALL silence every audio bus for the lifetime of that page session, regardless of saved settings or later control changes. The project documentation SHALL show this argument for silent AI testing.

#### Scenario: AI opens a muted session
- **WHEN** a browser opens Cryptbound with `?mute=1`
- **THEN** no music or sound effect is audible, including sounds triggered by later interaction

#### Scenario: Ordinary session
- **WHEN** Cryptbound opens without `mute=1`
- **THEN** saved audio preferences govern playback and the player can change them in Settings

### Requirement: Locally bundled, sourced music
Cryptbound SHALL provide three free, loopable dungeon music tracks under its public audio music assets and record each track's author, source, and license in project documentation. Track acceptance SHALL include listening in context for a non-repetitive, non-intrusive experience and checking the loop transition.

#### Scenario: Music assets and provenance
- **WHEN** a player starts an ordinary session with music enabled
- **THEN** the game can play the bundled tracks without a remote runtime request, and project documentation identifies their sources and licenses

#### Scenario: Track review
- **WHEN** a candidate track is considered ready for release
- **THEN** its loop transition and repetitiveness have been checked by listening in the game context

### Requirement: Event-based sound cues
Cryptbound SHALL use a restrained catalog of 4 to 10 event-based sound effects and classify each cue as diegetic or non-diegetic in project documentation. A cue SHALL play only for its corresponding event and obey its bus volume and Mute All state.

#### Scenario: Diegetic game event
- **WHEN** a listed world action or combat event occurs
- **THEN** its documented diegetic cue may play once for that event, subject to audio settings

#### Scenario: Equipment drag result
- **WHEN** an equipment drag is accepted or rejected
- **THEN** the corresponding documented non-diegetic confirmation or rejection cue plays, subject to audio settings

#### Scenario: Level gain
- **WHEN** an XP award increases the character level
- **THEN** the documented non-diegetic level-gain chime plays once, subject to audio settings

#### Scenario: Muted event
- **WHEN** any documented event occurs while its bus or Mute All is muted
- **THEN** gameplay proceeds normally without audible output

The initial cue inventory is:

| Classification | Event | Cue intent |
|---|---|---|
| Diegetic | Player moves one tile | Quiet, short stone footstep; avoid a continuous walking loop |
| Diegetic | Player hits an enemy | Brief weapon impact |
| Diegetic | Enemy hits the player | Muted impact with light armor variation |
| Diegetic | Enemy is defeated | Short fall or dissolve cue |
| Diegetic | Potion is collected | Small glass and liquid chime |
| Diegetic | Chest opens | Brief latch and hinge sound |
| Diegetic | Player enters stairs to descend | Stone mechanism and short descending transition |
| Non-diegetic | Character gains a level | Clear, brief chime paired with the inward sparkle celebration |
| Non-diegetic | Compatible equipment drop is accepted | Quiet confirmation click |
| Non-diegetic | Equipment drop is rejected | Soft, short rejection tick |
| Non-diegetic | Ability activation succeeds | Brief UI confirmation |

The initial music candidates are:

| Track | Author | Source and license | Loop evidence |
|---|---|---|---|
| Spooky Dungeon | Memoraphile / You're Perfect Studio | [OpenGameArt](https://opengameart.org/content/spooky-dungeon), CC0 option listed | Tagged loopable and seamless |
| JRPG - End Dungeon | HydroGene | [OpenGameArt](https://opengameart.org/content/jrpg-end-dungeon), CC0 | Author says it is loopable |
| Dungeon 04 | Beau Buckley / Fantasy Musica | [OpenGameArt](https://opengameart.org/content/dungeon-04), CC BY-SA 4.0 | OGG metadata is provided to ensure correct looping |
