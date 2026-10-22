import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { DUNGEON_CANONICAL_RULES } from "../src/systems/rendering/tileset-dungeon-wang.generated.ts";
import { parseDungeonTilesetRules, ruleForMask, wangIdForMask, wallQuartersForMask } from "../src/systems/rendering/tileset-wang-rules.ts";
import { buildDungeonWangTerrain, buildDungeonWangWalls, serializeFloorToTiled, validateTiledRepairMap } from "../src/systems/rendering/tile-map-system.ts";
import { createCampaign, createRunCampaign, generateFloor } from "../src/systems/procedural/world-procedural-system.ts";
import { buildManualTileScenario } from "../src/systems/procedural/manual-tile-scenarios.ts";

const tsxPath = new URL("../public/assets/art/vendors/dungeons-and-pixels-v1.4/tiled-examples/tilesets/tileset-dungeon.tsx", import.meta.url);

test("parses the authoritative TSX and resolves its declared atlas", async () => {
  const xml = await readFile(tsxPath, "utf8");
  const rules = parseDungeonTilesetRules(xml);
  const source = rules.imageSource;
  const imagePath = resolve(dirname(fileURLToPath(tsxPath)), source);
  await stat(imagePath);
  assert.deepEqual({ tileWidth: rules.tileWidth, tileHeight: rules.tileHeight, tileCount: rules.tileCount, columns: rules.columns, imageWidth: rules.imageWidth, imageHeight: rules.imageHeight }, { tileWidth: 32, tileHeight: 32, tileCount: 108, columns: 12, imageWidth: 384, imageHeight: 288 });
  assert.deepEqual([...rules.families.keys()], ["Room frame", "Void frame", "Details", "Details alternate", "Generated wall boundary"]);
});

test("keeps generated canonical rules exactly aligned with the TSX", async () => {
  const xml = await readFile(tsxPath, "utf8");
  const parsed = parseDungeonTilesetRules(xml);
  assert.deepEqual(parsed.floorTiles, DUNGEON_CANONICAL_RULES.floorTiles);
  assert.deepEqual(parsed.inwardCornerRules, DUNGEON_CANONICAL_RULES.inwardCornerRules);
  assert.deepEqual(parsed.wallQuarterProfiles, DUNGEON_CANONICAL_RULES.wallQuarterProfiles);
  assert.equal(parsed.families.size, DUNGEON_CANONICAL_RULES.families.size);
  for (const [familyName, expectedFamily] of DUNGEON_CANONICAL_RULES.families) {
    const sourceFamily = parsed.families.get(familyName);
    assert.ok(sourceFamily, `missing ${familyName} in TSX`);
    assert.equal(sourceFamily.rules.length, expectedFamily.rules.length);
    for (const expected of expectedFamily.rules) assert.equal(sourceFamily!.byMask.get(expected.mask)?.tileId, expected.tileId, `${familyName} mask ${expected.mask}`);
    for (const expected of expectedFamily.rules) assert.deepEqual(sourceFamily.byMask.get(expected.mask)?.wangId, expected.wangId);
  }
  assert.equal(ruleForMask(DUNGEON_CANONICAL_RULES, "Generated wall boundary", 112)?.tileId, 5);
  assert.equal(ruleForMask(DUNGEON_CANONICAL_RULES, "Generated wall boundary", 64)?.tileId, 17);
});

test("normalizes Wang order into the documented bit mask", () => {
  assert.deepEqual(wangIdForMask(112), [0, 0, 0, 0, 1, 1, 1, 0]);
  assert.deepEqual(wangIdForMask(64), [0, 0, 0, 0, 0, 0, 1, 0]);
});

test("rejects undeclared or nonbinary colors instead of collapsing their identities", () => {
  const base = `<tileset tilewidth="32" tileheight="32" tilecount="108" columns="12"><image source="tileset-dungeon.png" width="384" height="288"/><wangset name="Room frame"><wangcolor name="Wall"/><wangtile tileid="0" wangid="0,0,2,2,2,0,0,0"/></wangset></tileset>`;
  assert.throws(() => parseDungeonTilesetRules(base), /undeclared Wang color/);
  assert.throws(() => parseDungeonTilesetRules(base.replace('<wangcolor name="Wall"/>', '<wangcolor name="Wall"/><wangcolor name="Other"/>')), /full Wang color identity/);
});

test("rejects malformed, conflicting, and out-of-bounds TSX rules", () => {
  const base = `<tileset tilewidth="32" tileheight="32" tilecount="108" columns="12"><image source="tileset-dungeon.png" width="384" height="288"/><wangsets><wangset name="Room frame"><wangtile tileid="0" wangid="0,0,1,1,1,0,0,0"/></wangset></wangsets></tileset>`;
  assert.throws(() => parseDungeonTilesetRules(base.replace("0,0,1,1,1,0,0,0", "0,0,1")), /invalid Wang ID/);
  assert.throws(() => parseDungeonTilesetRules(base.replace("tileid=\"0\"", "tileid=\"108\"")), /outside the atlas/);
  const conflict = base.replace("</wangset>", `<wangtile tileid="1" wangid="0,0,1,1,1,0,0,0"/></wangset>`);
  assert.throws(() => parseDungeonTilesetRules(conflict), /maps to both tile/);
});

test("resolves every supported generated mask with zero missing floor or boundary artwork", () => {
  const floors = [
    ...[17, 914, 13579, 1, 42, 404, 2026, 777].flatMap((seed) => [1, 2, 3].map((corridorWidth) => generateFloor(1, seed, 1, { corridorWidth }))),
    buildManualTileScenario("corridor-joins", 13579, 1)!,
    buildManualTileScenario("wang-topology-matrix", 13579, 1)!,
  ];
  for (const floor of floors) {
    const terrain = buildDungeonWangTerrain({ cells: floor.cells });
    const walls = buildDungeonWangWalls({ cells: floor.cells });
    assert.deepEqual(terrain.diagnostics, []);
    assert.deepEqual(walls.wallDiagnostics, []);
    assert.ok(terrain.terrain.every(entry => entry.frame !== null));
    assert.ok(walls.walls.every(entry => entry.frame !== null));
    assert.equal(ruleForMask(DUNGEON_CANONICAL_RULES, "Generated wall boundary", 112)?.tileId, 5);
    assert.equal(ruleForMask(DUNGEON_CANONICAL_RULES, "Generated wall boundary", 64)?.tileId, 17);
  }
});

test("source quarter profiles cover all contact patterns and reject malformed input", () => {
  assert.equal(wallQuartersForMask(DUNGEON_CANONICAL_RULES, -1), null);
  assert.equal(wallQuartersForMask(DUNGEON_CANONICAL_RULES, 256), null);
  assert.equal(wallQuartersForMask({ ...DUNGEON_CANONICAL_RULES, wallQuarterProfiles: {} }, 17), null);
  for (let mask = 1; mask <= 255; mask++) {
    const result = wallQuartersForMask(DUNGEON_CANONICAL_RULES, mask)!;
    assert.equal(result.length, 4);
    assert.ok(result.every(({ tileId }) => tileId >= 0 && tileId < 108));
  }
});

test("rectangular room has source-verified exterior corners and uninterrupted faces", () => {
  const map = Array.from({ length: 7 }, (_, y) => Array.from({ length: 7 }, (_, x) => x >= 2 && x <= 4 && y >= 2 && y <= 4 ? 0 : 1));
  const { walls, wallDiagnostics } = buildDungeonWangWalls({ map });
  const at = (x: number, y: number) => walls.find(cell => cell.x === x && cell.y === y)?.frame;
  assert.deepEqual(wallDiagnostics, []);
  assert.deepEqual([at(1, 1), at(5, 1), at(1, 5), at(5, 5)], [0, 5, 48, 53]);
  assert.deepEqual([at(3, 1), at(1, 3), at(5, 3), at(3, 5)], [1, 12, 17, 49]);
});

test("inward corners use TSX rules in every orientation regardless of diagonal contacts", () => {
  const neighbors = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  for (let mask = 1; mask <= 255; mask++) {
    const expected = DUNGEON_CANONICAL_RULES.inwardCornerRules[(mask & 85) as keyof typeof DUNGEON_CANONICAL_RULES.inwardCornerRules];
    if (expected === undefined) continue;
    const map = Array.from({ length: 5 }, () => Array<number>(5).fill(1));
    neighbors.forEach(([dx, dy], bit) => { if (mask & (1 << bit)) map[2 + dy][2 + dx] = 0; });
    const cell = buildDungeonWangWalls({ map }).walls.find(entry => entry.x === 2 && entry.y === 2);
    assert.equal(cell?.frame, expected, `contact mask ${mask}`);
    assert.equal(cell?.quarters, undefined);
  }
});

test("seed 3266798470 distinguishes inward joins from outward reference corners", async () => {
  const source = parseDungeonTilesetRules(await readFile(tsxPath, "utf8"));
  assert.equal(source.inwardCornerRules[80], 30);
  assert.equal(source.inwardCornerRules[20], 32);
  const campaign = createRunCampaign(3266798470, 1, 1, 1, 1);
  const { walls, wallDiagnostics } = buildDungeonWangWalls({ cells: campaign.floor.cells });
  assert.deepEqual(wallDiagnostics, []);
  for (const [x, y, expected] of [[40, 47, 30], [54, 53, 30], [40, 54, 30], [45, 57, 30], [38, 47, 32], [46, 47, 32], [46, 54, 48], [58, 52, 53]]) {
    const cell = walls.find(entry => entry.x === x && entry.y === y);
    assert.equal(cell?.frame, expected, `reference corner at ${x},${y}`);
    assert.equal(cell?.quarters, undefined, "reference corners use the whole production tile");
  }
});

test("preserves the canonical repair layer contract in exported fixtures", async () => {
  const matrix = JSON.parse(await readFile(new URL("../public/debug/fixtures/dungeon-wang-fixtures.json", import.meta.url), "utf8"));
  assert.deepEqual(matrix.layerContract, ["Grounds", "Walls", "Pickups", "Decorations"]);
  assert.ok(matrix.fixtures.every((fixture: { topology: string; ruleFamily: string }) => fixture.topology && fixture.ruleFamily));
  const map = serializeFloorToTiled({ campaign: createCampaign(17) });
  assert.equal(validateTiledRepairMap(map).valid, true);
});
