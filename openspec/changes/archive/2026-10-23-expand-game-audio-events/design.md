# Design

## Context

See `proposal.md` for motivation. Current filenames and event mappings live in the audio system, while provenance and audible intent live in `documentation/audio.md`. The two sources do not give a single, complete view of present and future audio coverage.

## Goals / Non-Goals

**Goals:**

- Give audio selection work one alphabetized catalogue of game-view and UI events.
- Preserve a factual distinction between an implemented mapping, an available but unused asset, and a proposed future cue.
- Make newly acquired filenames predictable without renaming current bundled assets.
- Identify repeat cues where modest `HTMLAudioElement.playbackRate` variation can reduce repetition.

**Non-Goals:**

- Add, rename, remove, or convert sound files.
- Alter game events, introduce door or barrel-break mechanics, or wire new runtime cues.
- Replace native browser audio with the Babylon Lite audio engine.
- Promise that every catalogued future event will receive an asset.

## Decisions

### Maintain one dedicated planning catalogue

Create `rogues-dungeon/documentation/audio-events.md` rather than expanding `audio.md`. The existing document remains the asset provenance and current playback guide. The new document becomes the decision record for coverage, filenames, and potential follow-up work.

Alternatives considered:

- Expand `audio.md`. Rejected because its provenance tables would mix shipped facts with proposals.
- Encode the entire catalog in the audio system. Rejected because the proposed entries have no runtime behavior yet.

### Separate game-view and UI event rows

The catalog will have a game-view section for events occurring in the dungeon and a UI section for menus, inventory, character creation, and progression choices. Each section is alphabetized by event name. Rows will include the event, its current filename or `-`, its proposed filename, and a pitch-variation note.

### Preserve existing asset names and name additions predictably

Do not rename current assets during a planning-only change. New assets will follow `{Domain}{Variety}{Index}.{ext}` with a two-digit index beginning at `01`. The domains are `Game` and `Ui` so runtime and catalog categories remain obvious.

### Use playback-rate variation only for short repeat effects

The catalog will recommend a small range, normally `0.97` through `1.03`, for effects such as footsteps, crate impacts, and UI clicks. The existing browser-audio manager can use `HTMLAudioElement.playbackRate`; variation changes both pitch and duration. Distinct feedback such as death, level gains, and abilities will retain a fixed rate.

## Risks / Trade-offs

- [A proposed filename can be mistaken for a shipped asset] → Every row states the actual current filename separately and uses `-` where no asset is wired.
- [Pitch variation may weaken recognition or timing] → Restrict it to short repeated cues and record fixed-rate exceptions.
- [The catalog can fall out of date] → Require implementation changes that add or rename audio events to update both the catalog and provenance documentation.

## Migration Plan

1. Add the catalog without modifying existing files.
2. Use its rows to select and approve future assets and event mappings.
3. Update the catalog and `audio.md` in the same change whenever a new cue becomes shipped.
