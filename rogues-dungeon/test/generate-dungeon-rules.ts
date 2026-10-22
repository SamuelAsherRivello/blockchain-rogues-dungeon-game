import { readFileSync } from "node:fs";
import { parseDungeonTilesetRules } from "../src/systems/rendering/tileset-wang-rules.ts";

// Prints a deterministic typed module. Review it before replacing the artifact.
const xml = readFileSync(new URL("../public/assets/art/vendors/dungeons-and-pixels-v1.4/tiled-examples/tilesets/tileset-dungeon.tsx", import.meta.url), "utf8");
const parsed = parseDungeonTilesetRules(xml);
const { families, ...geometry } = parsed;
const entries = [...families].map(([name, family]) => [name, family.rules]);
console.log(`/* Generated from tileset-dungeon.tsx. */
import type { DungeonWangFamily, DungeonWangRule } from "./tileset-wang-rules.ts";
const source = ${JSON.stringify(entries, null, 2)} as const;
export const DUNGEON_CANONICAL_FAMILIES: ReadonlyMap<string, DungeonWangFamily> = new Map(source.map(([name, entries]) => {
  const rules: readonly DungeonWangRule[] = entries;
  return [name, { name, rules, byMask: new Map(rules.map(rule => [rule.mask, rule])) }];
}));
export const DUNGEON_CANONICAL_RULES = Object.freeze({ ...${JSON.stringify(geometry, null, 2)}, families: DUNGEON_CANONICAL_FAMILIES });`);
