import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import test from 'node:test';
import { JEWEL_CATALOG } from '../src/content/items/jewel-catalog.ts';
import { DROPPABLE_ITEM_ATLAS_LAYOUT, droppableItemMainOffsetXPx, droppableItemSpriteFrame, droppableItemSpriteSizePx } from '../src/systems/rendering/world-object-sprite-system.ts';

/** Decode the packed RGBA8 artifact, including all standard PNG scanline filters. */
function atlasPixels() {
  const bytes = readFileSync(new URL('../public/assets/art/game-view/items/droppable-item-sprite-sheet.png', import.meta.url));
  assert.equal(bytes.readUInt32BE(0), 0x89504e47); assert.equal(bytes[24], 8); assert.equal(bytes[25], 6);
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20), chunks: Buffer[] = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    if (bytes.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * 4, pixels = Buffer.alloc(width * height * 4);
  const paeth = (a: number, b: number, c: number) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]; assert.ok(filter <= 4);
    for (let x = 0; x < stride; x++) {
      const offset = y * stride + x, left = x >= 4 ? pixels[offset - 4] : 0, up = y ? pixels[offset - stride] : 0, corner = y && x >= 4 ? pixels[offset - stride - 4] : 0;
      const prediction = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : paeth(left, up, corner);
      pixels[offset] = (raw[y * (stride + 1) + x + 1] + prediction) & 255;
    }
  }
  return { width, height, pixels };
}

test('the packed atlas preserves legacy pixels and contains ten distinct transparent Jewel frames', () => {
  ['Extra Carrying Capacity +5', 'Heal', 'Wand', 'Dagger (Magic)', 'Sword', 'Two-Handed Sword', 'Leg Armor (Magic)', 'Chest Armor', 'Suit of Armor', 'Oak Shield 03', 'Wooden Stick', 'Wooden Vest'].forEach((name, frame) => assert.equal(droppableItemSpriteFrame(name), frame));
  const { width, height, pixels } = atlasPixels();
  const { cellWidthPx: cell, columns, rows } = DROPPABLE_ITEM_ATLAS_LAYOUT;
  assert.equal(width, cell * columns); assert.equal(height, cell * rows);
  assert.equal(createHash('sha256').update(pixels.subarray(0, width * cell * 3 * 4)).digest('hex'), '7c593a910e7b535ee0f3457c9c41ac6488476aacefce432f1d7376fc6986d3e2');
  const hashes = new Set<string>();
  for (const jewel of JEWEL_CATALOG) {
    const frame = droppableItemSpriteFrame(jewel.name); assert.equal(frame, jewel.frame);
    const tile = Buffer.alloc(cell * cell * 4); let alphaPixels = 0;
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
      const source: number = (((Math.floor(frame! / columns) * cell + y) * width) + (frame! % columns) * cell + x) * 4;
      pixels.copy(tile, (y * cell + x) * 4, source, source + 4);
      const alpha: number = pixels[source + 3]; if (alpha) alphaPixels++;
      if (x < 8 || x >= cell - 8 || y < 8 || y >= cell - 8) assert.equal(alpha, 0, `${jewel.name}: frame bleed`);
    }
    assert.ok(alphaPixels > 500 && alphaPixels < cell * cell * .8, jewel.name);
    hashes.add(createHash('sha256').update(tile).digest('hex'));
  }
  assert.equal(hashes.size, 10);
  for (const frame of [22, 23]) for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
    assert.equal(pixels[(((Math.floor(frame / columns) * cell + y) * width) + (frame % columns) * cell + x) * 4 + 3], 0);
  }
  assert.equal(droppableItemSpriteFrame('constructor'), null);
});

test('only the shield and full suit shift left while Jewels retain their accepted half size', () => {
  const names = ['Extra Carrying Capacity +5', 'Heal', 'Wand', 'Dagger (Magic)', 'Sword', 'Two-Handed Sword', 'Leg Armor (Magic)', 'Chest Armor', 'Suit of Armor', 'Oak Shield 03', 'Wooden Stick', 'Wooden Vest'];
  for (const name of names) {
    assert.equal(droppableItemSpriteSizePx(name), 32, name);
    assert.equal(droppableItemMainOffsetXPx(name), name === 'Suit of Armor' || name === 'Oak Shield 03' ? -8 : 0, name);
  }
  for (const jewel of JEWEL_CATALOG) {
    assert.equal(droppableItemSpriteSizePx(jewel.name), 16, jewel.name);
    assert.equal(droppableItemMainOffsetXPx(jewel.name), 0, jewel.name);
  }
  assert.equal(droppableItemMainOffsetXPx(null), 0);
  assert.equal(droppableItemMainOffsetXPx('unknown'), 0);
});

test('GPU, settled/throw presentation, and DOM transfer share the complete atlas metadata', () => {
  const renderer = readFileSync(new URL('../src/systems/rendering/babylon-render-system.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/ui/style.css', import.meta.url), 'utf8');
  assert.match(renderer, /createGridSpriteAtlas\(textures\.droppableItems, \{ \.\.\.DROPPABLE_ITEM_ATLAS_LAYOUT/);
  assert.match(renderer, /columns = dedicatedItem \? DROPPABLE_ITEM_ATLAS_LAYOUT\.columns/);
  assert.match(renderer, /rows = dedicatedItem \? DROPPABLE_ITEM_ATLAS_LAYOUT\.rows/);
  assert.match(renderer, /droppableItemSpriteFrame\(flight\.itemName\)/);
  assert.match(renderer, /droppableItemSpriteFrame\(throwItem\?\.itemName\)/);
  assert.match(css, /width:var\(--droppable-atlas-width\); height:var\(--droppable-atlas-height\)/);
});
