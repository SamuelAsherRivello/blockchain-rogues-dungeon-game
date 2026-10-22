# Rogue's Dungeon sound-event catalog

This is the planning catalog for game audio. It separates dungeon events from interface events and distinguishes files that are currently wired from proposed filenames. It is not an asset manifest. See [audio.md](audio.md) for provenance, licenses, and the shipped music catalog.

## Reading the catalog

- **Current filename** is the basename used by the current audio manager. A dash means no sound is wired for that event.
- **Proposed filename** follows the naming policy for a future file. It does not mean that file exists or that the event's game mechanic exists.
- **Pitch note** gives the recommended `playbackRate` policy. Pitch variation also changes duration.

## Game-view events

| Event | Current filename | Proposed filename | Pitch note |
|---|---|---|---|
| Ability: Ancient or future ability activates | `magic-teleport.ogg` | `GameAbilityAncient01.ogg` | Fixed |
| Ability: Heal activates | `magic-heal.ogg` | `GameAbilityHeal01.ogg` | Fixed |
| Ability: Wand activates | `magic-wand.ogg` | `GameAbilityWand01.ogg` | Fixed |
| Barrel: breaks | - | `GameBarrelBreak01.ogg` | `0.97-1.03` |
| Barrel: returns to its start | - | `GameBarrelReturn01.ogg` | `0.97-1.03` |
| Barrel: pushes | `barrel-slide.wav` | `GameBarrelPush01.wav` | `0.97-1.03` |
| Chest: opens | `chest.ogg` | `GameChestOpen01.ogg` | Fixed |
| Combat: enemy attacks player | `enemy_hit.ogg` | `GameCombatEnemyHit01.ogg` | `0.98-1.02` |
| Combat: player attacks enemy | `weapon_hit.ogg` | `GameCombatWeaponHit01.ogg` | `0.98-1.02` |
| Crate: bumps | `wood-hit-01.ogg`, `wood-hit-02.ogg`, `wood-hit-03.ogg` | `GameCrateBump01.ogg` | The existing variants already vary; do not add rate variation by default. |
| Crate: opens | - | `GameCrateOpen01.ogg` | Fixed |
| Door: locks or rejects interaction | - | `GameDoorLocked01.ogg` | Fixed |
| Door: opens or unlocks | - | `GameDoorOpen01.ogg` | Fixed |
| Enemy: defeated | `enemy_fall.ogg` | `GameEnemyDefeat01.ogg` | `0.98-1.02` |
| Experience: gained | - | `GameExperienceGain01.ogg` | Fixed |
| Floor trigger: activates or deactivates | `barrel-slide.wav` | `GameTriggerPressure01.wav` | Fixed. Give this event its own sound before shipping more trigger types. |
| Gold: collected | `pickup-click.wav` then `inventory.ogg` | `GamePickupGold01.ogg` | `0.98-1.02` |
| Invalid movement or blocked action | - | `GameMoveBlocked01.ogg` | Fixed and quiet |
| Item: collection rejected because inventory is full | - | `GamePickupRejected01.ogg` | Fixed and quiet |
| Key: collected | `pickup-click.wav` then `key.ogg` | `GamePickupKey01.ogg` | `0.98-1.02` |
| Level: gained | `ui_accept.ogg` | `GameLevelGain01.ogg` | Fixed |
| Player: dies | - | `GamePlayerDeath01.ogg` | Fixed |
| Player: moves | `footstep.ogg` | `GameFootstepStone01.ogg` | `0.97-1.03` |
| Player: sneak state changes | - | `GamePlayerSneak01.ogg` | Fixed and quiet |
| Player: waits | `footstep.ogg` | `GamePlayerWait01.ogg` | Fixed. Consider silence if wait actions become frequent. |
| Potion: collected | `pickup-click.wav` then `collect.ogg` | `GamePickupPotion01.ogg` | `0.98-1.02` |
| Potion: consumed | `potion.ogg` | `GamePotionConsume01.ogg` | `0.98-1.02` |
| Realm: entered after using stairs | `stairs.ogg` | `GameStairsDescend01.ogg` | Fixed |
| Resource: restored outside potion use | - | `GameResourceRestore01.ogg` | Fixed and quiet |
| Stairs: entered | - | `GameStairsEnter01.ogg` | Fixed. The later realm-entered event currently supplies the descent cue. |
| Trap: damages player | - | `GameTrapStrike01.ogg` | `0.98-1.02` |

## UI events

| Event | Current filename | Proposed filename | Pitch note |
|---|---|---|---|
| Ability assignment: changed | - | `UiAbilityAssign01.wav` | Fixed |
| Audio controls: changed | - | `UiAudioControl01.wav` | No cue while muted. Prefer silence for volume changes unless a user specifically asks for audible preview. |
| Character attributes: rerolled | `dice-roll.mp3` | `UiCharacterReroll01.mp3` | Fixed |
| Combat roll: resolves visibly | `dice-roll.mp3` | `UiCombatRoll01.mp3` | `0.98-1.02` |
| Equipment: change accepted | `ui_accept.ogg` | `UiEquipmentAffirmative01.wav` | Fixed |
| Equipment: change rejected | `ui_reject.ogg` | `UiEquipmentRejected01.wav` | Fixed |
| Menu: enabled button clicked | `pickup-click.wav` | `UiClickAffirmative01.wav` | `0.98-1.02` |
| Music: Battle mode begins | `end_dungeon.mp3` | `UiMusicBattle01.mp3` | Fixed |
| Music: General mode begins | `spooky_dungeon.ogg` | `UiMusicGeneral01.ogg` | Fixed |
| Music: mode changes | - | `UiMusicMode01.wav` | No cue recommended. The crossfade is the feedback. |
| Quick slot: assignment or movement accepted | - | `UiQuickSlotAffirmative01.wav` | Fixed |
| Quick slot: use rejected | - | `UiQuickSlotRejected01.wav` | Fixed |
| Save: failure | - | `UiSaveFailed01.wav` | Fixed and restrained |
| Save: success | - | `UiSaveSucceeded01.wav` | No cue recommended for routine autosaves. |
| Stat upgrade: points spent | - | `UiStatUpgrade01.wav` | Fixed |

## Naming policy for new assets

New sound assets use this pattern:

```text
{Domain}{Variety}{Index}.{ext}
```

- `Domain` is `Game` for dungeon events or `Ui` for interface events.
- `Variety` describes the action or sound family in PascalCase.
- `Index` begins at `01` and remains two digits. Increment it only for another interchangeable variant in the same family.
- `ext` is the chosen source format. Keep a selected asset's native format unless conversion is needed for browser support or size.

Examples: `GameFootstepStone01.ogg`, `GameCrateBump02.ogg`, `UiClickAffirmative01.wav`, and `UiQuickSlotRejected01.wav`.

Existing filenames remain in place. The proposed names are for future additions or a separately approved rename migration.

## Playback-rate guidance

The current audio manager uses browser `Audio` handles. It can set `HTMLAudioElement.playbackRate` on a selected handle before playback. Browser `Audio` changes pitch and duration together: a rate below `1` lowers pitch and lengthens the sound, while a rate above `1` raises pitch and shortens it.

Use the small ranges in the tables only for brief, repeatable effects. Keep abilities, level gains, death, confirmation, rejection, and progress cues at a fixed rate so players can recognize them. This catalog does not migrate playback to Babylon Lite's audio engine.

## Maintenance rule

When a change adds or renames an audio asset or event mapping, update this catalog and [audio.md](audio.md) in the same change. Mark a row's current filename only after the asset is bundled and the audio manager actually plays it.
