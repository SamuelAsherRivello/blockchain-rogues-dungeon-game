# Proposal

## Why

Rogue's Dungeon has a growing set of sound cues, but the event inventory is spread across code and audio provenance notes. A player-facing and UI-facing catalog will make the current coverage, intended future coverage, naming policy, and reuse choices clear before new sounds are selected or created.

## What Changes

- Add a Markdown audio-event catalog under `rogues-dungeon/documentation/`.
- Separate game-view events from UI events and list current, planned, and future-only events in alphabetical order within each section.
- For each event, record the current filename or a dash, a proposed PascalCase filename, and a note on whether a small playback-rate variation is appropriate.
- Define `{Domain}{Variety}{Index}.{ext}` as the naming pattern for newly added sound assets, such as `UiClickAffirmative01.wav`.
- Document that the game currently uses browser `Audio` handles, where `playbackRate` can vary pitch and duration together; do not migrate audio playback to Babylon Lite as part of this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change documents proposed coverage and naming without changing player-visible audio behavior.

## Impact

- Adds `rogues-dungeon/documentation/audio-events.md`.
- References the existing audio catalog in `rogues-dungeon/documentation/audio.md` and the current mappings in `rogues-dungeon/src/systems/audio/audio-system.ts`.
- Does not add dependencies, assets, runtime audio events, or browser verification work.
