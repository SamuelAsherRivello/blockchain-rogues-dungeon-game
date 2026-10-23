# Battle presentation

Battle starts when a living floor enemy is within the greater of its awareness or twice the player's effective Perception, with a minimum range of one cell. This is a warning distance; enemy AI keeps its own awareness. Walls still block enemy detection, but do not block the warning.

The banner and square icon are 50px high on larger views, capped to 9% of view height, with a 32px cap on compact screens. The icon slides in over 560ms. The text extends after it and holds fully open for about 1.9 seconds before retracting. The whole entry takes 3.35 seconds. The icon stays until Battle ends. Additional enemies do not replay entry. Reduced motion shows the icon immediately.

Battle always has a minimum 3x3 focus area around the player, plus one row of artwork headroom above it. The area also includes filled rectangles to detected enemies and the nearest threatening enemy with clear line of sight, even if Perception is too low to reveal that enemy's sprite. This gives a spatial hint before identification. Walls and closed doors block that hint. Each rectangle extends one complete row upward before the union so tall and hopping artwork stays illuminated. These areas describe engagement space, not legal movement paths. Perception and line of sight still govern enemy sprites, tooltips, combat cursors and minimap markers independently.

Developer settings expose E-VIS: 1 for brighter tactical cells with normal surroundings, and E-VIS: 2 for normal tactical cells with darker surroundings. The setting persists locally and can change live without replaying Battle entry. Normal player sessions default to 2. All overlays pass pointer input through and leave route previews readable.

Spooky Dungeon plays in General and JRPG - End Dungeon plays in Battle. Transitions crossfade over half a second and preserve playback positions. Audio controls and ?mute=1 govern both tracks.
