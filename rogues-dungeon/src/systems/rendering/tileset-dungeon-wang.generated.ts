/* Generated from public/assets/art/vendors/dungeons-and-pixels-v1.4/tiled-examples/tilesets/tileset-dungeon.tsx. */
import { wangIdForMask, type DungeonWangFamily, type DungeonWangFamilyName, type DungeonWangRule } from "./tileset-wang-rules.ts";

const family = (name: DungeonWangFamilyName, entries: Readonly<Record<number, number>>): DungeonWangFamily => {
  const rules = Object.entries(entries).map(([maskValue, tileId]) => {
    const mask = Number(maskValue);
    return { family: name, tileId, wangId: Object.freeze(wangIdForMask(mask)), mask } satisfies DungeonWangRule;
  });
  return { name, rules: Object.freeze(rules), byMask: new Map(rules.map((rule) => [rule.mask, rule])) };
};

export const DUNGEON_CANONICAL_FAMILIES: ReadonlyMap<string, DungeonWangFamily> = new Map([
  ["Room frame", family("Room frame", { 7: 48, 28: 0, 31: 12, 112: 5, 124: 1, 193: 53, 199: 52, 241: 17, 255: 13 })],
  ["Void frame", family("Void frame", { 7: 30, 28: 6, 31: 18, 112: 8, 124: 7, 193: 32, 199: 31, 241: 20, 255: 19 })],
  ["Details", family("Details", { 1: 33, 16: 9, 17: 21, 29: 23, 113: 11, 124: 35 })],
  ["Details alternate", family("Details alternate", { 29: 59, 113: 47 })],
  ["Generated wall boundary", family("Generated wall boundary", {
    1: 49, 2: 48, 4: 12, 5: 12, 8: 0, 15: 8, 16: 1, 17: 1, 20: 1, 32: 5, 60: 53, 62: 53, 64: 17, 65: 17, 68: 17, 80: 1, 112: 5,
    128: 53, 135: 8, 143: 8, 195: 6, 225: 6, 226: 59, 227: 6, 230: 21, 232: 34, 236: 21, 238: 21, 248: 48,
  })],
]);

export const DUNGEON_CANONICAL_RULES = Object.freeze({
  inwardCornerRules: { 5: 8, 20: 32, 65: 6, 80: 30 },
  floorTiles: [13, 25, 26, 28, 37, 38, 39],
  wallQuarterProfiles: {
    nw: [19, 49, 17, 6, 53, 49, 17, 6],
    ne: [19, 49, 12, 8, 48, 49, 12, 8],
    sw: [19, 1, 17, 30, 5, 1, 17, 30],
    se: [19, 1, 12, 32, 0, 1, 12, 32],
  },
  tileWidth: 32,
  tileHeight: 32,
  tileCount: 108,
  columns: 12,
  imageSource: "../../tilesets/tileset-dungeon.png",
  imageWidth: 384,
  imageHeight: 288,
  families: DUNGEON_CANONICAL_FAMILIES,
});
