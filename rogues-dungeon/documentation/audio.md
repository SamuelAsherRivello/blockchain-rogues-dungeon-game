# Rogue's Dungeon Audio

General mode selects Spooky Dungeon and Battle mode selects JRPG - End Dungeon. Each mode change crossfades for 0.5 seconds. The outgoing track pauses after fading out and resumes at its retained playback position when selected again. Reversing a fade starts from the current volumes. Dungeon 04 remains bundled with its credits but is not selected by this soundtrack. Music volume, Mute All, and the ?mute=1 URL setting apply throughout transitions.

Audio files are bundled under `public/assets/audio/`. The Music and SFX buses have independent 0–100 levels and a persisted **Mute All** checkbox in Settings. New preferences default to SFX 80, Music 1, and Mute All off. Zero on either slider silences only that bus.

Mute All reflects both the saved preference and `?mute=1`. Checking it adds `mute=1` to the current URL; unchecking it removes the parameter and enables audio without reloading. Other URL parameters and the fragment are preserved.

For silent browser automation and AI sessions, open the app with `?mute=1`, for example:

```text
http://localhost:5173/blockchain-rogues-dungeon-game/?mute=1
```

The query override is checked before playback and silences both buses for the page session even if saved preferences are audible. It does not erase saved player settings. Browsers may wait for a user gesture before allowing music to start.

When the main menu opens, the audio manager loads the music and SFX catalog in the background unless Mute All or URL mute is active. Gameplay never waits for this work. A gesture can play a loading element immediately so browser playback authorization is retained. Each SFX has a two-element pool. Muting pauses active handles and suppresses subsequent play calls.

## Diegetic and Non-diegetic Cues

| Type | Event | Asset | Source entry | Intent |
|---|---|---|---|---|
| Diegetic | Player moves one tile | `sfx/game-footstep-soft-01.wav` | Original synthesis, CC0 | Low-pass cloth-and-sole brush, 0.14 seconds; SFX multiplier 0.10, reduced from 0.25 |
| Diegetic | Player waits one turn | `sfx/game-player-wait-01.wav` | Original synthesis, CC0 | Quiet tap distinct from movement |
| Diegetic | Player successfully pushes a barrel | `sfx/barrel-slide.wav` | Procedurally synthesized for Rogue's Dungeon | 0.28-second muted wood-and-stone slide |
| Diegetic | Player hits a crate | `sfx/wood-hit-01.ogg`, `sfx/wood-hit-02.ogg`, `sfx/wood-hit-03.ogg` | `bfh1_wood_hit_01/02/03.ogg` from [75 CC0 breaking / falling / hit sfx](https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx), CC0 | Randomly selected short wooden impacts |
| Diegetic | Player hits an enemy | `sfx/weapon_hit.ogg` | `sfx100v2_metal_hit_01.ogg` | Brief weapon impact |
| Diegetic | Enemy hits the player | `sfx/enemy_hit.ogg` | `sfx100v2_hit_01.ogg` | Muted impact |
| Diegetic | Enemy is defeated | `sfx/enemy_fall.ogg` | `sfx100v2_hit_02.ogg` | Short defeat cue |
| Diegetic | Potion is collected | `sfx/potion.ogg` | `sfx100v2_glass_01.ogg` | Small glass chime |
| Non-diegetic | Any world pickup is collected | `sfx/pickup-click.wav` | `click.wav` | Immediate click before its UI flight; created by qubodup and sourced from [OpenGameArt](https://opengameart.org/content/click), CC0 |
| Non-diegetic | Any enabled menu button is clicked | `sfx/pickup-click.wav` | `click.wav` | Shared click confirmation for menu actions |
| Non-diegetic | A key pickup starts its UI flight | `sfx/key.ogg` | `sfx100v2_metal_01.ogg` | Immediate key credit confirmation |
| Non-diegetic | A gold pickup starts its UI flight | `sfx/inventory.ogg` | `sfx100v2_items_02.ogg` | Immediate coin confirmation |
| Non-diegetic | A Health or Mana pickup starts its UI flight | `sfx/game-potion-pickup-02.wav` | `sfx/vials-glass-rattle-04.wav` by Vehicle from [Fantasy Accessory SFX Library](https://opengameart.org/content/fantasy-accessory-sfx-library), CC0 | Alternative natural glass-vial rattle, 0.396 seconds, unmodified source; the original `collect.ogg` is retained for comparison |
| Non-diegetic | An inventory-bound pickup starts its UI flight | `sfx/inventory.ogg` | `sfx100v2_items_02.ogg` | Immediate inventory confirmation |
| Diegetic | Chest opens | `sfx/chest.ogg` | `sfx100v2_lock_open_01.ogg` | Brief latch sound |
| Diegetic | Player enters stairs to descend | `sfx/stairs.ogg` | `sfx100v2_door_01.ogg` | Stone transition cue |
| Non-diegetic | Character gains a level | `sfx/ui-positive-shimmer-01.wav` | Original synthesis, CC0 | Same positive chime as status and level-up reminder shimmers |
| Non-diegetic | Compatible equipment drop is accepted | `sfx/ui_accept.ogg` | `sfx100v2_switch_01.ogg` | Quiet confirmation |
| Non-diegetic | Equipment drop is rejected | `sfx/ui_reject.ogg` | `sfx100v2_switch_02.ogg` | Soft rejection tick |
| Non-diegetic | Heal ability activation succeeds | `sfx/magic-heal.ogg` | [Spell sounds](https://opengameart.org/content/spell-sounds), healing.ogg by Augmentality / Brandon Morris; CC0 | Short rising healing spell |
| Non-diegetic | Wand ability activation succeeds | `sfx/magic-wand.ogg` | [Magic Spell SFX](https://opengameart.org/content/magic-spell-sfx), magical_1.ogg by JaggedStone; CC0 | Short spellcast cue for the wand |
| Non-diegetic | Generic or future ability activation | `sfx/magic-teleport.ogg` | [Spell sounds](https://opengameart.org/content/spell-sounds), teleport.ogg by Augmentality / Brandon Morris; CC0 | Ancient, resonant magic fallback |
| Non-diegetic | Character or world attributes are rerolled, or combat resolves a visible roll | `sfx/dice-roll.mp3` | User-supplied `DiceRoll01.mp3` | Shared dice-roll cue |

Fourteen OGG SFX are selected from rubberduck's **100 CC0 SFX #2** pack on [OpenGameArt](https://opengameart.org/content/100-cc0-sfx-2), licensed CC0. The three crate-hit variations come from rubberduck's [75 CC0 breaking / falling / hit sfx](https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx), also licensed CC0. The additional `pickup-click.wav` is the CC0 click by qubodup listed above. `barrel-slide.wav` and `crate-hit.wav` are original, procedurally synthesized effects. The source archives are not shipped; only the listed files are included. Original entry names are recorded to make each selection traceable.

## Music Tracks

The game loops the track selected by General or Battle mode. Music starts after a user gesture when the browser permits playback. Track selection is not exposed as another setting.

## Additional event cues

These 26 mono PCM WAV files are original synthesized audio created for Rogue's Dungeon, dedicated to **CC0**. They contain no third-party samples. Rebuild them with `python scripts/generate-audio-cues.py` from the repository root. The generator uses only the Python standard library, deterministic noise, sine partials, and envelopes at 22,050 Hz. Total synthesized audio is under 300 KiB. The separately sourced potion-pickup alternative is credited above and is not regenerated.

| File under `sfx/` | Sound |
|---|---|
| `game-wood-break-01.wav` | Wooden crack and falling splinters when a crate breaks open |
| `game-barrel-return-01.wav` | Short rolling wooden return |
| `game-door-locked-01.wav` | Metal latch and low locking knock |
| `game-door-open-01.wav` | Rising creak and latch |
| `game-experience-gain-01.wav` | Quiet ascending XP chirp |
| `game-trigger-pressure-01.wav` | Low pressure-plate click |
| `game-move-blocked-01.wav` | Muted blocked-action thud |
| `game-pickup-rejected-01.wav` | Descending inventory-full cue |
| `game-player-death-01.wav` | Descending low death tones |
| `game-player-sneak-01.wav` | Soft cloth rustle |
| `game-player-wait-01.wav` | Short waiting tap |
| `game-stairs-enter-01.wav` | Stone entry knock |
| `game-resource-restore-01.wav` | Rising restoration tones |
| `game-trap-strike-01.wav` | Metallic spike snap |
| `ui-ability-assign-01.wav` | Two rising assignment tones |
| `ui-audio-control-01.wav` | Short volume preview |
| `ui-music-mode-01.wav` | Low mode-transition accent |
| `ui-quick-slot-affirmative-01.wav` | Quick-slot confirmation |
| `ui-quick-slot-rejected-01.wav` | Quick-slot rejection |
| `ui-save-failed-01.wav` | Three descending failure tones |
| `ui-save-succeeded-01.wav` | Quiet save confirmation |
| `ui-stat-upgrade-01.wav` | Ascending upgrade arpeggio |
| `game-footstep-soft-01.wav` | Low-pass, brief cloth-and-sole brush; quieter than the previous stone step |
| `ui-panel-expand-01.wav` | Short rising click for panel expansion |
| `ui-panel-collapse-01.wav` | Short falling click for panel collapse |
| `ui-positive-shimmer-01.wav` | Positive bell chime shared by each of the two replenishment shimmers, level gains, and level-up reminders |

The rest presentation plays the positive chime at each of its two actual shimmer callbacks. Its later resource-change transaction does not add a third restoration sound. The level-up reminder follows CSS animation events, so closing or hiding that panel stops its reminder sound without a separate audio timer. Panel sounds follow user actions, including keyboard shortcuts, and do not play on initial layout or orientation changes. The previous `footstep.ogg` and `collect.ogg` remain bundled as comparison originals and are not selected by the current mappings.

See [audio-events.md](audio-events.md) for runtime mappings. Save-success playback is limited to once every five seconds, and save failures to once every two seconds. Restoration and trap strikes play once per transaction even when several resources or actors change. Repeated blocked input is limited to one cue per 180ms. Every cue honors SFX volume and mute controls.

## Verification

The focused audio tests exercise real simulation sessions for crate breaking, barrel return, pressure-plate and blocked doors, XP and level gains, inventory-full pickups, stairs, waiting, sneak, upgrades, healing, quick slots, and trap deaths. They also check every new event mapping, rejected-transaction feedback, mute paths, repetition limits, and playback-rate bounds.

Run the browser check against the existing project preview with `playwright-cli -s=audio-catalog open --browser=msedge`, then `playwright-cli -s=audio-catalog run-code --filename=rogues-dungeon/test/browser/audio-events-check.js`. It navigates with `?mute=1` and confirms no audio handles are created. In its isolated test page it then mutes native audio output, exercises the real Settings preview and game input, deliberately fails an autosave, and checks native playback promises. All 47 registered SFX decode and play successfully in Edge. Ten panel actions each played exactly one expand or collapse click. The real CSS level-up reminder played the shared positive chime, and campfire replenishment played it exactly twice, 755ms apart, without a third restoration cue. The new footstep and potion pickup played through the real input flow. The script leaves the test page muted.

Desktop Edge through CUA and the built-in browser both display the playable dungeon with two canvases and no console errors. Edge through Playwright CLI passed the instrumented audio checks. The production build and TypeScript checks pass. The latest full test run passed all 510 tests.

| Track | Bundled file | Creator | Source and license |
|---|---|---|---|
| Spooky Dungeon | `music/spooky_dungeon.ogg` | Memoraphile / You're Perfect Studio | [OpenGameArt](https://opengameart.org/content/spooky-dungeon); CC0 is listed; tagged loopable and seamless |
| JRPG - End Dungeon | `music/end_dungeon.mp3` | HydroGene | [OpenGameArt](https://opengameart.org/content/jrpg-end-dungeon); CC0; creator states it is loopable |
| Dungeon 04 | `music/dungeon_04.ogg` | Beau Buckley / Fantasy Musica | [OpenGameArt](https://opengameart.org/content/dungeon-04); CC BY-SA 4.0; OGG includes loop metadata; attribution: “Music by Beau Buckley” |

The tracks are free to use under their listed licenses. The Dungeon 04 credit and license are retained here; consult the linked CC BY-SA 4.0 terms for redistribution or adaptation. The page identifies loop intent for every track; listening to the loop boundary and assessing repetition at the in-game default Music level remains a human listening check.
