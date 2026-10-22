import type { Position, TerrainCell } from "../../game/types.ts";

export interface PrefabCell extends Partial<Pick<TerrainCell, "walkable" | "role">> { protected?: boolean }
export type PrefabKind = "stamp" | "teleport";
export interface PrefabDefinition {
  id: string;
  kind: PrefabKind;
  width: number;
  height: number;
  origin: Position;
  entrances: Position[];
  assetPath?: string;
  cells: PrefabCell[][];
}

export interface PrefabPlacementTarget {
  width: number;
  height: number;
  cells: TerrainCell[][];
  protectedCells?: Position[];
  occupiedCells?: Position[];
}

export interface PrefabPlacement { prefabId: string; origin: Position }

export function validatePrefab(definition: PrefabDefinition): string[] {
  const errors: string[] = [];
  if (!definition.id || !Number.isInteger(definition.width) || !Number.isInteger(definition.height) || definition.width < 1 || definition.height < 1) errors.push("invalid dimensions");
  if (!["stamp", "teleport"].includes(definition.kind)) errors.push("invalid prefab kind");
  if (definition.cells.length !== definition.height || definition.cells.some((row) => row.length !== definition.width)) errors.push("cell footprint does not match dimensions");
  if (!Number.isInteger(definition.origin.x) || !Number.isInteger(definition.origin.y)) errors.push("invalid origin");
  for (const entrance of definition.entrances) if (entrance.x < 0 || entrance.y < 0 || entrance.x >= definition.width || entrance.y >= definition.height) errors.push("entrance outside footprint");
  return errors;
}

function samePosition(left: Position, right: Position) { return left.x === right.x && left.y === right.y; }

export function validatePrefabPlacement(target: PrefabPlacementTarget, definition: PrefabDefinition, origin: Position): string[] {
  const errors = validatePrefab(definition);
  if (origin.x < 0 || origin.y < 0 || origin.x + definition.width > target.width || origin.y + definition.height > target.height) errors.push("footprint outside map");
  const protectedCells = target.protectedCells ?? [];
  const occupiedCells = target.occupiedCells ?? [];
  for (let y = 0; y < definition.height; y++) for (let x = 0; x < definition.width; x++) {
    const cell = { x: origin.x + x, y: origin.y + y };
    if (!target.cells[cell.y]?.[cell.x]) errors.push("footprint has missing cell");
    if (protectedCells.some((other) => samePosition(other, cell))) errors.push(`protected overlap at ${cell.x},${cell.y}`);
    if (occupiedCells.some((other) => samePosition(other, cell))) errors.push(`occupied overlap at ${cell.x},${cell.y}`);
  }
  return [...new Set(errors)];
}

export function stampPrefab(target: PrefabPlacementTarget, definition: PrefabDefinition, origin: Position): PrefabPlacement {
  const errors = validatePrefabPlacement(target, definition, origin);
  if (errors.length) throw new Error(`Cannot place prefab ${definition.id}: ${errors.join(", ")}`);
  const nextCells = target.cells.map((row) => row.map((cell) => ({ ...cell })));
  for (let y = 0; y < definition.height; y++) for (let x = 0; x < definition.width; x++) {
    const source = definition.cells[y][x];
    nextCells[origin.y + y][origin.x + x] = { ...nextCells[origin.y + y][origin.x + x], ...source };
  }
  target.cells.splice(0, target.cells.length, ...nextCells);
  return { prefabId: definition.id, origin: { ...origin } };
}

export const HERO_HOUSE_PREFAB: PrefabDefinition = {
  id: "hero-house",
  kind: "stamp",
  width: 7,
  height: 7,
  origin: { x: 0, y: 0 },
  entrances: [{ x: 3, y: 6 }],
  cells: Array.from({ length: 7 }, (_, y) => Array.from({ length: 7 }, (_, x) => ({ walkable: x > 0 && x < 6 && y > 0 && y < 6, role: x > 0 && x < 6 && y > 0 && y < 6 ? "ground" : "wall", protected: true }))),
};

/** Runtime footprint for the authored player-home.tmx teleport destination. */
export const PLAYER_HOME_PREFAB: PrefabDefinition = {
  id: "player-home",
  kind: "teleport",
  assetPath: "assets/art/game-view/maps/prefabs/player-home.tmx",
  width: 10,
  height: 10,
  origin: { x: 0, y: 0 },
  entrances: [{ x: 4, y: 9 }],
  cells: Array.from({ length: 10 }, (_, y) => Array.from({ length: 10 }, (_, x) => ({
    walkable: y > 0 && y < 9 && x > 0 && x < 9 || y === 9 && (x === 4 || x === 5),
    role: y > 0 && y < 9 && x > 0 && x < 9 || y === 9 && (x === 4 || x === 5) ? "ground" : "wall",
  }))),
};
