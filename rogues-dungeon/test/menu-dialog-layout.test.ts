import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const game = await readFile(new URL("../src/game/game.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/ui/style.css", import.meta.url), "utf8");
const renderer = await readFile(new URL("../src/systems/rendering/babylon-render-system.tsx", import.meta.url), "utf8");

test("menu dialogs keep Start Game bounds live while gameplay Settings stays centered", () => {
  assert.match(game, /const \[menuDialogBounds, setMenuDialogBounds\] = useState<DialogBounds \| null>\(null\)/);
  assert.match(game, /const measureMenuDialogBounds = useCallback\(\(\) =>/);
  assert.match(game, /new ResizeObserver\(sync\)/);
  assert.match(game, /window\.addEventListener\("resize", sync\)/);
  assert.match(game, /document\.addEventListener\("fullscreenchange", sync\)/);
  assert.match(game, /bounds=\{menuDialogBounds \?\? creationBoundsRef\.current\}/);
  assert.match(game, /bounds=\{menuDialogBounds \?\? settingsBoundsRef\.current\}/);
  assert.match(game, /<SettingsWindow origin="game" center=\{gameSettingsCenter\}/);
});

test("menu and game Settings share the Start Game typography tiers without inheriting height compression", () => {
  assert.match(css, /\.settings-window--menu \.dialog_header h2,\.settings-window--game \.dialog_header h2 \{[^}]*font-size:clamp\(1rem,1\.5vw,1\.45rem\)/);
  assert.match(css, /\.settings-window--menu \.settings-window__actions,\.settings-window--game \.settings-window__actions \{ font-size:1rem; font-weight:normal; \}/);
  assert.match(css, /:is\(\.settings-window--menu,\.settings-window--game\) \.settings-window__actions \{ gap:\.35rem; font-size:\.68rem; \}/);
  assert.match(css, /:is\(\.settings-window--menu,\.settings-window--game\) \.settings-window__actions \{ gap:\.25rem; font-size:\.58rem; \}/);
  assert.match(css, /:is\(\.settings-window--menu,\.settings-window--game\) :is\(\.settings-window__slider,\.settings-window__mute\) \{ font-size:\.68rem; \}/);
  assert.match(css, /:is\(\.settings-window--menu,\.settings-window--game\) :is\(\.settings-window__slider,\.settings-window__mute\) \{ font-size:\.58rem; \}/);
  assert.match(css, /\.main-menu-window__footer button \{ padding:\.45rem; font-size:\.68rem; font-weight:normal; \}/);
  assert.match(css, /\.main-menu-window__footer button \{ padding:\.35rem; font-size:\.58rem; font-weight:normal; \}/);
});

test("compact dialog bodies own overflow while headers and action rows stay explicit", () => {
  assert.match(css, /\.settings-window--menu \.dialog_body \{ min-height:0; padding:\.55rem; overflow:auto; \}/);
  assert.match(css, /\.settings-window--menu \.dialog_header \{ flex-basis:2\.75rem; padding-inline:\.75rem; \}/);
  assert.match(css, /\.settings-window--menu \.dialog_close \{ font-size:1\.15rem; \}/);
  assert.match(css, /\.create-character-window \.dialog_body \{ padding:\.7rem; min-height:0; overflow:auto; \}/);
  assert.match(css, /\.create-character-window \.dialog_body \{ padding:\.55rem; min-height:0; overflow:auto; \}/);
});

test("world preview rendering waits for usable host dimensions and redraws after layout", () => {
  assert.match(renderer, /const hostRect = host\.getBoundingClientRect\(\);\s*if \(hostRect\.width <= 0 \|\| hostRect\.height <= 0\) return;/);
  assert.match(renderer, /const resizeAndDraw = \(\) => \{\s*const rect = host\.getBoundingClientRect\(\);\s*if \(rect\.width <= 0 \|\| rect\.height <= 0\) return;/);
  assert.match(renderer, /const observer = new ResizeObserver\(resizeAndDraw\); observer\.observe\(host\); observers\.push\(observer\);/);
  assert.match(renderer, /requestAnimationFrame\(\(\) => \{ if \(!cancelled\) resizeAndDraw\(\); \}\);/);
  assert.match(css, /\.create-world-window__preview \{ flex:1 1 0; width:100%; min-width:0; min-height:3\.5rem;/);
});
