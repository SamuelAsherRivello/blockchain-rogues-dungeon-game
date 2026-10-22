import assert from "node:assert/strict";
import test from "node:test";
import { createRunCampaign } from "../src/systems/procedural/world-procedural-system.ts";
import { revealDiscovery } from "../src/systems/procedural/map-discovery-system.ts";
import { createWorldPresentationField } from "../src/systems/rendering/world-presentation-field.ts";
import { effectiveRenderTestMode, nextRenderTestMode, normalizeRenderTestMode, renderTestEffects } from "../src/systems/rendering/render-test-system.ts";
import { readPerformanceMetrics, resetPerformanceMetrics, setPerformanceOptions } from "../src/systems/rendering/performance-system.ts";
import { WorldRender, getWorldCellAtScreenPosition, getWorldCellScreenCenter } from "../src/systems/rendering/world-render-system.ts";
import { getMouseMovementFromSelectedCell, getMousePathResult, planMouseTravel } from "../src/game/mouse-selection.ts";
import { resolveWorldCursor } from "../src/game/world-cursor.ts";
import type { SelectedCell } from "../src/game/types.ts";
import { minimapBackgroundRevision, minimapMarkerEntries } from "../src/systems/rendering/minimap-presentation.ts";
import { knownWorldRowSpans } from "../src/systems/rendering/world-visibility-system.ts";
import { tacticalRowSpans } from "../src/game/tactical-area.ts";

test("RT cycles all four combinations, rejects invalid input and defaults to production", () => {
  assert.deepEqual([0, 1, 2, 3].map((value) => nextRenderTestMode(value)), [1, 2, 3, 0]);
  assert.deepEqual([0, 1, 2, 3].map(renderTestEffects), [{ fog: false, lighting: false }, { fog: true, lighting: false }, { fog: false, lighting: true }, { fog: true, lighting: true }]);
  for (const invalid of [-1, 4, NaN, "0", undefined, null]) assert.equal(normalizeRenderTestMode(invalid), 3);
  assert.equal(effectiveRenderTestMode(0, false), 3);
  assert.equal(effectiveRenderTestMode(0, true), 0);
});

test("field channels isolate fog/light work, reconcile re-enable and retain terrain geometry", () => {
  const c = createRunCampaign(17, 1, 1), field = createWorldPresentationField();
  const original = JSON.stringify(c), unknown = { x: 0, y: 0 };
  const options = { cells: c.floor.cells, entities: c.floor.entities, player: c.player };
  const terrain = WorldRender.Render(options).terrain;
  setPerformanceOptions({ enabled: true });
  try {
    assert.equal(field.update(c, 0), false); assert.deepEqual(readPerformanceMetrics().counts, {});
    field.update(c, 1); assert.equal(field.allowed(c, unknown), false);
    assert.deepEqual(field.tint(c.player), [1, 1, 1]);
    assert.equal(readPerformanceMetrics().counts["light receiver visits"] ?? 0, 0);
    resetPerformanceMetrics();
    field.update(c, 2); assert.equal(field.allowed(c, unknown), true);
    assert.equal(readPerformanceMetrics().counts["fog cells updated"] ?? 0, 0);
    field.update(c, 3); assert.equal(field.allowed(c, unknown), false);
    assert.equal(field.allowed(c, c.player), true);
    const revision = field.revision; resetPerformanceMetrics();
    assert.equal(field.update(c, 3), false); assert.equal(field.revision, revision);
    assert.deepEqual(readPerformanceMetrics().counts, {});
    const moved = structuredClone(c); revealDiscovery(moved, unknown);
    field.update(moved, 0); resetPerformanceMetrics();
    field.update(moved, 1); assert.equal(field.allowed(moved, unknown), true);
    assert.equal(readPerformanceMetrics().counts["light receiver visits"] ?? 0, 0);
    assert.equal(WorldRender.Render(options).terrain, terrain);
    assert.equal(JSON.stringify(c), original);
    const other = structuredClone(c); other.floor = { ...c.floor, width: 5, height: 6, cells: c.floor.cells.slice(0, 6).map((r) => r.slice(0, 5)) }; other.discovery = {};
    field.update(other, 1); assert.equal(field.pixels.length, 5 * 6 * 4); assert.equal(field.allowed(other, { x: 1, y: 1 }), false);
    field.dispose(); assert.equal(field.pixels.length, 0);
  } finally { setPerformanceOptions({ enabled: false }); }
});

test("world cell projection and permission remain stable at supported zooms and camera positions", () => {
  for (const dpr of [1, 2]) for (const zoom of [.5, 1, 2]) for (const center of [{ x: 10.5, y: 20.25 }, { x: 50, y: 50 }]) {
    const projection = { center, viewportWidth: 800 * dpr, viewportHeight: 450 * dpr, tileCssSize: 32 * zoom * dpr };
    const p = { x: 12, y: 22 }, screen = getWorldCellScreenCenter({ ...projection, ...p });
    assert.deepEqual(getWorldCellAtScreenPosition({ ...projection, screenX: screen.left, screenY: screen.top }), p);
  }
});

test("mouse travel and boot cursor work across unknown terrain without changing discovery", () => {
  const c = createRunCampaign(17, 1, 1);
  delete c.floor.map;
  for (const row of c.floor.cells) for (const cell of row) cell.walkable = true;
  c.floor.entities = []; c.floor.objectSets = []; c.player.x = 2; c.player.y = 2;
  const target = { x: 6, y: 2, pressed: true, kind: "valid" } as SelectedCell;
  const allowed = (p: { x: number; y: number }) => p.x !== 4;
  const unknown = { ...target, x: 4 };
  const discovery = JSON.stringify(c.discovery);
  assert.equal(resolveWorldCursor(c, unknown, true, new Set(), undefined, allowed), "walk");
  assert.equal(resolveWorldCursor(c, unknown, false, new Set(), undefined, allowed), "blocked");
  assert.deepEqual(getMousePathResult(unknown, c, allowed).path?.at(-1), { x: 4, y: 2 });
  const path = getMousePathResult(target, c, allowed);
  assert.equal(path.reachable, true);
  assert.equal(path.path?.some((p) => p.x === 4), true);
  assert.equal(planMouseTravel(target, c, null, allowed).destination.x, 6);
  assert.equal(planMouseTravel(unknown, c, null, allowed).destination.x, 4);
  assert.equal(getMouseMovementFromSelectedCell(unknown, c, undefined, allowed)?.direction, "e");
  assert.equal(JSON.stringify(c.discovery), discovery);
});

test("fog walking cannot attack, bump or collect hidden objects, including with a stale route", () => {
  const target = { x: 2, y: 0, pressed: true };
  const allowed = (p: { x: number; y: number }) => p.x === 0;
  for (const kind of ["enemy", "chest", "crate", "campfire", "item", "potion", "key", "gold", "stairs", "teleport-arrow"]) {
    const c = { player: { x: 0, y: 0 }, floor: { map: [[0, 0, 0]], entities: [{ kind, x: 2, y: 0 }] } };
    assert.deepEqual(getMousePathResult(target, c, allowed).path?.at(-1), { x: 1, y: 0 }, kind);
    assert.equal(planMouseTravel(target, c, null, allowed).destination.x, 1, kind);
    c.player.x = 1;
    assert.equal(getMouseMovementFromSelectedCell(target, c, undefined, allowed), null, kind);
    assert.equal(getMouseMovementFromSelectedCell(target, c, [c.player, target], allowed), null, kind);
  }
  const c = { player: { x: 1, y: 0 }, floor: { map: [[0, 0, 0, 0]], entities: [], objectSets: [{ kind: "floor-trigger-door-barrel", barrel: target }] } };
  assert.equal(getMouseMovementFromSelectedCell(target, c, undefined, allowed), null);
  assert.equal(getMouseMovementFromSelectedCell(target, c, [c.player, target], allowed), null);
});

test("fog walking intent cannot become an action when contents appear after selection", () => {
  const target = { x: 3, y: 0, pressed: true };
  for (const kind of ["enemy", "chest", "crate", "campfire", "item", "potion", "key", "gold", "stairs", "teleport-arrow", "barrel"]) {
    const c = { player: { x: 0, y: 0 }, floor: {
      map: [[0, 0, 0, 0]], entities: [] as { kind: string; x: number; y: number }[],
      objectSets: [] as { kind: string; barrel: { x: number; y: number } }[],
    } };
    const plan = planMouseTravel(target, c, null, position => position.x === 0);
    assert.equal(plan.destination.x, 3, "empty unknown destinations remain walkable");
    c.player.x = 2;
    if (kind === "barrel") c.floor.objectSets.push({ kind: "floor-trigger-door-barrel", barrel: { x: 3, y: 0 } });
    else c.floor.entities.push({ kind, x: 3, y: 0 });
    const route = getMousePathResult(plan.destination, c, () => true);
    assert.equal(getMouseMovementFromSelectedCell(plan.destination, c, undefined, () => true), null, `${kind} must not become a queued action after reveal`);
    assert.equal(getMouseMovementFromSelectedCell(plan.destination, c, [c.player, target], () => true), null, `${kind} must not be entered through a stale path`);
    assert.equal(route.path?.some(cell => cell.x === 3), false, `${kind} remains outside the Gridless walking route`);
  }
});

test("fresh revealed interactive selections retain ordinary mouse actions", () => {
  for (const kind of ["enemy", "chest", "crate", "campfire", "item", "potion", "key", "gold", "stairs", "teleport-arrow"]) {
    const target = { x: 1, y: 0, pressed: true };
    const c = { player: { x: 0, y: 0 }, floor: { map: [[0, 0]], entities: [{ kind, ...target }] } };
    const plan = planMouseTravel(target, c, null, () => true);
    assert.equal(getMouseMovementFromSelectedCell(plan.destination, c)?.direction, "e", kind);
  }
});

test("unknown terrain retains mouse travel and hazard limits without revealing hidden traps", () => {
  const target = { x: 39, y: 0, pressed: true };
  const c = { player: { x: 0, y: 0 }, floor: { map: [Array(40).fill(0)], entities: [], decorations: [{ kind: "trap", x: 2, y: 0 }] } };
  const hidden = planMouseTravel(target, c, null, () => false);
  assert.equal(hidden.destination.x, 30); assert.equal(hidden.warnedHazard, null);
  const visible = planMouseTravel(target, c);
  assert.equal(visible.destination.x, 1); assert.deepEqual(visible.warnedHazard, { x: 2, y: 0 });
  assert.equal(getMousePathResult(target, c, () => false).reachable, false);
});

test("semantic minimap markers share permission, retain background for actor movement and previews do not mutate discovery", () => {
  const c = createRunCampaign(17, 1, 1), original = JSON.stringify(c.discovery);
  const world = WorldRender.Render({ cells: c.floor.cells, entities: c.floor.entities, player: c.player });
  const allowed = (p: { x: number; y: number }) => p.x === c.player.x && p.y === c.player.y;
  const markers = minimapMarkerEntries(world, c.player, new Set(world.actors.map(a => a.id)), (_id, position) => position, allowed);
  assert.equal(markers.every(entry => allowed(entry.position)), true);
  const revision = minimapBackgroundRevision(world, original);
  const moved = { ...world, actors: world.actors.map(actor => ({ ...actor, x: actor.x + 1 })) };
  assert.equal(minimapBackgroundRevision(moved, original), revision);
  assert.equal(JSON.stringify(c.discovery), original);
});

test("final tactical attenuation unions overlap and suppresses unknown-cell identifying holes", () => {
  const bounds = { minX: -2, maxX: 2, minY: -2, maxY: 2 };
  const rectangles = [{ minX: 0, maxX: 1, minY: 0, maxY: 0 }];
  const full = tacticalRowSpans(rectangles, bounds), overlap = tacticalRowSpans([...rectangles, ...rectangles], bounds);
  assert.deepEqual(full, overlap);
  assert.deepEqual(knownWorldRowSpans(full, () => false), []);
  assert.equal(knownWorldRowSpans(full, p => p.x === 0).every(span => span.x === 0 && span.width === 1), true);
});
