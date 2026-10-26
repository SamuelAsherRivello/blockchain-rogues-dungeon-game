# Rogue's Dungeon sound-event catalog

Every row has a bundled sound and a runtime playback path. See [audio.md](audio.md) for provenance. New filenames use lowercase kebab case, as required by the repository. Existing asset names remain unchanged.

## Game-view events

| Event | Current filename | Runtime event | Pitch policy |
|---|---|---|---|
| Ability: Ancient or future ability activates | `magic-teleport.ogg` | `ability.used`, generic fallback | Fixed |
| Ability: Heal activates | `magic-heal.ogg` | `ability.used`, heal | Fixed |
| Ability: Wand activates | `magic-wand.ogg` | `ability.used`, wand | Fixed |
| Barrel: returns to its start | `game-barrel-return-01.wav` | `barrel.returned` | 0.97–1.03 |
| Barrel: pushes | `barrel-slide.wav` | `barrel.pushed` | 0.97–1.03 |
| Breakable wooden container: breaks | `game-wood-break-01.wav` | `crate.opened` | 0.97–1.03 |
| Chest: opens | `chest.ogg` | `chest.opened` | Fixed |
| Combat: enemy attacks player | `enemy_hit.ogg` | `resource.changed`, enemy-attack | 0.97–1.03 |
| Combat: player attacks enemy | `weapon_hit.ogg` | `combat.hit`, player source | 0.97–1.03 |
| Crate: bumps | `wood-hit-01.ogg`, `wood-hit-02.ogg`, `wood-hit-03.ogg` | `crate.bumped` | Random file, fixed rate |
| Crate: opens | `game-wood-break-01.wav` | `crate.opened` | 0.97–1.03 |
| Door: locks, closes, or rejects interaction | `game-door-locked-01.wav` | `encounter.locked`, inactive floor trigger, blocked door | Fixed |
| Door: opens or unlocks | `game-door-open-01.wav` | `encounter.cleared`, active floor trigger | Fixed |
| Enemy: defeated | `enemy_fall.ogg` | `enemy.defeated` | 0.97–1.03 |
| Experience: gained | `game-experience-gain-01.wav` | `xp.gained` | Fixed, once per transaction |
| Floor trigger: activates or deactivates | `game-trigger-pressure-01.wav` | `floor-trigger.changed` | Fixed, followed by door cue |
| Gold: collected | `pickup-click.wav` then `inventory.ogg` | `item.collected`, pickup flight | Fixed |
| Invalid movement or blocked action | `game-move-blocked-01.wav` | `action.rejected` | Fixed, 180ms repeat limit |
| Item: collection rejected because inventory is full | `game-pickup-rejected-01.wav` | `item.collection.rejected` | Fixed |
| Key: collected | `pickup-click.wav` then `key.ogg` | `item.collected`, pickup flight | Fixed |
| Level: gained | `ui-positive-shimmer-01.wav` | `xp.level.changed`, after sparkles converge | Fixed |
| Player: dies | `game-player-death-01.wav` | `player.died` | Fixed |
| Player: moves | `game-footstep-soft-01.wav` | `player.moved` | 0.97–1.03, SFX bus × 0.10 |
| Player: sneak state changes | `game-player-sneak-01.wav` | `player.sneak.changed` | Fixed |
| Player: waits | `game-player-wait-01.wav` | `player.waited` | Fixed |
| Potion: collected | `pickup-click.wav` then `game-potion-pickup-02.wav` | `item.collected`, pickup flight | Fixed |
| Potion: consumed | `potion.ogg` | `potion.consumed` | Fixed |
| Realm: entered after using stairs | `stairs.ogg` | `realm.entered` | Fixed |
| Resource: restored by healing | `game-resource-restore-01.wav` | `resource.changed`, heal | Fixed, once per transaction |
| Status: replenishment shimmer | `ui-positive-shimmer-01.wav` | Each campfire replenishment pass | Fixed, exactly twice per rest |
| Stairs: entered | `game-stairs-enter-01.wav` | `stairs.entered` | Fixed |
| Trap: damages player or enemy | `game-trap-strike-01.wav` | `resource.changed` or `combat.hit`, trap cause/source | 0.97–1.03, once per transaction |

The earlier proposed "Barrel: breaks" row refers to the wooden break sound above. Destructible crates play that cue when they break open. Puzzle barrels remain pushable and returnable; destroying them would invalidate their door puzzles. Both wooden-container rows describe the same playback, so one broken crate produces one break cue.

Routine movement stamina recovery and equipment capacity recalculation do not count as restoration actions.

## UI events

| Event | Current filename | Runtime path | Pitch policy |
|---|---|---|---|
| Ability assignment: changed | `ui-ability-assign-01.wav` | `ability.assignment.changed` | Fixed |
| Audio controls: changed | `ui-audio-control-01.wav` | Settings audio change, after new preferences apply | Fixed, 90ms repeat limit |
| Character or world attributes: rerolled | `dice-roll.mp3` | Character and world roll controls | Fixed |
| Combat roll: resolves visibly | `dice-roll.mp3` | `combat.hit` with roll | Fixed |
| Equipment: change accepted | `ui_accept.ogg` | `equipment.changed` | Fixed |
| Level-up reminder: shimmers | `ui-positive-shimmer-01.wav` | CSS animation start and iteration, including reduced motion | Fixed, once per visible shimmer |
| Equipment: change rejected | `ui_reject.ogg` | Rejected equipment action or incompatible drop | Fixed |
| Menu: enabled button clicked | `pickup-click.wav` | Menu click handler | Fixed |
| Music: Battle mode begins | `end_dungeon.mp3` | Battle soundtrack selection | Fixed |
| Music: General mode begins | `spooky_dungeon.ogg` | General soundtrack selection | Fixed |
| Music: mode changes | `ui-music-mode-01.wav` | `setGameMode`, alongside 500ms crossfade | Fixed |
| Panel: expands | `ui-panel-expand-01.wav` | Information tabs, card focus, keyboard tray, Z/C shortcuts | Fixed |
| Panel: collapses | `ui-panel-collapse-01.wav` | Information tabs, card title or Back, keyboard tray, Z/C shortcuts | Fixed |
| Quick slot: assignment or movement accepted | `ui-quick-slot-affirmative-01.wav` | `quick-slot.changed` | Fixed |
| Quick slot: use or assignment rejected | `ui-quick-slot-rejected-01.wav` | Rejected quick-slot action | Fixed, 180ms repeat limit |
| Save: failure | `ui-save-failed-01.wav` | Failed autosave or Save & Exit | Fixed, 2s repeat limit |
| Save: success | `ui-save-succeeded-01.wav` | Successful autosave or Save & Exit | Fixed, quiet, 5s repeat limit |
| Stat upgrade: points spent | `ui-stat-upgrade-01.wav` | `progression.points.spent` | Fixed |

Audio-control previews and save-success cues are enabled by the request to sound every catalog event. Mute All, `?mute=1`, and SFX volume zero suppress every SFX call, including previews. Unmuting plays a preview only after the SFX bus becomes audible. Music volume zero suppresses music. Drag handlers do not duplicate feedback already produced by domain events.

## Naming and playback

New sounds use `{domain}-{action}-{index}.{ext}`, for example `game-trap-strike-01.wav` and `ui-save-failed-01.wav`. Index numbering begins at `01`.

The audio manager uses browser `Audio` elements. Varied cues set `preservesPitch = false` and a playback rate between 0.97 and 1.03, changing pitch and duration together. UI, progression, and death cues use rate 1. Each playback resets its pooled element's rate and time. The game does not use Babylon audio.

When a mapping or asset changes, update this catalog and [audio.md](audio.md) together. A filename belongs here only when bundled and connected to a runtime path.
