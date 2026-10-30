# Lockbox storage

Every authored lockbox opens the same shared inventory for the selected Saved Game. Bump either blocking home object to access it. Shared storage starts empty and holds ten positions. It uses the Inventory rows and category colors, including stack quantities and two-position equipment, and has no Drop Item row. Stored capacity items do not expand storage or affect the player.

Drag an entire item or stack between Inventory and the open lockbox. Storage rejects a full destination, an invalid destination, or removal of a carrying-capacity item that would leave Inventory over capacity. A failed transfer leaves both owners unchanged. Equipment, Abilities, Quick Slots, world drops, and the other closed lockbox cannot receive storage-session drags.

The world view darkens and gameplay pauses while storage is open. Inventory dragging and scrolling remain available. X closes the window. Escape cancels an active drag first and otherwise closes the window. Closing an uncommitted drag leaves its item at the source. Closing does not replay held movement or queued travel.

Choose a destination row in either container. Only that valid hovered row highlights. Dropping keeps the item in that position through closing and reloads, and other items keep their positions. Compatible stacks combine at the selected position. Unrelated occupied positions reject the drop. A two-position item needs two adjacent available positions beginning at the selected row, and only that starting row highlights. Items without a chosen position fill remaining gaps alphabetically.

## Persistence and recovery

Contents belong to the selected Saved Game, shared by every authored lockbox. They persist through dungeon-level travel, reloads, Adventure recovery, Journey checkpoint recovery, and Classic death. Classic still ends its active campaign. Creating a later character in that same Saved Game retains its lockboxes. Different Saved Games never share storage. Confirming Clear Local Storage removes retained containers as well as the game's other promised data.

Each successful transfer saves both Inventory and storage together immediately without advancing time. If saving fails, the transfer is rejected and the existing saving-unavailable message appears. Complete deterministic inspection URLs use empty session-only lockboxes and never access the corresponding Saved Game's storage.

Persistent transfers take precedence over old recovery snapshots. Journey restores unrelated checkpoint state, while transferred item identities and quantities are reconciled so a deposited item cannot also return in Inventory, Equipment, Quick Slots, or reconstructed world loot. A withdrawal does not reappear in storage after death. A later checkpoint can retain the withdrawn run possession under the normal Journey rules. Using storage does not create a new checkpoint.

## Authored objects

Open `rogues-dungeon/public/assets/art/game-view/maps/prefabs/player-home.tmx` in Tiled. Its Objects layer contains `lockbox-left` and `lockbox-right`, IDs 3 and 4, with class/type `lockbox`, `walkable=false`, 32-by-32 selection bounds, and existing tile 9 from `tilesets/examples/objects-overlay.tsx`. The tile-object anchor is bottom-left. Runtime reads these objects and converts their authored pixel positions once to grid positions. No random placement pass or test mode adds lockboxes.

All lockboxes use storage ID `shared-lockbox`. The placement IDs `player-home:3` and `player-home:4` remain distinct for map validation and collision. Moving or removing one access point does not affect shared contents or access through the others. Reopen the map and external tileset if Tiled has cached a changed preview. This change reuses the supplied Dungeons-and-Pixels art and its existing attribution; it creates no new art or placements.

## Save format and rollback

The existing `rogues-dungeon.slot.<slot>` key can contain a versioned envelope with `savedGameVersion: 1`, nullable `campaign`, and persistent `storage`. The storage contains a version, transfer revision, the shared container, provenance, and a recovery journal. An envelope with a null campaign is an empty character slot with retained storage, not a resumable dead campaign.

Readers still accept direct legacy campaign records. Missing storage initializes empty, and ordinary saves without lockboxes can retain their direct-record format until storage is first used. Existing supported campaign migration and backup rules remain in force. Malformed storage is unavailable rather than silently emptied. This compatible addition does not change the development compatibility epoch.

Preserve envelope records and migration backups before rolling back. Older writers do not understand retained storage. Convert records deliberately or restore a known backup instead of overwriting envelopes with an older writer.

The user-selected migration resets old independent lockbox contents once. Existing shared-lockbox contents remain intact, including selected positions and ownership history. New deposits into shared storage survive subsequent reloads without another reset. If an earlier writer already saved shared contents above ten positions, those items remain visible and withdrawable; deposits are blocked until withdrawals restore normal capacity. This migration does not reset the campaign or the development compatibility epoch.
