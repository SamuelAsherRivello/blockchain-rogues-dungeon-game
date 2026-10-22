import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { addSprite2D, createGridSpriteAtlas, createSprite2DLayer, type Sprite2DHandle, type Texture2D } from "@babylonjs/lite";
import { createCharacterSprite, hideCharacterSprite, setCharacterSpriteOrder, setCharacterSpriteTint, updateCharacterSprite } from "../src/systems/rendering/character-sprite-system.ts";
import { patchSprite, rememberSpritePatch } from "../src/systems/rendering/sprite-patch-system.ts";
import { createStaticLayerVisibility } from "../src/systems/rendering/static-layer-visibility-system.ts";
import { readPerformanceMetrics, resetPerformanceMetrics, resetPerformanceOptions, setPerformanceOptions } from "../src/systems/rendering/performance-system.ts";

function handleWithOrder(layer: { order: number }) {
  return { layer } as unknown as Sprite2DHandle;
}

test("keeps a composite sprite shadow directly before its main art", () => {
  const shadowLayer = { order: 0 };
  const mainLayer = { order: 0 };
  const character = createCharacterSprite(
    { handle: handleWithOrder(mainLayer), offsetPx: [0, 0] },
    { handle: handleWithOrder(shadowLayer), offsetPx: [0, 0] },
  );

  setCharacterSpriteOrder(character, 420);

  assert.equal(shadowLayer.order, 420);
  assert.equal(mainLayer.order, 421);
});

test("uses the same composite updater to hide the paired sprites", () => {
  const source = readFileSync(new URL("../src/systems/rendering/character-sprite-system.ts", import.meta.url), "utf8");
  assert.match(source, /export function hideCharacterSprite\(character: CharacterSprite\) \{\s*updateCharacterSprite\(character, \[-10000, -10000\], -10000\);/);
});

test("dormant characters perform no repeated GPU sprite patches", () => {
  const layer = { order: 0, visible: false };
  const character = createCharacterSprite(
    {handle:handleWithOrder(layer),offsetPx:[0,0]},
    {handle:handleWithOrder(layer),offsetPx:[0,0]},
  );
  setPerformanceOptions({enabled:true}); resetPerformanceMetrics();
  for(let frame=0;frame<100;frame++) hideCharacterSprite(character);
  assert.equal(readPerformanceMetrics().counts["sprite patches"] ?? 0, 0);
  resetPerformanceOptions();
});

function actualSprite() {
  const atlas = createGridSpriteAtlas({ width: 32, height: 32 } as Texture2D, { cellWidthPx: 32, cellHeightPx: 32 });
  const layer = createSprite2DLayer(atlas);
  const props = { positionPx: [16, 16] as [number, number], sizePx: [32, 32] as [number, number], color: [1, 1, 1, 1] as [number, number, number, number] };
  const handle = addSprite2D(layer, props); rememberSpritePatch(handle, props);
  return { handle, layer };
}

test("empty static rows skip draws and restore sprite patches after discovery or camera changes", () => {
  const a = actualSprite(), b = actualSprite();
  const sprites = [{ handle: a.handle, visible: true }, { handle: b.handle, visible: true }];
  const visibility = createStaticLayerVisibility([a.layer, b.layer], sprites);
  assert.equal(visibility.apply(true), true);
  visibility.update(() => { for (const sprite of sprites) { patchSprite(sprite.handle, { visible: false }); sprite.visible = false; } });
  visibility.apply(true);
  assert.equal(a.layer.visible, false); assert.equal(b.layer.visible, false);
  const before = (a.layer as unknown as { _version: number })._version;
  visibility.update(() => { patchSprite(a.handle, { visible: true }); sprites[0].visible = true; });
  visibility.apply(true);
  assert.equal(a.layer.visible, true); assert.equal(b.layer.visible, false);
  assert.equal((a.layer as unknown as { _version: number })._version, before + 1);
  visibility.apply(false); assert.equal(a.layer.visible, false);
  assert.equal(visibility.apply(true), true); assert.equal(a.layer.visible, true);
  assert.equal(visibility.apply(true), false);
});

test("unchanged fresh-array patches leave the real sprite buffer version untouched", () => {
  const { handle, layer } = actualSprite();
  const version = () => (layer as unknown as { _version: number })._version;
  const before = version();
  for (let frame = 0; frame < 100; frame++) assert.equal(patchSprite(handle, { positionPx: [16, 16], sizePx: [32, 32], color: [1, 1, 1, 1] }), false);
  assert.equal(version(), before);
  assert.equal(patchSprite(handle, { positionPx: [17, 16] }), true);
  assert.equal(version(), before + 1);
  assert.equal(patchSprite(handle, { positionPx: [16, 16] }), true);
  assert.equal(version(), before + 2);
});

test("characters and renderer overrides share actual patch state across tint, movement and visibility", () => {
  const main = actualSprite(), shadow = actualSprite();
  const character = createCharacterSprite({ handle: main.handle, offsetPx: [0, 0] }, { handle: shadow.handle, offsetPx: [0, 0] });
  updateCharacterSprite(character, [16, 16], 10);
  const buffers = () => [main.layer, shadow.layer].map(layer => (layer as unknown as { _instanceData: Float32Array })._instanceData);
  const versions = () => [main.layer, shadow.layer].map(layer => (layer as unknown as { _version: number })._version);
  const before = versions();
  for (let frame = 0; frame < 100; frame++) updateCharacterSprite(character, [16, 16], 10);
  assert.deepEqual(versions(), before);
  patchSprite(main.handle, { positionPx: [99, 16] });
  updateCharacterSprite(character, [16, 16], 10);
  assert.equal(buffers()[0][0], 16);
  setCharacterSpriteTint(character, [.5, .25, 1, 1]);
  updateCharacterSprite(character, [17, 16], 10);
  assert.equal(buffers()[0][0], 17); assert.equal(buffers()[0][9], .5); assert.equal(buffers()[0][10], .25);
  main.layer.visible = false; shadow.layer.visible = false;
  const hidden = versions(); updateCharacterSprite(character, [80, 80], 10);
  assert.deepEqual(versions(), hidden);
  main.layer.visible = true; shadow.layer.visible = true;
  updateCharacterSprite(character, [80, 80], 10);
  assert.equal(buffers()[0][0], 80);
  updateCharacterSprite(character, [100, 200], 10, { positionPx: [100, 190] }, 0, 0, 1, [23, 12]);
  assert.equal(buffers()[0][1], 190);
  assert.equal(buffers()[1][2], 23); assert.equal(buffers()[1][3], 12);
  const pickupVersions = versions();
  updateCharacterSprite(character, [100, 200], 10, { positionPx: [100, 190] }, 0, 0, 1, [23, 12]);
  assert.deepEqual(versions(), pickupVersions);
});
