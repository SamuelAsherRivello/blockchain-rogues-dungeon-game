import type { Direction, Position, TerrainCell } from "../../game/types.ts";
import playerHomeSource from "../../../public/assets/art/game-view/maps/prefabs/player-home.tmx?raw";
import { readAuthoredLockboxes } from "./tiled-lockbox-system.ts";

export const PLAYER_HOME_LOCKBOXES = readAuthoredLockboxes(playerHomeSource);

/** A portal opens a wall from its sole walkable cardinal approach. */
export function prefabPortalEntrance(cells: TerrainCell[][], position: Position): { approach: Position; direction: Direction } | null {
  const cell = cells[position.y]?.[position.x];
  if (!cell || cell.walkable || cell.role !== "wall") return null;
  const neighbors = [
    { x: position.x, y: position.y - 1, direction: "s" as const },
    { x: position.x + 1, y: position.y, direction: "w" as const },
    { x: position.x, y: position.y + 1, direction: "n" as const },
    { x: position.x - 1, y: position.y, direction: "e" as const },
  ];
  if (neighbors.some(({ x, y }) => !cells[y]?.[x] || !cells[y][x].walkable && cells[y][x].role !== "wall")) return null;
  const approaches = neighbors.filter(({ x, y }) => cells[y][x].walkable);
  if (approaches.length !== 1) return null;
  const { x, y, direction } = approaches[0];
  return { approach: { x, y }, direction };
}

export interface PrefabCell extends Partial<Pick<TerrainCell, "walkable" | "role">> { protected?: boolean }
export interface PrefabTeleportArrow extends Position { direction: Direction }
export type PrefabKind = "stamp" | "teleport";
export interface PrefabDefinition {
  id: string;
  kind: PrefabKind;
  width: number;
  height: number;
  origin: Position;
  entrances: Position[];
  /** Authored exit arrows also define the matching level entrance footprint. */
  teleportArrows?: PrefabTeleportArrow[];
  assetPath?: string;
  cells: PrefabCell[][];
  /** Authored Tiled layers, flattened row-major as global tile IDs. */
  tiledGrounds?: number[];
  tiledWalls?: number[];
  tiledDecorations?: { x: number; y: number; gid: number }[];
}

export interface PrefabPlacementTarget {
  width: number;
  height: number;
  cells: TerrainCell[][];
  protectedCells?: Position[];
  occupiedCells?: Position[];
}

export interface PrefabPlacement { prefabId: string; origin: Position }

/** Preserve the prefab arrow arrangement and reverse each direction, without rotation. */
export function prefabPortalEntrances(cells: TerrainCell[][], definition: PrefabDefinition, origin: Position): (PrefabTeleportArrow & { approach: Position })[] | null {
  const arrows = definition.teleportArrows;
  if (!arrows?.length) return null;
  const left = Math.min(...arrows.map(({ x }) => x));
  const top = Math.min(...arrows.map(({ y }) => y));
  const opposite: Record<Direction, Direction> = { n: "s", e: "w", s: "n", w: "e" };
  const entrances = [];
  for (const arrow of arrows) {
    const position = { x: origin.x + arrow.x - left, y: origin.y + arrow.y - top };
    const entrance = prefabPortalEntrance(cells, position);
    if (!entrance || entrance.direction !== opposite[arrow.direction]) return null;
    entrances.push({ ...position, ...entrance });
  }
  return entrances;
}

export function validatePrefab(definition: PrefabDefinition): string[] {
  const errors: string[] = [];
  if (!definition.id || !Number.isInteger(definition.width) || !Number.isInteger(definition.height) || definition.width < 1 || definition.height < 1) errors.push("invalid dimensions");
  if (!["stamp", "teleport"].includes(definition.kind)) errors.push("invalid prefab kind");
  if (definition.cells.length !== definition.height || definition.cells.some((row) => row.length !== definition.width)) errors.push("cell footprint does not match dimensions");
  if (!Number.isInteger(definition.origin.x) || !Number.isInteger(definition.origin.y)) errors.push("invalid origin");
  for (const entrance of definition.entrances) if (entrance.x < 0 || entrance.y < 0 || entrance.x >= definition.width || entrance.y >= definition.height) errors.push("entrance outside footprint");
  if (definition.kind === "teleport" && !definition.teleportArrows?.length) errors.push("teleport prefab has no arrows");
  const arrowCells = new Set<string>();
  for (const arrow of definition.teleportArrows ?? []) {
    if (!Number.isInteger(arrow.x) || !Number.isInteger(arrow.y) || !definition.cells[arrow.y]?.[arrow.x]?.walkable) errors.push("teleport arrow must occupy a walkable prefab cell");
    if (!["n", "e", "s", "w"].includes(arrow.direction)) errors.push("invalid teleport arrow direction");
    const key = `${arrow.x},${arrow.y}`;
    if (arrowCells.has(key)) errors.push("duplicate teleport arrow cell");
    arrowCells.add(key);
  }
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

const playerHomeFurnitureCells = new Set([
  "2,1", "3,1", "6,1", "7,1", // Bookshelves and cabinets.
  "4,4", "5,4", // Tables.
  ...PLAYER_HOME_LOCKBOXES.map(({ x, y }) => `${x},${y}`),
]);

/** Runtime footprint for the authored player-home.tmx teleport destination. */
export const PLAYER_HOME_PREFAB: PrefabDefinition = {
  id: "player-home",
  kind: "teleport",
  assetPath: "assets/art/game-view/maps/prefabs/player-home.tmx",
  width: 10,
  height: 10,
  origin: { x: 0, y: 0 },
  entrances: [{ x: 4, y: 9 }],
  teleportArrows: [{ x: 4, y: 9, direction: "s" }, { x: 5, y: 9, direction: "s" }],
  tiledGrounds: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 28, 15, 16, 17, 14, 15, 16, 17, 0,
    0, 26, 27, 28, 29, 26, 27, 28, 29, 0,
    0, 38, 39, 40, 14, 15, 16, 17, 41, 0,
    0, 15, 15, 16, 26, 27, 28, 29, 15, 0,
    0, 27, 15, 16, 17, 39, 40, 41, 27, 0,
    0, 39, 27, 28, 29, 16, 17, 40, 39, 0,
    0, 38, 39, 40, 41, 28, 29, 28, 29, 0,
    0, 38, 39, 38, 39, 40, 41, 40, 41, 0,
    0, 0, 0, 0, 39, 40, 0, 0, 0, 0,
  ],
  tiledWalls: [
    1, 2, 3, 4, 4, 4, 4, 4, 4, 6,
    13, 0, 0, 0, 0, 0, 0, 0, 0, 18,
    13, 0, 0, 0, 0, 0, 0, 0, 0, 18,
    13, 0, 0, 0, 0, 0, 0, 0, 0, 18,
    13, 0, 0, 0, 0, 0, 0, 0, 0, 18,
    13, 0, 0, 0, 0, 0, 0, 0, 0, 18,
    13, 0, 0, 0, 0, 0, 0, 0, 0, 18,
    13, 0, 0, 0, 0, 0, 0, 0, 0, 18,
    13, 0, 0, 0, 0, 0, 0, 0, 0, 42,
    49, 50, 51, 9, 0, 0, 7, 52, 53, 54,
  ],
  tiledDecorations: [
    [73, 2, 2], [66, 3, 2], [66, 4, 2], [66, 5, 2], [66, 6, 2], [75, 7, 2],
    [61, 2, 3], [74, 3, 3], [89, 4, 3], [89, 5, 3], [74, 6, 3], [63, 7, 3],
    [61, 2, 4], [63, 3, 4], [78, 4, 4], [78, 5, 4], [61, 6, 4], [63, 7, 4],
    [61, 2, 5], [63, 3, 5], [78, 4, 5], [78, 5, 5], [61, 6, 5], [63, 7, 5],
    [61, 2, 6], [74, 3, 6], [66, 4, 6], [66, 5, 6], [74, 6, 6], [63, 7, 6],
    [77, 2, 7], [89, 3, 7], [74, 4, 7], [74, 5, 7], [89, 6, 7], [76, 7, 7],
    [61, 4, 8], [63, 5, 8], [61, 4, 9], [63, 5, 9],
    [137, 1, 0], [181, 4, 0], [185, 5, 0], [137, 8, 0],
    [147, 2, 1], [150, 3, 1], [150, 6, 1], [146, 7, 1],
    [162, 4, 4], [163, 5, 4],
  ].map(([gid, x, y]) => ({ gid, x, y })).concat(PLAYER_HOME_LOCKBOXES.map(({ gid, x, y }) => ({ gid, x, y }))),
  cells: Array.from({ length: 10 }, (_, y) => Array.from({ length: 10 }, (_, x) => ({
    walkable: (y > 0 && y < 9 && x > 0 && x < 9 || y === 9 && (x === 4 || x === 5)) && !playerHomeFurnitureCells.has(`${x},${y}`),
    role: y > 0 && y < 9 && x > 0 && x < 9 || y === 9 && (x === 4 || x === 5) ? "ground" : "wall",
  }))),
};
