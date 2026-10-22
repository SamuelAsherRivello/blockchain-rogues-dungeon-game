# Battle presentation

Battle starts when a living floor enemy is within the greater of its awareness or twice the player's effective Perception, with a minimum range of one cell. This is a warning distance; enemy AI keeps its own awareness. Walls still block enemy detection, but do not block the warning.

The banner and square icon are 50px high on larger views, capped to 9% of view height, with a 32px cap on compact screens. The icon slides in over 560ms. The text extends after it and holds fully open for about 1.9 seconds before retracting. The whole entry takes 3.35 seconds. The icon stays until Battle ends. Additional enemies do not replay entry. Reduced motion shows the icon immediately.

The tactical area is the union of inclusive rectangles connecting the player cell to detected enemies in warning range. Each rectangle extends one complete grid row upward before the union, so tall and hopping character artwork stays illuminated. Its side and bottom boundaries stay unchanged. These rectangles describe an area, not a legal route. Undetected enemies contribute no geometry. If all threats are hidden, the area includes only the player cell and the cell directly above it.

Developer settings expose E-VIS: 1 for brighter tactical cells with normal surroundings, and E-VIS: 2 for normal tactical cells with darker surroundings. The setting persists locally and can change live without replaying Battle entry. Normal player sessions default to 2. All overlays pass pointer input through and leave route previews readable.

Spooky Dungeon plays in General and JRPG - End Dungeon plays in Battle. Transitions crossfade over half a second and preserve playback positions. Audio controls and ?mute=1 govern both tracks.
