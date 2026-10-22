# Battle presentation

Battle starts when a living enemy is within the greater of its effective awareness or twice the player's effective Perception and has clear line of sight. Walls and closed doors block entry. Distance uses the larger horizontal or vertical grid separation, not walkable path length. After sight is lost, Battle persists for 750 ms while a living enemy remains in range. Reacquiring sight cancels the deadline; losing sight again starts a fresh grace period. Killing all threats or leaving range ends Battle immediately. Grace is session-only and does not consume turns or survive reload.

The banner and square icon are 50px high on larger views, capped to 9% of view height, with a 32px cap on compact screens. The icon slides in over 560ms. The text extends after it and holds fully open for about 1.9 seconds before retracting. The whole entry takes 3.35 seconds. The icon stays until Battle ends. Additional enemies do not replay entry. Reduced motion shows the icon immediately.

Battle always has a minimum 3x3 focus area around the player, plus one row of artwork headroom above it. The area also includes filled rectangles to detected enemies and the nearest threatening enemy with clear line of sight, even if Perception is too low to reveal that enemy's sprite. This gives a spatial hint before identification. Walls and closed doors block that hint. Each rectangle extends one complete row upward before the union so tall and hopping artwork stays illuminated. These areas describe engagement space, not legal movement paths. Perception and line of sight still govern enemy sprites, tooltips, combat cursors and minimap markers independently.

Battle uses one fixed treatment: tactical cells retain their normal brightness and their surroundings darken. There is no developer selector or alternate brightening treatment. Previously saved visual preferences are ignored. All overlays pass pointer input through and leave route previews readable.

Spooky Dungeon plays in General and JRPG - End Dungeon plays in Battle. Transitions crossfade over half a second and preserve playback positions. Audio controls and ?mute=1 govern both tracks.
