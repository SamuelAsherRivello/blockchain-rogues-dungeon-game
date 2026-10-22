import type { Campaign, Enemy } from "./types.ts";
import { createResourcesModel, generateFloor, isObjectSetBlocked, revealDiscovery } from "../systems/procedural/world-procedural-system.ts";
import { enemyDefinitionForName } from "../content/enemies/enemy-catalog.ts";

export class PerformanceSession {
  private reference: Campaign | null = null;
  get active() { return this.reference !== null; }
  enter(campaign: Campaign) { this.reference ??= structuredClone(campaign); return structuredClone(this.reference); }
  exit() { const reference = this.reference; this.reference = null; return reference; }
  regenerate(size: number): Campaign {
    if (!this.reference || this.reference.activePrefab) throw new Error("Leave the authored interior before regenerating.");
    if (size !== 50 && size !== 100 && size !== 200) throw new Error("Unsupported world size.");
    const next = structuredClone(this.reference);
    const profile = next.floor.generationProfile ?? next.floorProfiles?.[String(next.floor.level)];
    next.floor = generateFloor(next.floor.level, next.floor.seed, profile?.difficulty ?? next.progression.difficulty, {
      size, worldAttributes: profile?.attributes, level1TestMode: profile?.level1TestMode,
      level1ObjectTestMode: profile?.level1ObjectTestMode, level1EnemyTestMode: profile?.level1EnemyTestMode,
      topologyVersion: profile ? profile.topologyVersion : next.topologyVersion,
      portalLayoutVersion: profile ? profile.portalLayoutVersion : next.portalLayoutVersion,
      playerHouse: Boolean(next.floor.prefabPlacements?.length),
    });
    next.player = { ...next.player, ...next.floor.start, pixel: { x: next.floor.start.x * 32 + 16, y: next.floor.start.y * 32 + 16 } };
    next.floors = { [next.floor.level]: next.floor }; next.levelStates = {}; next.discovery = {};
    delete next.adventureBaseline; delete next.journeyCheckpoint;
    revealDiscovery(next, next.player);
    return next;
  }
  /** Reproducible nearby pursuers in generated terrain, only in this unsaved session. */
  enemyScenario(): Campaign {
    const next = this.regenerate(50);
    const definition = enemyDefinitionForName("Skeleton Warrior");
    const occupied = new Set(next.floor.entities.map(entity => `${entity.x},${entity.y}`));
    const traps = new Set((next.floor.decorations ?? []).filter(d => d.kind === "trap").map(d => `${d.x},${d.y}`));
    const queue = [{ ...next.floor.start, distance: 0 }], visited = new Set<string>();
    const spots: { x: number; y: number }[] = [];
    for (let index = 0; index < queue.length; index++) {
      const point = queue[index], key = `${point.x},${point.y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (point.distance > 10 || !next.floor.cells[point.y]?.[point.x]?.walkable || isObjectSetBlocked(next.floor, next.player, point.x, point.y)) continue;
      if (point.distance >= 4 && !occupied.has(key) && !traps.has(key)) spots.push({ x: point.x, y: point.y });
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) queue.push({ x: point.x + dx, y: point.y + dy, distance: point.distance + 1 });
    }
    if (spots.length < 8) throw new Error("Not enough reachable cells for the enemy test. The existing session was retained.");
    next.floor.entities = next.floor.entities.filter(entity => entity.kind !== "enemy");
    next.floor.entities.push(...spots.slice(0, 8).map((point, index): Enemy => ({ ...definition, ...point, kind: "enemy", maxHp: definition.hp, hasMass: true, heading: "e", generation: 1,
      id: `perf-enemy-${index}`, awareness: 20, nextActionAt: 0, actionCooldown: 1, ai: { state: "idle", targetId: null },
      resources: createResourcesModel({ health: { current: definition.hp, currentMax: definition.hp }, offense: { current: definition.damage, currentMax: definition.damage }, xp: { current: definition.xp, currentMax: definition.xp, level: next.floor.level } }),
    })));
    next.progression.attributes.health = 10000;
    next.progression.attributes.perception = 20;
    next.player.resources.health.current = next.player.resources.health.currentMax = 10000;
    return next;
  }
}
