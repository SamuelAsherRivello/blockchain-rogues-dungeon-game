// CPU-only enemy-turn samples. No saves, browser state, or gameplay overrides.
import { createCampaign, createGameSession, generateFloor } from "../src/systems/procedural/world-procedural-system.ts";
import { copyCampaignMutableState } from "../src/systems/procedural/campaign-copy-system.ts";
import { createSemanticCells, ensureSemanticCells, markRuntimeGridValid } from "../src/systems/procedural/level-grid-system.ts";
import { readPerformanceMetrics, resetPerformanceMetrics, setPerformanceOptions } from "../src/systems/rendering/performance-system.ts";
import { PerformanceSession } from "../src/game/performance-session.ts";
import { createCardinalPathBatch, findCardinalPath } from "../src/game/a-star.ts";
import { createEnemyDirectionField } from "./enemy-direction-field-prototype.ts";

const samples = [];
for (const size of [100, 200]) for (const scenario of ["natural", "blocked-pursuit"]) {
  const source = createCampaign(17);
  source.floor = generateFloor(1, 17, 1, { size }); source.floors = undefined;
  const template = source.floor.entities.find(entity => entity.kind === "enemy");
  if (scenario === "blocked-pursuit") {
    // A nearby player across a closed partition. Each enemy previously searches
    // almost the whole room twice, even though none can reach the player.
    source.floor.cells = createSemanticCells(size, size, true);
    source.floor.map = undefined;
    for (let y = 0; y < size; y++) source.floor.cells[y][size / 2].walkable = false;
    source.floor.start = { x: size / 2 + 2, y: size / 2 };
    source.floor.entities = Array.from({ length: 12 }, (_, index) => ({
      ...structuredClone(template), id: `pursuer-${index}`, x: size / 2 - 2 - index % 3,
      y: size / 2 - 2 + Math.floor(index / 3), awareness: 20, nextActionAt: 0, actionCooldown: 1,
    }));
    source.floor.objectSets = [];
  }
  source.player = { ...source.player, ...source.floor.start, pixel: { x: source.floor.start.x * 32 + 16, y: source.floor.start.y * 32 + 16 } };
  source.floor.time = 10;
  ensureSemanticCells(source.floor); markRuntimeGridValid(source.floor);
  for (const enemyLogicDisabled of [false, true]) {
    setPerformanceOptions({ enabled: true }); resetPerformanceMetrics();
    const durations = [];
    for (let repeat = 0; repeat < 5; repeat++) {
      const session = createGameSession(copyCampaignMutableState(source), { getEnemyLogicDisabled: () => enemyLogicDisabled });
      const start = performance.now(); session.dispatch({ type: "wait" }); durations.push(performance.now() - start);
    }
    samples.push({ size, scenario, enemyLogicDisabled, enemies: source.floor.entities.filter(e => e.kind === "enemy").length,
      mean: durations.reduce((sum, value) => sum + value, 0) / durations.length, max: Math.max(...durations), ...readPerformanceMetrics() });
  }
}
console.log(JSON.stringify(samples, null, 2));

// A separate navigation-only comparison. Remove pickups, doors and traps so
// this prototype is not mistaken for an implementation of their route policy.
const perf = new PerformanceSession(); perf.enter(createCampaign(17));
const small = perf.enemyScenario(), enemies = small.floor.entities.filter(e => e.kind === "enemy");
small.floor.entities = enemies; small.floor.objectSets = []; small.floor.decorations = [];
ensureSemanticCells(small.floor); markRuntimeGridValid(small.floor);
const occupied = new Set(enemies.map(e => e.y * small.floor.width + e.x));
for (const mode of ["per-enemy", "batched-exact", "direction-field-prototype"]) {
  const durations = []; let steps;
  for (let repeat = 0; repeat < 105; repeat++) {
    const start = performance.now();
    if (mode === "per-enemy") steps = enemies.map(e => findCardinalPath(small.floor, e, small.player)?.[1]);
    else if (mode === "batched-exact") {
      const query = createCardinalPathBatch(small.floor, small.player);
      steps = enemies.map(e => query(e, {}, "same")?.[1]);
    } else {
      const field = createEnemyDirectionField(small.floor, small.player, p => occupied.has(p.y * small.floor.width + p.x));
      steps = enemies.map(e => field.nextStep(e));
    }
    if (repeat >= 5) durations.push(performance.now() - start);
  }
  console.log(JSON.stringify({ mode, fixture: "50x50 eight enemies, navigation only, no pickups/gates/traps", mean: durations.reduce((a,b) => a+b,0)/durations.length, max: Math.max(...durations), steps }));
}
