# Game Layout and Pixel Art

Rogue's Dungeon uses a fitted landscape viewport on PC and mobile. On mobile, the landscape view rotates to fit a portrait screen. Mobile players must tap Fullscreen to enter the game; leaving fullscreen shows the prompt again. The game requests a landscape orientation lock when supported by the browser. The four template corner units are removed.

Desktop allocates 4% to the title, 92% to gameplay and information, and 4% to the status bar. Mobile uses a title bar as tall as a slot, removes the status bar, and places one information column beside the game view. Panels switches between the existing primary and secondary columns; a square minimap overlays the upper-right game view. Tap a square to move or interact. Desktop controls include WASD and arrows for movement, Shift or right mouse for faster movement, C for Sneak, and 1–4 for abilities.

Zoom, Camera, and desired Fullscreen state are stored once per browser under `rogues-dungeon.preferences.v1`, separately from the three campaign slots. Mobile uses 1x zoom, Center camera, and Grid-tween movement without replacing saved desktop preferences. The desktop developer layout preview is stored separately and can be returned to desktop through Settings. Actual Fullscreen state follows browser `fullscreenchange` events. Corrupt campaign slots are shown as unavailable and left intact rather than replaced.

World tiles and actor frames are 32 by 32 pixels. Native zoom keeps each tile at source dimensions; Half and Double use the template's render-resolution dimension calculation and preserve nearest-neighbor pixel edges. Supplied Tiled tilesets and example maps remain under `public/assets/` with their relative image paths intact.

The current turn model is in `src/systems/procedural/world-procedural-system.ts`; slot persistence is in `src/systems/persistence/save-system.ts`. Both are independent from the React display. The active view is assembled in `src/game/Game.tsx` and mounted by `src/content/Content.tsx`.
