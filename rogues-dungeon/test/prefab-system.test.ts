import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { AUTHORED_OBJECT_IMAGES, authoredDecorationFrame, authoredDecorationPresentation } from "../src/systems/rendering/authored-decoration-system.ts";
import { createSemanticCells, setCell } from "../src/systems/procedural/level-grid-system.ts";
import { HERO_HOUSE_PREFAB, PLAYER_HOME_PREFAB, prefabPortalEntrance, prefabPortalEntrances, stampPrefab, validatePrefab, validatePrefabPlacement } from "../src/systems/procedural/prefab-system.ts";
import { applyAction, compactCampaignForSave, createCampaign, createRunCampaign, generateFloor, PORTAL_LAYOUT_VERSION, restoreCompactCampaign, upgradeCampaignResources } from "../src/systems/procedural/world-procedural-system.ts";
import { findCardinalPath } from "../src/game/a-star.ts";
import { DUNGEON_TOPOLOGY_VERSION } from "../src/systems/procedural/dungeon-topology-system.ts";

const homeTmx = readFileSync(new URL("../public/assets/art/game-view/maps/prefabs/player-home.tmx", import.meta.url), "utf8");

test("prefab portal arrows point into the wall from their sole cardinal approach", () => {
  for (const [x, y, direction] of [[2, 3, "n"], [1, 2, "e"], [2, 1, "s"], [3, 2, "w"]] as const) {
    const cells = createSemanticCells(5, 5);
    cells[y][x] = { walkable: true, role: "ground" };
    assert.deepEqual(prefabPortalEntrance(cells, { x: 2, y: 2 }), { approach: { x, y }, direction });
    cells[2][2] = { walkable: true, role: "ground" };
    assert.equal(prefabPortalEntrance(cells, { x: 2, y: 2 }), null);
  }
  const cells = createSemanticCells(5, 5);
  assert.equal(prefabPortalEntrance(cells, { x: 2, y: 2 }), null);
  cells[3][2] = { walkable: true, role: "ground" };
  cells[2][1] = { walkable: true, role: "ground" };
  assert.equal(prefabPortalEntrance(cells, { x: 2, y: 2 }), null);
  assert.equal(prefabPortalEntrance(cells, { x: 0, y: 0 }), null);
});

test("prefab arrow footprints require every matching wall cell and approach without rotation", () => {
  const cells = createSemanticCells(7, 7);
  for (const x of [2, 3, 4]) cells[4][x] = { walkable: true, role: "ground" };
  const origin = { x: 2, y: 3 };
  const pair = prefabPortalEntrances(cells, PLAYER_HOME_PREFAB, origin);
  assert.deepEqual(pair, [
    { x: 2, y: 3, direction: "n", approach: { x: 2, y: 4 } },
    { x: 3, y: 3, direction: "n", approach: { x: 3, y: 4 } },
  ]);
  const wider = { ...PLAYER_HOME_PREFAB, teleportArrows: [...PLAYER_HOME_PREFAB.teleportArrows!, { x: 6, y: 9, direction: "s" as const }] };
  assert.equal(prefabPortalEntrances(cells, wider, origin)?.length, 3);
  cells[4][3].walkable = false;
  assert.equal(prefabPortalEntrances(cells, PLAYER_HOME_PREFAB, origin), null);
  cells[4][3].walkable = true;
  cells[3][3] = { walkable: true, role: "ground" };
  assert.equal(prefabPortalEntrances(cells, PLAYER_HOME_PREFAB, origin), null);

  const vertical = { ...PLAYER_HOME_PREFAB, teleportArrows: [{ x: 0, y: 2, direction: "w" as const }, { x: 0, y: 3, direction: "w" as const }] };
  const sideWall = createSemanticCells(7, 7);
  sideWall[2][1] = sideWall[3][1] = { walkable: true, role: "ground" };
  assert.deepEqual(prefabPortalEntrances(sideWall, vertical, { x: 2, y: 2 })?.map(({ direction }) => direction), ["e", "e"]);
  assert.equal(prefabPortalEntrances(sideWall, PLAYER_HOME_PREFAB, { x: 2, y: 2 }), null);
});

test("generated prefab entrances match the home's adjacent arrow pair and keep both approaches clear", () => {
  for (const level of [1, 2, 5]) for (const seed of [17, 77, 611, 914]) for (const level1TestMode of [false, true]) {
    const floor = generateFloor(level, seed, 1, { level1TestMode, topologyVersion: DUNGEON_TOPOLOGY_VERSION, portalLayoutVersion: PORTAL_LAYOUT_VERSION });
    const portals = floor.entities.filter((entity) => entity.kind === "teleport-arrow");
    assert.equal(portals.length, PLAYER_HOME_PREFAB.teleportArrows!.length);
    assert.deepEqual(portals.map(({ x, y, direction }) => ({ x: x - portals[0].x, y: y - portals[0].y, direction })), [
      { x: 0, y: 0, direction: "n" }, { x: 1, y: 0, direction: "n" },
    ]);
    for (const portal of portals) {
      const approach = [{ x: portal.x, y: portal.y - 1 }, { x: portal.x + 1, y: portal.y }, { x: portal.x, y: portal.y + 1 }, { x: portal.x - 1, y: portal.y }]
        .filter(({ x, y }) => floor.cells[y][x].walkable && !portals.some((other) => other.x === x && other.y === y));
      assert.deepEqual(approach, [{ x: portal.x, y: portal.y + 1 }], `level ${level}, seed ${seed}`);
      assert.ok(floor.cells[portal.y][portal.x].walkable);
      assert.ok(findCardinalPath(floor, floor.start, portal));
      assert.equal(floor.entities.some((entity) => entity.x === approach[0].x && entity.y === approach[0].y), false);
    }
  }
});

test("both dungeon entrance arrows survive saves and support a home round trip", () => {
  for (const index of [0, 1]) {
    const campaign = restoreCompactCampaign(compactCampaignForSave(createRunCampaign(613, 1, 1, 1, 1, { level1TestMode: true })));
    const portals = campaign.floor.entities.filter((entity) => entity.kind === "teleport-arrow");
    assert.equal(portals.length, 2);
    const portal = portals[index];
    campaign.player.x = portal.x; campaign.player.y = portal.y;
    const entered = applyAction(campaign, { type: "enter-teleport" });
    assert.ok(entered.accepted);
    const home = restoreCompactCampaign(compactCampaignForSave(entered.state));
    const exit = home.floor.entities.filter((entity) => entity.kind === "teleport-arrow")[index];
    home.player.x = exit.x; home.player.y = exit.y;
    const returned = applyAction(home, { type: "enter-teleport" });
    assert.ok(returned.accepted);
    assert.deepEqual({ x: returned.state.player.x, y: returned.state.player.y }, { x: portal.x, y: portal.y + 1 });
    assert.equal(returned.state.floor.entities.filter((entity) => entity.kind === "teleport-arrow").length, 2);
  }
});

test("keeps runtime home layers in sync with the authored TMX without duplicating object art", () => {
  const layers = [...homeTmx.matchAll(/<layer\b[^>]*name="([^"]+)"[^>]*>[\s\S]*?<data encoding="csv">([\s\S]*?)<\/data>/g)].map(([, name, csv]) => ({ name, gids: csv.trim().split(/\s*,\s*/).map(Number) }));
  assert.deepEqual(PLAYER_HOME_PREFAB.tiledGrounds, layers.find(({ name }) => name === "Grounds")!.gids);
  assert.deepEqual(PLAYER_HOME_PREFAB.tiledWalls, layers.find(({ name }) => name === "Walls")!.gids);
  assert.deepEqual(PLAYER_HOME_PREFAB.tiledDecorations, layers.filter(({ name }) => name.startsWith("Decoration")).flatMap(({ gids }) => gids.flatMap((gid, index) => gid ? [{ gid, x: index % 10, y: Math.floor(index / 10) }] : [])));
  const arrows = [...homeTmx.matchAll(/<object\b[^>]*type="teleport-arrow"[^>]*>[\s\S]*?<\/object>/g)].map(([object]) => {
    const [, x, y] = object.match(/<property name="grid" value="(\d+),(\d+)"\/>/)!;
    const [, direction] = object.match(/<property name="direction" value="([nesw])"\/>/)!;
    return { x: Number(x), y: Number(y), direction };
  });
  assert.deepEqual(PLAYER_HOME_PREFAB.teleportArrows, arrows);
});

test("resolves Tiled collection IDs to original images and native sizes instead of packed sheet cells", () => {
  const tsx = readFileSync(new URL("../public/assets/art/game-view/tilesets/examples/objects-overlay.tsx", import.meta.url), "utf8");
  const images = [...tsx.matchAll(/<tile id="(\d+)">\s*<image source="\.\.\/\.\.\/props\/static\/([^"]+)\.png" width="(\d+)" height="(\d+)"/g)];
  assert.equal(images.length, AUTHORED_OBJECT_IMAGES.length);
  for (const [, id, name, width, height] of images) {
    assert.deepEqual(AUTHORED_OBJECT_IMAGES[Number(id)], [name, Number(width), Number(height)]);
    const png = readFileSync(new URL(`../public/assets/art/game-view/props/static/${name}.png`, import.meta.url));
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [Number(width), Number(height)]);
  }
});

test("preserves the home's authored furniture variants and bottom-left tile alignment", () => {
  const expected = [
    ["bookshelf-1", "bookshelf", 147, "bookshelf2"], ["closet-left", "closet", 150, "closet"],
    ["closet-right", "closet", 150, "closet"], ["bookshelf-4", "bookshelf", 146, "bookshelf1"],
    ["lockbox-left", "lockbox", 153, "crate2"], ["lockbox-right", "lockbox", 153, "crate2"],
    ["table-1", "table", 162, "table1"], ["table-2", "table", 163, "table2"],
  ] as const;
  for (const [name, type, gid, asset] of expected) {
    const object = homeTmx.match(new RegExp(`<object[^>]*name="${name}" type="${type}" x="(\\d+)" y="(\\d+)"[^>]*gid="${gid}"`))!;
    assert.ok(object, name);
    const x = Number(object[1]) / 32; const y = Number(object[2]) / 32 - 1;
    const decoration = PLAYER_HOME_PREFAB.tiledDecorations!.filter((entry) => entry.x === x && entry.y === y && entry.gid === gid);
    assert.equal(decoration.length, 1, name);
    const visual = authoredDecorationPresentation(decoration[0]);
    assert.equal(AUTHORED_OBJECT_IMAGES[visual.frame][0], asset);
    assert.equal(visual.group, "authoredObjects");
    assert.equal(visual.floorDecal, false);
    assert.equal(visual.positionPx[0] - visual.sizePx[0] / 2, x * 32);
    assert.equal(visual.positionPx[1] + visual.sizePx[1] / 2, (y + 1) * 32);
  }
  assert.deepEqual(authoredDecorationPresentation({ gid: 147, x: 2, y: 1 }).sizePx, [32, 48]);
  assert.equal(authoredDecorationPresentation({ gid: 73, x: 2, y: 2 }).floorDecal, true);
  assert.equal(authoredDecorationPresentation({ gid: 137, x: 1, y: 0 }).groundContactY, 32);
  assert.equal(authoredDecorationPresentation({ gid: 181, x: 4, y: 0 }).groundContactY, 32);
  assert.deepEqual([0, 149, 150, 300, 450].map((time) => authoredDecorationFrame(137, time)), [28, 28, 29, 30, 28]);
});

test("retains exactly two south-facing home return teleports", () => {
  const campaign = createCampaign(613, 1, 1, { level1TestMode: true });
  const arrow = campaign.floor.entities.find((entity) => entity.kind === "teleport-arrow")!;
  campaign.player.x = arrow.x; campaign.player.y = arrow.y;
  const home = applyAction(campaign, { type: "enter-teleport" }).state;
  assert.deepEqual(home.floor.entities.filter((entity) => entity.kind === "teleport-arrow").map(({ x, y, direction, destination }) => ({ x, y, direction, destination })), [
    { x: 4, y: 9, direction: "s", destination: "dungeon" },
    { x: 5, y: 9, direction: "s", destination: "dungeon" },
  ]);
});

test("blocks all eight authored home furnishings while keeping the surrounding floor and exits walkable", () => {
  const furniture = [...homeTmx.matchAll(/<object\b[^>]*gid="\d+"[^>]*>[\s\S]*?<\/object>/g)];
  assert.equal(furniture.length, 8);
  const blocked = new Set<string>();
  for (const [object] of furniture) {
    assert.match(object, /<property name="walkable" type="bool" value="false"\/>/);
    const x = Number(object.match(/\bx="(\d+)"/)![1]) / 32;
    const y = Number(object.match(/\by="(\d+)"/)![1]) / 32 - 1;
    blocked.add(`${x},${y}`);
  }
  assert.deepEqual([...blocked].sort(), ["1,8", "2,1", "3,1", "4,4", "5,4", "6,1", "7,1", "8,8"]);
  for (let y = 1; y < 9; y++) for (let x = 1; x < 9; x++) {
    assert.equal(PLAYER_HOME_PREFAB.cells[y][x].walkable, !blocked.has(`${x},${y}`), `${x},${y}`);
    assert.equal(PLAYER_HOME_PREFAB.cells[y][x].role, "ground");
  }
  for (const x of [4, 5]) assert.equal(PLAYER_HOME_PREFAB.cells[9][x].walkable, true);
});

test("home furniture rejects movement and pathfinding, including in older home saves", () => {
  const campaign = createCampaign(613, 1, 1, { level1TestMode: true });
  const arrow = campaign.floor.entities.find((entity) => entity.kind === "teleport-arrow")!;
  campaign.player.x = arrow.x; campaign.player.y = arrow.y;
  const home = applyAction(campaign, { type: "enter-teleport" }).state;
  for (const [x, y] of [[2, 1], [3, 1], [6, 1], [7, 1], [4, 4], [5, 4], [1, 8], [8, 8]]) {
    home.player.x = x; home.player.y = y === 8 ? y - 1 : y + 1;
    delete home.player.pixel;
    const result = applyAction(home, { type: "move", direction: y === 8 ? "s" : "n" });
    assert.equal(result.accepted, false, `${x},${y}`);
    assert.equal(result.events[0].facts.reason, "blocked");
    assert.equal(findCardinalPath(home.floor, home.player, { x, y }), null);
  }
  // Simulate an older save with walkable furniture.
  for (const [x, y] of [[2, 1], [3, 1], [6, 1], [7, 1], [4, 4], [5, 4], [1, 8], [8, 8]]) setCell(home.floor, x, y, { walkable: true });
  upgradeCampaignResources(home);
  assert.deepEqual(home.floor.cells, PLAYER_HOME_PREFAB.cells);
  const path = findCardinalPath(home.floor, { x: 4, y: 8 }, { x: 4, y: 2 });
  assert.ok(path);
  assert.ok(path.every(({ x, y }) => home.floor.cells[y][x].walkable));
  assert.ok(path.some(({ x }) => x < 4 || x > 5));
});

test("validates the hero-house prefab contract and footprint", () => {
  assert.deepEqual(validatePrefab(HERO_HOUSE_PREFAB), []);
  assert.deepEqual(validatePrefabPlacement({ width: 20, height: 20, cells: createSemanticCells(20, 20) }, HERO_HOUSE_PREFAB, { x: 4, y: 4 }), []);
  assert.match(validatePrefabPlacement({ width: 20, height: 20, cells: createSemanticCells(20, 20) }, HERO_HOUSE_PREFAB, { x: 18, y: 18 }).join(" "), /outside map/);
});

test("distinguishes the authored player-home teleport prefab from the stamp prefab", () => {
  assert.deepEqual(validatePrefab(PLAYER_HOME_PREFAB), []);
  assert.equal(PLAYER_HOME_PREFAB.kind, "teleport");
  assert.equal(PLAYER_HOME_PREFAB.assetPath, "assets/art/game-view/maps/prefabs/player-home.tmx");
  assert.deepEqual(PLAYER_HOME_PREFAB.entrances, [{ x: 4, y: 9 }]);
  assert.equal(PLAYER_HOME_PREFAB.cells[9][4].walkable, true);
  assert.equal(PLAYER_HOME_PREFAB.cells[0][0].walkable, false);
});

test("prefab stamping is atomic for protected overlap and coherent when valid", () => {
  const target = { width: 20, height: 20, cells: createSemanticCells(20, 20), protectedCells: [{ x: 4, y: 4 }] };
  const before = JSON.stringify(target.cells);
  assert.throws(() => stampPrefab(target, HERO_HOUSE_PREFAB, { x: 4, y: 4 }), /protected overlap/);
  assert.equal(JSON.stringify(target.cells), before);
  const placement = stampPrefab(target, HERO_HOUSE_PREFAB, { x: 8, y: 8 });
  assert.deepEqual(placement, { prefabId: "hero-house", origin: { x: 8, y: 8 } });
  assert.equal(target.cells[9][9].walkable, true);
  assert.equal(target.cells[8][8].walkable, false);
});

test("player-house generation selects and protects the authored footprint", () => {
  const floor = generateFloor(1, 20261022, 1, { playerHouse: true });
  assert.deepEqual(floor.prefabPlacements, [{ prefabId: "hero-house", origin: { x: 47, y: 47 } }]);
  assert.equal(floor.cells[48][48].protected, true);
  assert.equal(generateFloor(1, 20261022, 1).prefabPlacements?.length ?? 0, 0);
});
