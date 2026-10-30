import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import viteConfig from '../../vite.config.ts';
import { aspectRatioPresets, classifyPlatform, defaultLayout, fitViewport, layoutForPlatform, validateLayout } from '../src/ui/layout.ts';
import { statusCapMarker } from '../src/game/status-cap-marker.ts';

test("builds Rogue's Dungeon from its GitHub Pages base", () => {
  assert.equal(viteConfig.root, 'rogues-dungeon'); assert.equal(viteConfig.base, '/blockchain-rogues-dungeon-game/');
});
test('fits landscape and portrait command-desk aspect ranges', () => {
  assert.equal(defaultLayout.label, '16:10–16:9'); assert.equal(aspectRatioPresets.portrait.label, '9:16–10:16');
  const cases = [
    { name: 'landscape minimum', layout: defaultLayout, surface: [1600, 1000], ratio: 16 / 10 },
    { name: 'landscape intermediate', layout: defaultLayout, surface: [1680, 1000], ratio: 168 / 100 },
    { name: 'landscape maximum', layout: defaultLayout, surface: [1920, 1000], ratio: 16 / 9 },
    { name: 'portrait minimum', layout: { orientation: 'portrait' as const, ...aspectRatioPresets.portrait }, surface: [900, 1600], ratio: 9 / 16 },
    { name: 'portrait intermediate', layout: { orientation: 'portrait' as const, ...aspectRatioPresets.portrait }, surface: [600, 1000], ratio: 3 / 5 },
    { name: 'portrait maximum', layout: { orientation: 'portrait' as const, ...aspectRatioPresets.portrait }, surface: [800, 1000], ratio: 10 / 16 },
  ] as const;
  for (const { name, layout, surface: [width, height], ratio } of cases) {
    const fitted = fitViewport(width, height, layout);
    assert.ok(fitted.width <= width && fitted.height <= height, name);
    assert.ok(Math.abs(fitted.width / fitted.height - ratio) < 1e-10, name);
    assert.ok(Math.abs(fitted.x * 2 + fitted.width - width) < 1e-10, name);
    assert.ok(Math.abs(fitted.y * 2 + fitted.height - height) < 1e-10, name);
  }
  assert.throws(() => validateLayout({ orientation: 'portrait', width: 16, height: 9 }));
  assert.throws(() => validateLayout({ orientation: 'landscape', width: 16, height: 9, minAspectRatio: 16 / 9, maxAspectRatio: 16 / 10 }));
  assert.throws(() => validateLayout({ orientation: 'portrait', width: 9, height: 16, minAspectRatio: 9 / 16, maxAspectRatio: 16 / 10 }));
});
test('status capacity markers make creation ranks legible without reaching the full track early', () => {
  assert.equal(statusCapMarker(1), 10);
  assert.equal(statusCapMarker(5), 50);
  assert.ok(statusCapMarker(14) > 50 && statusCapMarker(14) < 99);
  assert.equal(statusCapMarker(99), 99);
});
test('labels character meters as Status and exposes exact current values with the XP level', async () => {
  const [game, panels] = await Promise.all(['../src/game/game.tsx', '../src/game/panels/information-panels.tsx'].map((path) => readFile(new URL(path, import.meta.url), 'utf8')));
  assert.match(panels, /GameCard title="Status"/);
  assert.match(game, /Level \$\{String\(displayedValue\.level\)\.padStart\(2, "0"\)\}\. \$\{displayedValue\.current\} \/ \$\{displayedValue\.currentMax\} XP\./);
  assert.match(game, /resource_level--empty/);
  assert.match(game, /resource_level--filled/);
  assert.match(game, /LVL \$\{String\(value\.level\)\.padStart\(2, "0"\)\}/);
});
test('renders equipment and Inventory details for combat properties and two-slot occupancy', async () => {
  const game = (await Promise.all(['../src/game/game.tsx', '../src/game/inventory-presentation.ts', '../src/game/controls/inventory-rows.tsx', '../src/game/controls/slot-item.tsx'].map(path => readFile(new URL(path, import.meta.url), 'utf8')))).join('\n');
  assert.match(game, /HIT \$\{item\.hitChance\}%/);
  assert.match(game, /CRIT \$\{item\.critChance\}%/);
  assert.match(game, /item\.perks\.join\(", "\)/);
  assert.match(game, /item\.slotSpan === 2 \? "\. Uses both positions\."/);
  assert.match(game, /effects=\{itemPresentation\(item\)\}/);
  assert.match(game, /slot_item_details/);
});
test('renders an occupied-or-empty equipment swap comparison with complete deltas', async () => {
  const { itemComparisonStats } = await import('../src/game/item-comparison-stats.ts');
  const item = (modifiers: Record<string, number>, category?: 'capacity') => ({ id: 'test', name: 'Test', group: 'weapons' as const, modifiers, category });
  assert.deepEqual(itemComparisonStats(item({ offense: 3 }), item({ offense: 5, defense: 2, mana: 4 })), [
    { name: 'offense', value: 3, delta: -2 }, { name: 'defense', value: 0, delta: -2 }, { name: 'mana', value: 0, delta: -4 },
  ]);
  assert.deepEqual(itemComparisonStats(item({ offense: 3 }), null), [{ name: 'offense', value: 3, delta: 3 }]);
  assert.deepEqual(itemComparisonStats(null, item({ defense: 2 })), [{ name: 'defense', value: 0, delta: -2 }]);
  assert.deepEqual(itemComparisonStats(item({}, 'capacity'), item({}, 'capacity')), [{ name: 'capacity', value: 5, delta: 0 }]);
  assert.deepEqual(itemComparisonStats(item({}), item({}, 'capacity')), [{ name: 'capacity', value: 0, delta: -5 }]);
  const [game, css] = await Promise.all(['../src/game/game.tsx', '../src/ui/style.css'].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  assert.match(game, /aria-label="Equipment comparison"/);
  assert.match(game, /itemComparisonStats\(item, title === "After" \? baseline : null\)/);
  assert.match(game, /<p><i>\(empty\)<\/i><\/p>/);
  assert.match(game, /<EquipmentComparison campaign=\{campaign\} drag=\{dragPresentation\} \/>/);
  assert.match(css, /\.item-comparison-panel/);
});
test('recovers a wall-adjacent barrel only when its current and starting cells are both offscreen', async () => {
  const renderer = await readFile(new URL('../src/systems/rendering/babylon-render-system.tsx', import.meta.url), 'utf8');
  assert.match(renderer, /const barrelOffscreen = isPositionOffscreen\(set\.barrel, cameraCenter, halfWidth, halfHeight\)/);
  assert.match(renderer, /const startOffscreen = Boolean\(set\.barrelStart && isPositionOffscreen\(set\.barrelStart, cameraCenter, halfWidth, halfHeight\)\)/);
  assert.match(renderer, /if \(barrelOffscreen && startOffscreen && isBlockingPathCell/);
});
test('selects aspect by mobile platform signal with a PC-only developer preview override', () => {
  assert.equal(classifyPlatform({ userAgentDataMobile: false, userAgent: 'iPhone' }), 'mobile');
  assert.equal(classifyPlatform({ userAgentDataMobile: false, userAgent: 'Windows NT 10.0' }), 'pc');
  assert.equal(classifyPlatform({ userAgentDataMobile: true, userAgent: 'Desktop' }), 'mobile');
  assert.equal(classifyPlatform({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' }), 'mobile');
  const landscape = layoutForPlatform('pc');
  const portraitPreview = layoutForPlatform('pc', 'portrait');
  const mobile = layoutForPlatform('mobile', 'landscape');
  assert.equal(landscape.orientation, 'landscape'); assert.equal(landscape.minAspectRatio, 16 / 10); assert.equal(landscape.maxAspectRatio, 16 / 9);
  assert.equal(portraitPreview.orientation, 'portrait'); assert.equal(portraitPreview.minAspectRatio, 9 / 16); assert.equal(portraitPreview.maxAspectRatio, 10 / 16);
  assert.equal(mobile.orientation, 'portrait'); assert.equal(mobile.minAspectRatio, 9 / 16); assert.equal(mobile.maxAspectRatio, 10 / 16);
});
test('keeps the saved aspect ratio control within developer settings', async () => {
  const app = await readFile(new URL('../src/ui/app.tsx', import.meta.url), 'utf8');
  assert.match(app, /platform === "pc" && import\.meta\.env\.DEV/);
  assert.match(app, /layoutForPlatform\(platform, aspectRatio\)/);
  const [game, gameScreen] = await Promise.all(['../src/game/game.tsx', '../src/game/screens/game-screen.tsx'].map((path) => readFile(new URL(path, import.meta.url), 'utf8')));
  assert.match(game, /D Settings[\s\S]*AR: \{orientation === "landscape" \? "L" : "P"\}/);
  assert.match(game, /className="mobile_status"[\s\S]*canOverride[\s\S]*AR: \{orientation === "landscape" \? "L" : "P"\}/);
  assert.match(game, /setAspectRatio\(orientation === "landscape" \? "portrait" : "landscape"\)/);
  const settings = await readFile(new URL("../src/game/windows/settings-window.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(settings, /AR: |LayoutContext/);
  assert.match(gameScreen, /className="game-screen" data-orientation=\{orientation\}/);
  const css = await readFile(new URL('../src/ui/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.game-screen\[data-orientation="portrait"\]/);
  assert.doesNotMatch(css, /@media\s*\(max-aspect-ratio|@container\s*\(max-aspect-ratio/);
});
test('persists the developer character-pivot overlay and renders it above game art only when enabled', async (t) => {
  const { DEV_SETTINGS_STORAGE_KEYS, readDevBoolean, writeDevBoolean } = await import('../src/ui/dev-settings.ts');
  const values = new Map<string, string>();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); }, clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null, get length() { return values.size; },
  } satisfies Storage });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else Reflect.deleteProperty(globalThis, 'localStorage'); });
  assert.equal(DEV_SETTINGS_STORAGE_KEYS.pivots, 'rogues-dungeon.dev.show-pivot-points');
  assert.equal(readDevBoolean(DEV_SETTINGS_STORAGE_KEYS.pivots), false);
  writeDevBoolean(DEV_SETTINGS_STORAGE_KEYS.pivots, true);
  assert.equal(readDevBoolean(DEV_SETTINGS_STORAGE_KEYS.pivots), true);
  writeDevBoolean(DEV_SETTINGS_STORAGE_KEYS.pivots, false);
  assert.equal(readDevBoolean(DEV_SETTINGS_STORAGE_KEYS.pivots), false);
  const [app, game, renderer] = await Promise.all(['../src/ui/app.tsx', '../src/game/game.tsx', '../src/systems/rendering/babylon-render-system.tsx'].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  assert.match(app, /readDevBoolean\(DEV_SETTINGS_STORAGE_KEYS.pivots\)/);
  assert.match(app, /writeDevBoolean\(DEV_SETTINGS_STORAGE_KEYS.pivots, next\)/);
  assert.match(app, /useState\(readShowPivotPoints\)/);
  assert.match(app, /showPivotPoints: canOverride && showPivotPoints/);
  assert.match(game, /showPivotPoints=\{showPivotPoints\}/);
  assert.match(game, /PV: \{showPivotPoints \? 1 : 0\}/);
  assert.match(renderer, /showPivotPoints = false/);
  assert.match(renderer, /pivotMarkerLayer\.order = OVERLAY_RENDER_ORDER \+ 1/);
  assert.match(renderer, /updatePivotMarkers\(playerPivotMarkers, playerSprite, positionPx, pivotsVisible\)/);
  assert.match(renderer, /updatePivotMarkers\(actorPivotMarkers\[key\]\[i\], character, positionPx, pivotsVisible\)/);
  assert.match(renderer, /markers\.forEach\(\(marker\) => updateSprite2D\(marker, \{ positionPx: \[-10000, -10000\] \}\)\)/);
  assert.match(renderer, /showPivotPoints && <span className="world-view__grid-reticle-code"/);
});
test('loads Libron locally as the global game font', async () => {
  const [app, css, license] = await Promise.all([
    readFile(new URL('../src/ui/app.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/ui/style.css', import.meta.url), 'utf8'),
    readFile(new URL('../public/assets/fonts/libron/OFL.txt', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(app, /useLibron|toggleFont|data-game-font/);
  assert.match(css, /@font-face \{ font-family:"Libron"/);
  assert.match(css, /#browser_surface,#browser_surface \* \{ font-family:"Libron",serif !important; \}/);
  assert.match(license, /SIL OPEN FONT LICENSE/);
});
test('preserves the selected aspect ratio while the browser surface is fullscreen', async () => {
  const surface = await readFile(new URL('../src/ui/browser-surface.tsx', import.meta.url), 'utf8');
  assert.match(surface, /const viewport = error \? null : fitViewport\(size\.width, size\.height, activeLayout\)/);
  assert.match(surface, /fullscreenchange/);
  assert.doesNotMatch(surface, /size\.height > size\.width/);
});
test('uses a command desk and removes template corner units', async () => {
  const [game, controlsArea, app, css, settingsWindow, mobileControls, titleBar, informationPanels] = await Promise.all(['src/game/game.tsx', 'src/ui/ControlsArea.tsx', 'src/ui/app.tsx', 'src/ui/style.css', 'src/game/windows/settings-window.tsx', 'src/game/controls/mobile-controls.tsx', 'src/game/panels/title-bar.tsx', 'src/game/panels/information-panels.tsx'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(informationPanels, /PrimaryInfoPanel/); assert.match(informationPanels, /SecondaryInfoPanel/); assert.match(game, /Start Game/); assert.match(game, /D Settings/);
  assert.match(titleBar, /className="title-bar__left"/); assert.match(titleBar, /className="title-bar__right"/); assert.match(titleBar, /className="title-bar__identity"/); assert.match(titleBar, /className="title-bar__progress"/); assert.match(titleBar, /World: \{campaign\.world === "One" \? 1 : campaign\.world\}/);
  assert.match(titleBar, /aria-label="Time">⏱️<\/span>/); assert.match(titleBar, /data-ui-counter-icon="gold" role="img" aria-label="Gold"><span className="title-bar__icon-image title-bar__icon-sprite title-bar__icon-sprite--gold" style=\{\{ backgroundImage: `url\(\$\{itemAtlasBase\}items-animated\.png\)` \}\} \/><\/span><span className="title-bar__counter-value">\{counters\.gold\}/); assert.match(titleBar, /data-ui-counter-icon="key" role="img" aria-label="Keys"><span className="title-bar__icon-image title-bar__icon-sprite title-bar__icon-sprite--key" style=\{\{ backgroundImage: `url\(\$\{itemAtlasBase\}items-static\.png\)` \}\} \/><\/span><span className="title-bar__counter-value">\{String\(counters\.keys\)/);
  assert.doesNotMatch(titleBar, /titlebar_icon_group/); assert.doesNotMatch(css, /titlebar_icon_group/);
  assert.match(titleBar, /className="title-bar__identity" onClick=\{onSaveAndQuit\}>Rogue's Dungeon<\/button>/);
  assert.doesNotMatch(titleBar, /Dungeon Roguelite/);
  assert.match(titleBar, /className="title-bar__utility"/); assert.match(css, /\.title-bar__utility \{[^}]*align-items:center[^}]*padding:0 \.35em/);
  assert.match(settingsWindow, /Clear Local Storage/); assert.match(game, /clearRoguesDungeonBrowserStorage\(\)/); assert.match(game, /window\.location\.reload\(\)/);
  assert.match(css, /\.title-bar \.title-bar__select-utility \{ width:9\.5em; flex:0 0 9\.5em/); assert.match(css, /\.title-bar \.title-bar__select-utility select \{ width:7\.4em/);
  assert.match(titleBar, /const selectPreference = \(event: SyntheticEvent<HTMLElement>, preference: Partial<Preferences>\) => \{/);
  assert.match(game, /keyboardControlRows/); assert.match(game, /collapsedKeyboardGroups/); assert.match(controlsArea, /aria-label="Keyboard controls"/); assert.match(mobileControls, /dispatch\(\{ type: "wait" \}\)/); assert.match(mobileControls, /Quick 1/); assert.match(mobileControls, /Quick 2/); assert.match(mobileControls, />Wait<\/button>/); assert.match(game, /X: "Wait 1 time tick"/); assert.match(game, /key === "X" \? onWait/); assert.match(game, /onWait=\{\(\) => dispatch\(\{ type: "wait" \}\)\}/); assert.doesNotMatch(mobileControls, /Sprint:/); assert.doesNotMatch(mobileControls, /Sneak:/); assert.doesNotMatch(mobileControls, /\[1, 2, 3, 4\]/); assert.match(game, /<InputKey key=\{key\}/); assert.match(css, /\.mobile-controls__actions \{ display:grid; grid-template-columns:repeat\(3,1fr\)/); assert.match(css, /\.keyboard_tray_keys \{[^}]*grid-template-columns:repeat\(3,2\.25rem\)/);
  assert.match(titleBar, /<option value="deadzone">Deadzone<\/option>/);
  assert.doesNotMatch(app, /AppCorner/); assert.match(css, /mobile-controls/);
  assert.match(css, /grid-template-rows:4% 92% 4%/); assert.match(css, /grid-template-rows:4% 46% 4% 46%/);
  assert.match(css, /grid-template-columns:minmax\(0,56%\) minmax\(0,44%\)/);
  assert.match(css, /\.title-bar__identity \{[^}]*background:#1a1720/); assert.match(css, /\.title-bar__progress \{[^}]*justify-content:center/);
  assert.match(css, /align-items:center/);
});
test('renders the public My First Quest state in the Quest card', async () => {
  const [panel, css] = await Promise.all(['src/game/panels/information-panels.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(panel, /currentQuest\(campaign\)/); assert.match(panel, /quest\.title/); assert.match(panel, /quest\.items\.map/); assert.match(panel, /quest\.activeItemId === item\.id/);
  assert.match(panel, /quest-layout__item--complete/); assert.match(css, /quest-layout__item--complete[^\n]*text-decoration:line-through/);
});
test('hands pickups from the rendered Babylon projection into their destination UI layer', async () => {
  const [game, renderer, css] = await Promise.all(['src/game/game.tsx', 'src/systems/rendering/babylon-render-system.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(renderer, /renderedProjectionRef/); assert.match(renderer, /const tileCssSize = cellSizeAt\(rect\);[\s\S]*renderedProjectionRef\.current = \{ rect, center: cameraCenter, tileCssSize \}/);
  assert.match(renderer, /function visibleTarget\(selector: string\)/); assert.match(renderer, /\[data-ui-pickup-fallback\]/); assert.match(renderer, /onUiAnimationComplete\?\.\(flight\.id\); continue/);
  assert.match(renderer, /flight\.destination === "counter" \? "\.game-screen" : "\.game-screen__middle"/); assert.match(renderer, /destinationLayer\.append\(transfer\)/);
  assert.match(css, /width 500ms/); assert.match(css, /animation:world-view-ui-animation-flight 500ms/); assert.match(css, /0% \{ opacity:0; transform:translate\(-50%,-50%\) scale\(1\); \} 20% \{ opacity:1; transform:translate\(-50%,-50%\) scale\(1\.25\); \} 100% \{ opacity:1; transform:translate\(-50%,-50%\) scale\(1\); \}/); assert.match(renderer, /window\.setTimeout\(\(\) => \{ transfer\.remove\(\);/);
  assert.match(game, /data-ui-counter-icon/); assert.match(game, /destination = entity\.kind === "gold" \|\| entity\.kind === "key" \? "counter" : "row"/);
  assert.match(game, /data-ui-pickup-fallback/);
  assert.match(css, /z-index:10000/);
});
test('centers a new screen-mode page on the player', async () => {
  const renderer = await readFile(new URL('../src/systems/rendering/babylon-render-system.tsx', import.meta.url), 'utf8');
  assert.match(renderer, /const resetKey = \[state\.floor\.seed, mapWidth, mapHeight, cameraNow, zoomNow\]\.join\(":"\)/);
  assert.match(renderer, /previousCenter = cameraCenterRef\.current\?\.key === resetKey \? cameraCenterRef\.current : playerPosition/);
});
test('opens an in-game death recap when a player death event is committed', async () => {
  const [game, recap, mode, css] = await Promise.all(['../src/game/game.tsx', '../src/game/windows/death-recap-window.tsx', '../src/game/windows/select-mode-window.tsx', '../src/ui/style.css'].map((path) => readFile(new URL(path, import.meta.url), 'utf8')));
  assert.match(game, /event\.type === "player\.died"/); assert.match(game, /setDeathSequence\(\{ fatal: structuredClone\(result\.state\)/); assert.match(game, /setDeathRecap\(deathSequence\)/); assert.match(game, /<DeathRecapWindow campaign=\{deathRecap\.fatal\}/);
  assert.match(recap, /title="YOU DIED"/); assert.match(recap, /dismissible=\{false\}/); assert.match(recap, /Resume at Checkpoint/); assert.match(recap, /Restart Level/); assert.match(recap, /Return to Main Menu/);
  assert.match(mode, /title="Create Game"/); assert.match(mode, />Confirm<\/button>/); assert.match(mode, /Roguelike Berlin Criteria/);
  assert.match(css, /\.death-recap-window/); assert.match(css, /\.select-mode-window__cards/);
  assert.match(game, /setInterval\(\(\) => setSummaryNow\(Date\.now\(\)\), 60_000\)/);
  assert.match(game, /formatSavedAgo\(entry\.savedAt, summaryNow\)/);
});

test('saves a running game before returning to the main menu', async () => {
  const [game, settingsWindow] = await Promise.all(['../src/game/game.tsx', '../src/game/windows/settings-window.tsx'].map((path) => readFile(new URL(path, import.meta.url), 'utf8')));
  assert.match(settingsWindow, /Save &amp; Exit/);
  assert.match(game, /const saveAndQuit = useCallback/);
  assert.match(game, /const currentCampaign = sessionRef\.current\?\.getState\(\) \?\? campaign;/);
  assert.match(game, /writeSlot\(localStorage, slot, currentCampaign\);[\s\S]*setSummaries\(readSlotSummary\(localStorage\)\);[\s\S]*returnToMainMenu\(\);/);
  assert.match(game, /const requestSaveAndQuit = useCallback/);
  assert.match(game, /onSaveAndQuit=\{requestSaveAndQuit\}/);
  assert.match(game, /<ConfirmationDialog title="Are you sure\?" message="Save your progress and exit\."/);
});

test('saves and quits on Escape during play while Settings keeps Escape for closing the dialog', async () => {
  const [game, dialog] = await Promise.all(['../src/game/game.tsx', '../src/ui/dialog.tsx'].map((path) => readFile(new URL(path, import.meta.url), 'utf8')));
  assert.match(game, /event\.key !== "Escape" \|\| event\.repeat \|\| settings \|\| !campaign \|\| !slot/);
  assert.match(game, /saveAndQuit\(\);/);
  assert.match(dialog, /event\.key === "Escape"/);
});

test('uses randomSeed to seed only a newly selected save slot', async () => {
  const game = (await Promise.all(['../src/game/game.tsx', '../src/game/inventory-presentation.ts', '../src/game/controls/inventory-rows.tsx', '../src/game/controls/slot-item.tsx'].map(path => readFile(new URL(path, import.meta.url), 'utf8')))).join('\n');
  assert.match(game, /parseGameUrlOptions\(window\.location\.search\)/);
  assert.match(game, /const worldSeed = urlOptions.hasCompleteRunIdentity \? urlOptions.seed! : urlOptions.seed \?\? randomSeed \?\? readWorldSeed\(localStorage\)/);
  assert.match(game, /if \(!unsavedUrlRun && !override\) existing = readSlot\(localStorage, targetSlot\)/);
  const expression = game.match(/const initial = ([^;]+);/)?.[1];
  assert.ok(expression);
  const select = new Function('override', 'unsavedUrlRun', 'levelTest', 'objectTest', 'enemyTestMode', 'freshTestCampaign', 'existing', 'return ' + expression);
  const saved = { seed: 123 }, fresh = { seed: 456 }, override = { seed: 789 };
  let generated = 0;
  const createFresh = () => { generated++; return fresh; };
  assert.equal(select(null, false, false, false, false, createFresh, saved), saved, 'existing save wins over randomSeed-generated content');
  assert.equal(generated, 0, 'resuming a save must not generate a discarded campaign');
  assert.equal(select(null, false, false, false, false, createFresh, null), fresh, 'an empty slot uses the fresh seeded campaign');
  assert.equal(select(null, true, false, false, false, createFresh, saved), fresh, 'explicit URL run is separate from saved-slot resume');
  const beforeOverride = generated;
  assert.equal(select(override, false, false, false, false, createFresh, saved), override, 'explicit recovery override is preserved');
  assert.equal(generated, beforeOverride, 'Perf/recovery installation must not generate a discarded campaign');
  assert.match(game, /New Game · Seed \$\{randomSeed\}/);
});
test('supports deterministic direct-slot map-fix URLs', async () => {
  const game = (await Promise.all(['../src/game/game.tsx', '../src/game/inventory-presentation.ts', '../src/game/controls/inventory-rows.tsx', '../src/game/controls/slot-item.tsx'].map(path => readFile(new URL(path, import.meta.url), 'utf8')))).join('\n');
  assert.match(game, /parseGameUrlOptions\(window\.location\.search\)/);
  assert.match(game, /urlOptions\.slot/);
  assert.match(game, /urlOptions\.mapFix/);
  assert.match(game, /Open Editable Copy/);
});
test('derives sparse dungeon terrain from the verified Wang mapping', async () => {
  const [world, wang, generatedWang] = await Promise.all([
    readFile(new URL('../src/systems/rendering/world-render-system.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/systems/rendering/tile-map-system.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/systems/rendering/tileset-dungeon-wang.generated.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(world, /buildDungeonWangTerrain/);
  assert.match(wang, /DUNGEON_WANG_TILE_BY_MASK/);
  assert.match(wang, /tileset-dungeon-wang\.generated/);
  assert.match(generatedWang, /DUNGEON_CANONICAL_RULES/);
  assert.match(wang, /DUNGEON_WANG_INTERIOR_TILE = DUNGEON_WANG_TILE_BY_MASK\[255\] \?\? 13/);
});
test('exposes independent persisted SFX and Music controls in Settings', async () => {
  const [game, settingsWindow] = await Promise.all(['../src/game/game.tsx', '../src/game/windows/settings-window.tsx'].map((path) => readFile(new URL(path, import.meta.url), 'utf8')));
  const saves = await readFile(new URL('../src/systems/persistence/save-system.ts', import.meta.url), 'utf8');
  assert.match(settingsWindow, /aria-label="SFX volume"/); assert.match(settingsWindow, /aria-label="Music volume"/); assert.match(settingsWindow, /Mute All/);
  assert.match(game, /mutedByUrl=\{audio\.hardMuted\}/); assert.match(saves, /sfxVolume/); assert.match(saves, /musicVolume/);
});
test('uses the inventory grabber as a cue while the whole row is draggable', async () => {
  const game = (await Promise.all(['../src/game/game.tsx', '../src/game/inventory-presentation.ts', '../src/game/controls/inventory-rows.tsx', '../src/game/controls/slot-item.tsx'].map(path => readFile(new URL(path, import.meta.url), 'utf8')))).join('\n');
  assert.match(game, /function SlotItem/);
  assert.match(game, /key=\{`\$\{item\.id\}-\$\{secondary \? 1 : 0\}`\} type="inventory"/);
  assert.match(game, /"data-drag-kind": storage \? "lockbox" : "inventory"/);
  assert.match(game, /"aria-label": `Drag \$\{name\}`/);
  assert.match(game, /\{\.\.\.dropTarget\} \{\.\.\.dragSource\}/);
  const css = await readFile(new URL('../src/ui/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.slot_item\[data-drag-kind\]\{cursor:grab/);
});
test('makes equipment rows draggable and droppable everywhere', async () => {
  const game = (await Promise.all(['../src/game/game.tsx', '../src/game/inventory-presentation.ts', '../src/game/controls/inventory-rows.tsx', '../src/game/controls/slot-item.tsx'].map(path => readFile(new URL(path, import.meta.url), 'utf8')))).join('\n');
  assert.match(game, /function EquipmentItem/);
  assert.match(game, /"data-drag-kind": "slot", "data-drag-id": item\.id/);
  assert.match(game, /dropTarget=\{\{ "data-drop-group": group, "data-drop-index": index \}\}/);
  assert.doesNotMatch(game, /dragWholeRow/);
});
test('uses SlotItem for vertically aligned abilities and equipment', async () => {
  const [game, informationPanels, css] = await Promise.all(['src/game/game.tsx', 'src/game/panels/information-panels.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(game, /<SlotItem type="ability" slotType="ability" number=\{index\}/);
  assert.match(game, /slotType="ability"/); assert.match(game, /slotType="quickslot"/); assert.match(game, /slotType="equipment" slotSubtype=\{group\}/);
  assert.match(game, /accentColor=\{SLOT_COLORS\.ability\}/);
  assert.match(informationPanels, /GameCard title="Equipment"/);
  assert.match(game, /<EquipmentItem key=\{index\}/);
  assert.match(css, /\.slot_item \{[^}]*align-items:center/);
   assert.match(css, /\.slot_item \{[^}]*line-height:1\.15/);
  assert.match(css, /\.slot_item_number,\.slot_item_icon \{ color:var\(--slot-accent-color,#c6b994\)/);
  assert.doesNotMatch(css, /\.slot_item--ability \{/);
});

test('limits ability presentation and mobile controls to three positions', async () => {
  const [game, mobileControls, css] = await Promise.all(['src/game/game.tsx', 'src/game/controls/mobile-controls.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(game, /campaign\.player\.abilities\.slice\(0, 3\)/);
  assert.match(mobileControls, /\{\[0, 1, 2\]\.map/);
  assert.doesNotMatch(mobileControls, /\{\[0, 1, 2, 3\]\.map/);
  assert.match(css, /\.mobile-controls__abilities \{ display:grid; grid-template-columns:repeat\(3,1fr\)/);
});
test('centers plus markers for empty equipment and ability slots', async () => {
  const [game, css] = await Promise.all(['src/game/controls/slot-item.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(game, /aria-label=\{type === "ability" \? "Empty ability slot" : type === "quick" \? "Empty quick slot" : type === "inventory" \? "Empty inventory slot" : "Empty equipment slot"\}>\+<\/span>/);
  assert.match(css, /\.slot_item \{ position:relative;/);
  assert.match(css, /\.slot_item \.empty_slot\{position:absolute;left:50%;transform:translateX\(-50%\);display:grid;place-items:center/);
});
test('renders UI tooltips above every content-layer panel', async () => {
  const css = await readFile(new URL('../src/ui/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.game-card__tab-placement \{ position:absolute; z-index:1;[^}]*pointer-events:none; \}/);
  assert.match(css, /#ui_layer \{[^}]*z-index:\s*2147483647;/);
  assert.match(css, /\.ui_tooltip \{ position:absolute; z-index:10000;/);
});
test('matches inventory row spacing to the abilities list', async () => {
  const css = await readFile(new URL('../src/ui/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.view_list,\.slot_group \{ display:grid; gap:\.18rem; \}/);
  assert.match(css, /\.inventory_scroll \.scroll-area__viewport \{ display:grid; align-content:start; gap:\.18rem; \}/);
});
test('fills unused inventory capacity with empty plus slots', async () => {
  const rows = await readFile(new URL('../src/game/controls/inventory-rows.tsx', import.meta.url), 'utf8');
  const game = await readFile(new URL('../src/game/game.tsx', import.meta.url), 'utf8');
  assert.match(rows, /inventorySlotLayout\(stacks\.map/);
  assert.match(rows, /data-drop-inventory-slot/);
  assert.match(rows, /text="\[ Drop Item \]"/);
  assert.match(rows, /showDropItem &&/);
  assert.match(game, /capacity=\{effectiveInventoryCapacity\(campaign\)\}/);
});
test('uses permanent in-game scrollbars for the log and inventory', async () => {
  const css = await readFile(new URL('../src/ui/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.log_scroll,\.inventory_scroll \{ position:relative; height:100%; min-height:0;[^}]*overflow:visible/);
  assert.doesNotMatch(css, /\.scroll-area__viewport \{[^}]*border:/);
  assert.match(css, /\.info-panel--primary \.inventory_scroll,\.info-panel__log-card \.log_scroll \{ height:calc\(100% - 4px\); margin-top:0; \}/);
  assert.match(css, /\.scroll-area__track \{ position:absolute; top:0; right:-2px; bottom:0; width:4px;/);
  assert.match(css, /\.scroll-area__thumb \{ width:4px; min-height:12px;[^}]*background:#e4b85e;/);
  assert.match(css, /\.inventory_drop_item \{ justify-content:center; color:var\(--slot-disabled-color\); text-align:center; \}/);
  assert.match(css, /\.slot_scroll \{ height:100%; min-height:0;[^}]*overflow-y:auto/);
});
test('cycles one green Game View shader over only the primary game canvas', async () => {
  const [game, renderer, shaderSystem, css] = await Promise.all(['src/game/game.tsx', 'src/systems/rendering/babylon-render-system.tsx', 'src/systems/rendering/game-view-shader-system.ts', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(shaderSystem, /export class GameViewShaderSystem/);
  assert.match(shaderSystem, /id: 0, canvasClassName: null/);
  assert.match(shaderSystem, /id: 1, canvasClassName: "world-view__canvas--green-monochrome"/);
  assert.match(shaderSystem, /next\(id: GameViewShaderId\)/);
  assert.match(game, /S: \{gameViewShader\}/);
  assert.match(game, /setGameViewShader\(gameViewShaderSystem\.next\(gameViewShader\)\)/);
  assert.match(renderer, /gameViewShaderSystem\.canvasClassName\(gameViewShader, minimap\)/);
  assert.match(css, /\.world-view__canvas--green-monochrome \{ filter:grayscale\(1\) sepia\(1\) hue-rotate\(72deg\) saturate\(13\) contrast\(1\.45\) brightness\(\.72\); \}/);
  assert.doesNotMatch(renderer, /world-view__shader-layer/);
});
test('renders one transient resource pulse over the game view only', async () => {
  const [game, renderer, css] = await Promise.all(['src/game/game.tsx', 'src/systems/rendering/babylon-render-system.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(game, /resourceChangeEffects=\{resourceChangeEffects\}/);
  assert.match(renderer, /!minimap && resourceChangeEffects\.map/);
  assert.match(renderer, /world-view__resource-change-effect--\$\{effect\.color\}/);
  assert.match(css, /\.world-view__resource-change-effect \{ position:absolute; z-index:1; inset:1rem;[^}]*border:8px solid currentColor;[^}]*box-shadow:0 0 10px currentColor,inset 0 0 8px currentColor;[^}]*pointer-events:none;[^}]*animation:world-view-resource-change 650ms ease-out forwards,world-view-resource-fade 1000ms linear forwards/);
  assert.match(css, /world-view__resource-change-effect--health-loss[^}]*#ff625f/);
  assert.match(css, /world-view__resource-change-effect--health-gain[^}]*#67e879/);
  assert.match(css, /world-view__resource-change-effect--mana[^}]*#b88cff/);
  assert.match(css, /world-view__resource-change-effect \{[^}]*transform:scale\(1\.12\);[^}]*opacity:\.78/);
  assert.match(css, /@keyframes world-view-resource-change \{ to \{ transform:scale\(1\); \} \}/);
  assert.match(css, /@keyframes world-view-resource-fade \{ to \{ opacity:0; \} \}/);
});
test('renders transient item drag feedback without intercepting drops', async () => {
  const [game, dragPreview, css] = await Promise.all(['src/game/game.tsx', 'src/game/controls/item-drag-preview.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(game, /describeInventoryDrop/); assert.match(game, /setDragPresentation\(\{[^}]*source: current\.source/);
  assert.match(dragPreview, /export function ItemDragPreview/); assert.match(dragPreview, /drag\.source\.kind === "slot" \? "equipment" : drag\.source\.kind === "quick-slot" \? "quick" : "inventory"/); assert.match(dragPreview, /<SlotItem type="ability" number=\{drag\.source\.index\}/); assert.match(game, /drag_departure/); assert.match(game, /drag_landing/);
  assert.match(game, /Math\.hypot\(event\.clientX - current\.startX, event\.clientY - current\.startY\) < 6/);
  assert.match(game, /cancelPointerDrag = useCallback/);
  assert.match(game, /window\.addEventListener\("pointercancel", pointerCancel\)/);
  assert.match(css, /\.item-drag-preview\{[^}]*pointer-events:none/); assert.match(css, /\.item-drag-preview\{[^}]*width:min\(11rem/); assert.match(css, /\.drag_departure/); assert.match(css, /\.drag_landing/);
});
test('renders item comparison over the world with an inventory anchor', async () => {
  const [game, css] = await Promise.all(['../src/game/game.tsx', '../src/ui/style.css'].map((path) => readFile(new URL(path, import.meta.url), 'utf8')));
  const panels = await readFile(new URL('../src/game/panels/information-panels.tsx', import.meta.url), 'utf8');
  assert.match(panels, /className="info-panel__inventory-card"/);
  assert.match(game, /querySelector<HTMLElement>\("\.info-panel__inventory-card"\)/);
  assert.match(game, /querySelector<HTMLElement>\("\.world-view-region"\)/);
  assert.match(css, /\.item-comparison-panel \{ position:absolute;/);
});
test('dims keyboard inputs while their ability or quick slot is being dragged', async () => {
  const [game, css] = await Promise.all(['src/game/game.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(game, /drag\?\.source\.kind === "ability"/); assert.match(game, /drag\?\.source\.kind === "quick-slot"/); assert.match(game, /<StatusControls[^>]*drag=\{dragPresentation\}/);
  assert.match(css, /\.input-key--unavailable \{ --input-key-color:var\(--slot-disabled-color\)/);
});

test('renders the Stealth stat and progression dialog from game-rule state', async () => {
  const [game, attributePanel, progressionWindow] = await Promise.all(['../src/game/game.tsx', '../src/game/panels/attribute-panel.tsx', '../src/game/windows/progression-window.tsx'].map((path) => readFile(new URL(path, import.meta.url), 'utf8')));
  assert.match(attributePanel, /progressionStatNames/);
  assert.match(progressionWindow, /export function ProgressionWindow/);
  assert.match(game, /spend-attribute-points/);
  assert.match(progressionWindow, /attribute point/);
  assert.match(progressionWindow, /formatPendingAttributeBenefits/);
  assert.match(progressionWindow, /progression-window__results/);
  assert.match(progressionWindow, /Level Up — Character/);
  assert.match(progressionWindow, /Earned Results/);
  assert.match(progressionWindow, /attribute point/);
  assert.match(attributePanel, /Increase \$\{attributeLabels\[name\]\} to \$\{value \+ 1\}\./);
  assert.doesNotMatch(attributePanel, /\(\+1\)|\(-1\)/);
  assert.match(game, /const levelEvents = result\.events\.filter\(\(event\) => event\.type === "xp\.level\.changed"\)/);
  assert.match(game, /audio\.playEvents\(levelEvents\)/);
});

test('uses delta values to pulse only when an attribute turns red or green', async () => {
  const [attributePanel, css] = await Promise.all(['src/game/panels/attribute-panel.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(attributePanel, /export function DeltaValue/);
  assert.match(attributePanel, /if \(toneChanged && tone\) setPulseVersion/);
  assert.match(attributePanel, /<DeltaValue value=\{value\} tone=\{tone\}/);
  assert.match(css, /\.delta_value_number \{ color:#e8dec4; \}/);
  assert.match(css, /\.delta_value_green \{ color:#76c878; \}/);
  assert.match(css, /\.delta_value_red \{ color:#df6161; \}/);
  assert.match(css, /\.delta_value_pulse \{ animation:delta_value_pulse 300ms ease-out; \}/);
  assert.match(css, /@keyframes delta_value_pulse \{ 0%,100% \{ transform:scale\(1\); \} 50% \{ transform:scale\(2\); \} \}/);
});

test('adds a nested How To Play reference dialog to Settings', async () => {
  const [game, settingsWindow, helpWindow, dialog, css] = await Promise.all(['src/game/game.tsx', 'src/game/windows/settings-window.tsx', 'src/game/windows/how-to-play-window.tsx', 'src/ui/dialog.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  for (const topic of ['The Basics', 'Movement', 'Combat', 'Exploration', 'Quests', 'Items', 'Leveling Up', 'Saving Your Game', 'Tips']) assert.match(helpWindow, new RegExp(`\\["${topic}"`));
  assert.match(helpWindow, /title="How To Play"/); assert.match(helpWindow, /aria-haspopup="listbox"/); assert.match(helpWindow, /role="option"/); assert.match(helpWindow, /\{index \+ 1\}\. \{topic\}/); assert.match(helpWindow, /Left-click to walk or attack\. Right-click to run or attack\./);
  assert.match(helpWindow, /heading: "Keyboard"/); assert.match(helpWindow, /heading: "Mouse"/); assert.match(helpWindow, /heading: "Mobile"/); assert.match(helpWindow, /Mobile currently disabled\./);
  assert.match(helpWindow, /setSelectedTopic\(\(topic\) => topic - 1\)/); assert.match(helpWindow, /setSelectedTopic\(\(topic\) => topic \+ 1\)/); assert.match(helpWindow, /disabled=\{selectedTopic === 0\}/); assert.match(helpWindow, /disabled=\{selectedTopic === topics\.length - 1\}/);
  assert.match(settingsWindow, /How To Play/); assert.match(settingsWindow, /onOpenHowToPlay/); assert.match(settingsWindow, /dismissible=\{!helpOpen\}/);
  assert.match(settingsWindow, /bounds=\{bounds\}/); assert.match(settingsWindow, /onClick=\{\(event\) => openHowToPlay\(event\.currentTarget\)\}/); assert.match(settingsWindow, /onOpenHowToPlay\(bounds\)/); assert.match(helpWindow, /bounds=\{bounds\}/);
  assert.match(game, /const \[howToPlay, setHowToPlay\] = useState\(false\)/); assert.match(game, /<HowToPlayWindow origin="menu"/); assert.match(game, /<HowToPlayWindow origin="game"/);
  assert.match(dialog, /dismissible = true/); assert.match(dialog, /export interface DialogBounds/); assert.match(dialog, /function dialogBounds\(element: Element\)/); assert.match(dialog, /width: bounds\.width, height: bounds\.height/); assert.match(dialog, /if \(!dismissible\) return undefined/); assert.match(dialog, /onClick=\{dismissible \? requestClose : undefined\}/);
  assert.match(css, /\.dialog_backdrop:has\(\.how-to-play-window\) \{ z-index:4; \}/); assert.match(css, /\.dialog--bounded \{[^}]*box-sizing:border-box;[^}]*max-width:none;[^}]*max-height:none;/); assert.match(css, /\.how-to-play-window__topic-options \{ position:absolute;/); assert.match(css, /\.how-to-play-window__topic-trigger \{ display:flex;/); assert.match(css, /\.how-to-play-window__warning \{ padding:\.42rem/); assert.match(css, /\.how-to-play-window \.dialog_footer \{ justify-content:space-between; gap:\.5rem; \}/);
});
