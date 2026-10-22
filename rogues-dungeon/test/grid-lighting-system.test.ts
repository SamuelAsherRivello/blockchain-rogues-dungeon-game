import assert from "node:assert/strict";
import test from "node:test";
import { createGridLighting, directLightFace, GRID_LIGHTING, playerGridLights, wallLightOrigin, type LightingScene } from "../src/systems/rendering/grid-lighting-system.ts";
import { readPerformanceMetrics, resetPerformanceMetrics, setPerformanceOptions } from "../src/systems/rendering/performance-system.ts";
import { createCampaignLightingReader } from "../src/systems/rendering/campaign-lighting-system.ts";
import { applyAction, createRunCampaign } from "../src/systems/procedural/world-procedural-system.ts";
import { detectedEnemyIds, hasPerceptionLineOfSight } from "../src/game/enemy-detection.ts";

function scene(blocked: string[] = []): LightingScene {
  return { width: 30, height: 20, terrain: {}, blockerRevision: blocked.join(";"), opaque: (x, y) => x < 0 || y < 0 || x >= 30 || y >= 20 || blocked.includes(`${x},${y}`), sources: playerGridLights({ x: 10, y: 10, heading: "e" }) };
}
test("surrounding falloff, forward half-plane and RGB overlap stay bounded", () => {
  const s = scene(), light = createGridLighting(); light.update(s);
  assert.ok(light.sample({ x: 12, y: 10 })[0] > light.sample({ x: 8, y: 10 })[0]);
  assert.ok(light.sample({ x: 10, y: 10 })[0] > light.sample({ x: 12, y: 10 })[0]);
  assert.deepEqual(light.sample({ x: 1, y: 1 }), GRID_LIGHTING.ambient.map((v) => Math.round(v * 255) / 255));
  s.sources = playerGridLights({ x: 10, y: 10, heading: "w" }); light.update(s);
  assert.ok(light.sample({ x: 8, y: 10 })[0] > light.sample({ x: 12, y: 10 })[0]);
  s.sources = [...s.sources, { id: "bright", x: 10, y: 10, radius: 5, color: [10, 10, 10] }]; light.update(s);
  assert.deepEqual(light.sample({ x: 10, y: 10 }), [1, 1, 1]);
});
test("walls receive direct light, stop it, and keep the opposite face dark", () => {
  const s = scene(Array.from({ length: 20 }, (_, y) => `12,${y}`)), light = createGridLighting(); light.update(s);
  assert.equal(directLightFace({ x: 10, y: 10 }, { x: 12, y: 10 }, s.opaque), 3);
  assert.equal(directLightFace({ x: 10, y: 10 }, { x: 13, y: 10 }, s.opaque), -2);
  assert.ok(light.sample({ x: 12, y: 10 }, { x: 10, y: 10 })[0] > GRID_LIGHTING.ambient[0]);
  assert.equal(light.sample({ x: 12, y: 10 }, { x: 14, y: 10 })[0], GRID_LIGHTING.ambient[0]);
});
test("pinched corners block and a single adjacent wall permits diagonal light", () => {
  assert.equal(directLightFace({ x: 1, y: 1 }, { x: 2, y: 2 }, (x, y) => x === 2 && y === 1 || x === 1 && y === 2), -2);
  assert.equal(directLightFace({ x: 1, y: 1 }, { x: 2, y: 2 }, (x, y) => x === 2 && y === 1), -1);
});
test("mounted torch emission selects the first supported face", () => {
  assert.deepEqual(wallLightOrigin({ x: 5, y: 5 }, (_x, y) => y >= 5), { x: 5, y: 4 });
  assert.deepEqual(wallLightOrigin({ x: 5, y: 5 }, (x, _y) => x <= 5), { x: 6, y: 5 });
  assert.equal(wallLightOrigin({ x: 5, y: 5 }, () => true), null);
});
test("wall torch illuminates its own anchor and neighboring wall tiles from shallow angles", () => {
  for (const normal of [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }]) {
    const horizontal = normal.y !== 0, tangent = { x: -normal.y, y: normal.x };
    const s = scene(Array.from({ length: horizontal ? 30 : 20 }, (_, offset) => horizontal ? `${offset},8` : `10,${offset}`));
    const mount = { x: 10, y: 8 }, origin = { x: mount.x + normal.x, y: mount.y + normal.y };
    const light = createGridLighting();
    s.sources = [{ ...mount, castFrom: origin, id: "wall-torch", radius: GRID_LIGHTING.torchRadius, color: GRID_LIGHTING.torchColor }];
    light.update(s);
    const viewer = { x: mount.x + normal.x * 2 + tangent.x * 8, y: mount.y + normal.y * 2 + tangent.y * 8 };
    const opposite = { x: mount.x - normal.x * 2 + tangent.x * 8, y: mount.y - normal.y * 2 + tangent.y * 8 };
    for (const offset of [-1, 0, 1]) {
      const p = horizontal ? { x: mount.x + offset, y: mount.y } : { x: mount.x, y: mount.y + offset };
      assert.ok(light.sample(p)[0] > .9, "wall-anchored torch artwork and neighbors receive warm light");
      if (offset) assert.ok(light.sample(p)[1] < light.sample(mount)[1], "neighboring wall tiles receive less light than the torch's own tile");
      assert.ok(light.sample(p, viewer)[0] > .9, "the exposed wall face stays lit at an oblique viewing angle");
      assert.deepEqual(light.sample(p, opposite), GRID_LIGHTING.ambient, "the opposite wall face stays unlit");
    }
    const behind = { x: mount.x - (origin.x - mount.x), y: mount.y - (origin.y - mount.y) };
    assert.ok(light.sample(behind)[0] <= GRID_LIGHTING.ambient[0] + 1 / 255, "light cannot cross the supporting wall");
    const revision = light.revision;
    assert.equal(light.update(s), false); assert.equal(light.revision, revision);
    light.update({ ...s, sources: [] });
    assert.ok(light.sample(mount)[0] <= GRID_LIGHTING.ambient[0] + 1 / 255, "removing the source clears its wall illumination");
  }
});

test("torch warmth reaches farther than the previous torch tuning without player light", () => {
  const s = scene(), light = createGridLighting(), p = { x: 10, y: 10 }, edge = { x: 14, y: 10 };
  s.sources = [{ ...p, id: "torch", radius: 4, color: [.8, .5, .22] }]; light.update(s);
  const before = light.sample(edge);
  s.sources = [{ ...p, id: "torch", radius: GRID_LIGHTING.torchRadius, color: GRID_LIGHTING.torchColor }]; light.update(s);
  const after = light.sample(edge);
  assert.ok(after[0] > before[0] + .15);
  assert.ok(after[1] > before[1] + .1);
});

test("idle updates reuse all footprints; local door changes do not revisit distant sources", () => {
  setPerformanceOptions({ enabled: true });
  try {
    const s = scene(), light = createGridLighting();
    s.sources = [...s.sources, { id: "distant", x: 27, y: 2, radius: 2, color: [1, .5, .2] }];
    light.update(s); const revision = light.revision; resetPerformanceMetrics();
    assert.equal(light.update(s), false); assert.equal(light.revision, revision);
    assert.equal(readPerformanceMetrics().counts["light receiver visits"] ?? 0, 0);
    const door = { ...s, blockerRevision: "12,10", opaque: (x: number, y: number) => x === 12 && y === 10 };
    light.update(door);
    assert.equal(readPerformanceMetrics().counts["light source visits"], 2);
    assert.ok(light.sample({ x: 13, y: 10 })[0] < .4);
    resetPerformanceMetrics();
    light.update({ ...s, sources: playerGridLights({ x: 11, y: 10 }) }, false);
    assert.deepEqual(readPerformanceMetrics().counts, {});
    light.update(s); assert.ok(light.sample({ x: 13, y: 10 })[0] > .4);
    light.dispose(); assert.equal(light.pixels.length, 0);
  } finally { setPerformanceOptions({ enabled: false }); }
});

test("campaign lighting leaves detection, LOS, heading and campaign bytes unchanged", () => {
  const c = createRunCampaign(17, 1, 1), before = JSON.stringify(c);
  const ids = [...detectedEnemyIds(c)];
  const target = { x: c.player.x + 2, y: c.player.y }, los = hasPerceptionLineOfSight(c, c.player, target);
  const read = createCampaignLightingReader(), light = createGridLighting();
  const s = read(c); assert.equal(read(c), s);
  light.update(s);
  assert.deepEqual([...detectedEnemyIds(c)], ids);
  assert.equal(hasPerceptionLineOfSight(c, c.player, target), los);
  assert.equal(JSON.stringify(c), before);
});

test("authored home torches emit through the same grid light adapter", () => {
  const c = createRunCampaign(17, 1, 1, 1, 1, { level1TestMode: true });
  const arrow = c.floor.entities.find(e => e.kind === "teleport-arrow")!;
  c.player.x = arrow.x; c.player.y = arrow.y;
  const home = applyAction(c, { type: "enter-teleport" }).state;
  const scene = createCampaignLightingReader()(home);
  assert.equal(scene.sources.filter(source => source.id.startsWith("authored-torch:")).length, 2);
  assert.equal(scene.sources.filter(source => source.id.startsWith("player-")).length, 2);
  const light = createGridLighting(); light.update(scene);
  const peak = GRID_LIGHTING.ambient.map((v, channel) => Math.round(Math.min(1, v + GRID_LIGHTING.campfireColor[channel]!) * 255) / 255);
  for (const source of scene.sources.filter(source => source.id.startsWith("authored-torch:"))) {
    assert.deepEqual(light.sample(source), peak, "home fixtures, including the one left of bookshelf 1, have full campfire brightness at their own anchors");
  }
});

test("mounted torches match campfire color, reach and falloff from the fixture itself", () => {
  const mount = { x: 10, y: 8 }, origin = { x: 10, y: 9 };
  const wall = scene(Array.from({ length: 30 }, (_, x) => `${x},8`));
  wall.sources = [{ ...mount, castFrom: origin, id: "torch", radius: GRID_LIGHTING.torchRadius, color: GRID_LIGHTING.torchColor }];
  const torch = createGridLighting(); torch.update(wall);
  const fire = createGridLighting(); fire.update({ ...wall, opaque: () => false, sources: [{ ...mount, id: "campfire", radius: GRID_LIGHTING.campfireRadius, color: GRID_LIGHTING.campfireColor }] });
  for (const position of [mount, { x: 9, y: 8 }, { x: 11, y: 8 }, origin, { x: 10, y: 11 }, { x: 12, y: 11 }, { x: 10, y: 13 }]) {
    assert.deepEqual(torch.sample(position), fire.sample(position), `same campfire illumination at ${position.x},${position.y}`);
  }
  assert.deepEqual(torch.sample({ x: 10, y: 8 }, { x: 10, y: 7 }), GRID_LIGHTING.ambient);
});
