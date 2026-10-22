import type { Entity, Floor, Position, Room } from "../../game/types.ts";
import { createSemanticCells, ensureSemanticCells, mapFromSemanticCells } from "./level-grid-system.ts";
import { FLOOR_HEIGHT, FLOOR_WIDTH, GENERATOR_VERSION } from "./world-procedural-system.ts";

export interface ManualTileScenario {
  name: string;
  description: string;
  build(seed?: number, level?: number): Floor;
}

function carve(cells: ReturnType<typeof createSemanticCells>, room: Room) {
  for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) if (cells[y]?.[x]) cells[y][x].walkable = true;
}

function corridor(cells: ReturnType<typeof createSemanticCells>, from: Position, to: Position, width: number) {
  const half = Math.floor(width / 2); let x = from.x; let y = from.y;
  const carveHorizontal = () => { for (let offset = -half; offset < width - half; offset++) if (cells[y + offset]?.[x]) cells[y + offset][x].walkable = true; };
  const carveVertical = () => { for (let offset = -half; offset < width - half; offset++) if (cells[y]?.[x + offset]) cells[y][x + offset].walkable = true; };
  while (x !== to.x) { carveHorizontal(); x += Math.sign(to.x - x); }
  while (y !== to.y) { carveVertical(); y += Math.sign(to.y - y); }
  if (from.y === to.y) carveHorizontal(); else carveVertical();
}

function buildCorridorJoins(seed = 13579, level = 1): Floor {
  const cells = createSemanticCells(FLOOR_WIDTH, FLOOR_HEIGHT); const rooms: Room[] = [
    { x: 38, y: 38, w: 9, h: 9 }, { x: 58, y: 38, w: 11, h: 7 },
    { x: 58, y: 54, w: 7, h: 11 }, { x: 35, y: 62, w: 13, h: 7 },
  ]; rooms.forEach((room) => carve(cells, room));
  corridor(cells, { x: 46, y: 42 }, { x: 58, y: 42 }, 1);
  corridor(cells, { x: 61, y: 44 }, { x: 61, y: 54 }, 2);
  corridor(cells, { x: 58, y: 59 }, { x: 47, y: 65 }, 3);
  corridor(cells, { x: 41, y: 62 }, { x: 41, y: 46 }, 1);
  const start = { x: 42, y: 42 }; const exit = { x: 61, y: 59 };
  const entities: Entity[] = [{ id: "stairs", kind: "stairs", ...exit }, { id: "scenario-potion", kind: "potion", resource: "health", x: 62, y: 57 }];
  return ensureSemanticCells({ seed, width: FLOOR_WIDTH, height: FLOOR_HEIGHT, cells, start, entities, time: 0, level, generatorVersion: GENERATOR_VERSION, scenario: "corridor-joins", generation: { seed, generator: "manual-tile-scenario", passes: [{ id: "corridor-joins", diagnostics: 0 }] } } as Floor & { scenario: string });
}

export const MANUAL_TILE_SCENARIOS: Readonly<Record<string, ManualTileScenario>> = Object.freeze({
  "wang-topology-matrix": {
    name: "wang-topology-matrix", description: "Isolated room, hole, bend, T/plus junction, corridor widths and socket references.",
    build(seed = 13579, level = 1) {
      const cells = createSemanticCells(FLOOR_WIDTH, FLOOR_HEIGHT);
      const rooms = [{ x: 8, y: 8, w: 9, h: 9 }, { x: 8, y: 58, w: 15, h: 15 }, { x: 34, y: 58, w: 9, h: 9 }];
      rooms.forEach(room => carve(cells, room));
      for (let y = 63; y < 68; y++) for (let x = 13; x < 18; x++) cells[y][x].walkable = false;
      for (const width of [1, 2, 3]) corridor(cells, { x: 28, y: 8 + width * 5 }, { x: 44, y: 8 + width * 5 }, width);
      corridor(cells, { x: 8, y: 30 }, { x: 18, y: 43 }, 1);
      corridor(cells, { x: 30, y: 30 }, { x: 44, y: 30 }, 2);
      corridor(cells, { x: 37, y: 30 }, { x: 37, y: 43 }, 2);
      corridor(cells, { x: 60, y: 34 }, { x: 74, y: 34 }, 3);
      corridor(cells, { x: 67, y: 27 }, { x: 67, y: 43 }, 3);
      corridor(cells, { x: 42, y: 62 }, { x: 54, y: 62 }, 1);
      const start = { x: 12, y: 12 };
      return ensureSemanticCells({ seed, width: FLOOR_WIDTH, height: FLOOR_HEIGHT, cells, start, entities: [{ id: "stairs", kind: "stairs", x: 14, y: 14 }], time: 0, level, generatorVersion: GENERATOR_VERSION, scenario: "wang-topology-matrix" } as Floor);
    },
  },
  "corridor-joins": { name: "corridor-joins", description: "Room joins with one, two, and three tile corridors.", build: buildCorridorJoins },
});

const matrixFocuses: Readonly<Record<string, Position>> = {
  "wang-focus-widths": { x: 36, y: 18 }, "wang-focus-bend": { x: 18, y: 35 },
  "wang-focus-t": { x: 37, y: 30 }, "wang-focus-plus": { x: 67, y: 34 },
  "wang-focus-hole": { x: 12, y: 62 }, "wang-focus-socket": { x: 42, y: 62 },
};
export function getManualTileScenario(name: string | null | undefined): ManualTileScenario | null {
  if (!name) return null;
  const focus = matrixFocuses[name];
  if (focus) return { name, description: "Native-scale topology inspection", build(seed, level) { const floor = MANUAL_TILE_SCENARIOS["wang-topology-matrix"].build(seed, level); floor.start = { ...focus }; return floor; } };
  return MANUAL_TILE_SCENARIOS[name] ?? null;
}
export function buildManualTileScenario(name: string, seed = 13579, level = 1) { const scenario = getManualTileScenario(name); if (!scenario) return null; return scenario.build(seed, level); }
export function scenarioMap(floor: Floor) { return mapFromSemanticCells(floor.cells); }
