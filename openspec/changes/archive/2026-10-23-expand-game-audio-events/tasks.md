# Tasks

## 1. Build the audio-event catalog

- [x] 1.1 Create `rogues-dungeon/documentation/audio-events.md` with alphabetized Game and UI sections that list implemented events, current filenames, proposed PascalCase filenames, and pitch-variation guidance; verify every current filename matches `src/systems/audio/audio-system.ts` or is shown as `-`.
- [x] 1.2 Include proposed game-view rows for unwired events such as player death, XP gain, stat upgrades, doors, barrel breaking, and invalid movement without claiming that the corresponding mechanics exist; verify each proposal is visibly distinct from implemented audio.
- [x] 1.3 Include direct UI behavior and audio-manager behavior, including menu clicks, character rerolls, equipment outcomes, quick-slot outcomes, and player audio controls; verify the UI rows are alphabetized and separate from game-view rows.

## 2. Record naming and variation guidance

- [x] 2.1 Document `{Domain}{Variety}{Index}.{ext}`, two-digit numbering from `01`, `Game` and `Ui` domains, and concrete examples; verify the new naming policy does not require renaming an existing asset.
- [x] 2.2 Document fixed-rate and `0.97` to `1.03` playback-rate recommendations, including the fact that browser `Audio` changes pitch and duration together; verify the document states that no Babylon Lite audio migration is part of this change.
- [x] 2.3 Cross-check the catalog against `documentation/audio.md` and the audio system, then run `openspec validate expand-game-audio-events --strict` to verify the completed documentation-only change.
