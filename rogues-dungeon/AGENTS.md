# Rogue's Dungeon project guidance

This existing game uses separate desktop and mobile landscape layouts. Desktop supports 16:10 through 16:9; mobile supports 16:10 through 20:9. A persisted desktop developer layout preview selects mobile or desktop, while physical mobile devices select mobile automatically.

Keep primary game UI within the fitted viewport. Mobile retains the title bar, uses one right-hand information column selected by the Panels button, and overlays the minimap at the game view's upper right. Tap a world square to use the existing left-click action. Mobile uses zoom 1, centered camera, and grid-tween movement. Keep only the Log, equipment Slots, and Inventory content internally scrollable. Preserve the Babylon Lite WebGPU-only renderer and the `/blockchain-rogues-dungeon-game/` Vite deployment base. Specify whether layout changes affect all layouts, desktop, or mobile.

Name every new file with lowercase kebab case in the form `blah-foo.extension`.
For compound extensions, retain each extension, such as `turn-rules.test.ts`.
Rename files that you modify when they do not follow this convention, unless a
framework, tool, or platform requires an exact filename.

Any automated browser session that launches or navigates to Rogue's Dungeon must include `?mute=1` so audio stays silent during testing. Keep the public player demo and normal human sessions unmuted.

## Ranged item messages

Ranged quick-slot items must report an unavailable enemy target using the
`quick-slot.use.rejected` event with reason `no-valid-target` and the item's
name. The shared log policy displays `<item> disabled. Enemy out of range.`
for missing, obstructed, or out-of-range targets.

## World Object Placement

Every persistent world object must be placed by the appropriate world-generation
pass and follow that object's own placement rules: valid walkable cells,
reservation/occupancy, protected semantic cells, route restrictions, and any
object-specific constraints. Do not use a nearby-start fixture as a substitute
for normal object distribution.

`level1TestMode` may add exactly one additional object instance beside the
level-one entrance for deterministic manual and automated checks. This is a
test-only fixture; it supplements, rather than replaces, normal world-pass
distribution. In particular, crates retain their per-room spawn roll during
test-mode generation, with one additional crate beside the level-one entrance.

## Development save compatibility

During early development, the user authorizes incompatible game changes together
with clearing all local storage on the game's browser origin. When a change
invalidates saved content, bump the compatibility epoch in
`development-storage-system.ts` so the next app startup clears every localStorage
key once. Preserve saves created after that reset. Fresh browser fixtures must
declare the current epoch before seeding their data.

## Browser verification

Test the live game in all three available browser contexts when a change affects
rendering, input, fullscreen, layout, or browser behavior:

1. Start exactly one project-owned server through `ai-skills-project-run-start`.
   Use a browser-safe AI port such as `6080` and verify
   `/blockchain-rogues-dungeon-game/`. Do not use port `6000`: Chromium blocks it
   as an unsafe port. Keep the server running while checking all three contexts.
2. Use Playwright CLI with Microsoft Edge and navigate to
   `http://127.0.0.1:<port>/blockchain-rogues-dungeon-game/?mute=1`. Select a save
   slot, then verify that `.game-screen` is visible, at least one canvas exists,
   the WebGPU-unavailable message is absent, and the console has no errors.
3. Use the desktop Edge browser through `cua_repl` on the same muted URL. Select
   a save slot and confirm the playable game UI and its dungeon map are visible.
   Check the canvas count and console errors through its page tools.
4. Repeat the desktop check in the built-in `iab` browser through `cua_repl`.
   Wait for `Preparing the crypt...` to disappear before treating the renderer
   as ready.

Run `npm test` and `npm run typecheck` for the focused repository checks. The
configured Playwright suite starts its own Vite server on port 4173, so stop the
project-owned verification server before running `npm run test:browser` or
`npm run test:browser:full`; never leave both servers running together.
