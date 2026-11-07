# Game Layout and Pixel Art

Rogue's Dungeon uses a fitted landscape viewport on PC and mobile. On mobile, the landscape view rotates to fit a portrait screen. Mobile players must tap Fullscreen to enter the game; leaving fullscreen shows the prompt again. The game requests a landscape orientation lock when supported by the browser. The four template corner units are removed.

The landscape shell allocates 4% to the title, 92% to gameplay and information, and 4% to the status bar. Portrait allocates 4% to the title, 46% to the game, 4% to status, and 46% to a vertically scrollable lower area. Titlebar and statusbar contents are centered vertically. Mobile Controls appear first, followed by both information panels; no tab controls are rendered. Only Log, equipment Slots, and Inventory scroll internally. Controls include WASD and arrows for movement, Shift or right mouse for faster movement, C for Sneak, and 1–4 for abilities.

Zoom, Camera, and desired Fullscreen state are stored once per browser under `rogues-dungeon.preferences.v1`, separately from the three campaign slots. Defaults are 1x, Center, and windowed. If a saved Fullscreen intent cannot be restored automatically, selecting a Saved Game retries it during that user gesture. Actual Fullscreen state follows browser `fullscreenchange` events. Settings clears held movement, traps keyboard focus, supports Escape, and offers Save & Return, GitHub, and a non-clickable version label. Corrupt campaign slots are shown as unavailable and left intact rather than replaced.

World tiles and actor frames are 32 by 32 pixels. Native zoom keeps each tile at source dimensions; Half and Double use the template's render-resolution dimension calculation and preserve nearest-neighbor pixel edges. Supplied Tiled tilesets and example maps remain under `public/assets/` with their relative image paths intact.

The current turn model is in `src/systems/procedural/world-procedural-system.ts`; slot persistence is in `src/systems/persistence/save-system.ts`. Both are independent from the React display. The active view is assembled in `src/game/Game.tsx` and mounted by `src/content/Content.tsx`.
