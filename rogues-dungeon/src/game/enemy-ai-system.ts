import { createCardinalPathBatch } from "./a-star.ts";
import type { Enemy, EnemyAiState, Floor, Position } from "./types.ts";

export const ENEMY_PATH_MAX_NODES = 512;

export type EnemyAiIntent =
  | { enemyId: string; kind: "idle"; state: "idle" }
  | { enemyId: string; kind: "wait"; state: EnemyAiState }
  | { enemyId: string; kind: "attack"; state: "attack" }
  | { enemyId: string; kind: "move"; state: "pursue"; to: Position }
  | { enemyId: string; kind: "blocked"; state: "blocked" };

export interface EnemyAiPlanInput {
  floor: Floor;
  player: Position;
  time: number;
  enemies: readonly Enemy[];
  effectiveAwareness: (enemy: Enemy) => number;
  /** A closed door blocks awareness just as it blocks movement. */
  canSee?: (enemy: Enemy, player: Position) => boolean;
  canAttack: (enemy: Enemy, player: Position) => boolean;
  canEnter: (enemy: Enemy, position: Position) => boolean;
  /** Equal keys promise identical canEnter results for this planning snapshot. */
  navigationGroup?: (enemy: Enemy) => string;
  maxPathNodes?: number;
}

function chebyshevDistance(left: Position, right: Position) {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

/** Plans one deterministic state-machine result for every enemy without mutating campaign state. */
export function planEnemyActions(input: EnemyAiPlanInput): readonly EnemyAiIntent[] {
  const maxPathNodes = input.maxPathNodes ?? Math.max(ENEMY_PATH_MAX_NODES, input.floor.width * input.floor.height);
  let findPath: ReturnType<typeof createCardinalPathBatch> | undefined;
  return [...input.enemies].sort((left, right) => left.id.localeCompare(right.id)).map((enemy) => {
    if (chebyshevDistance(enemy, input.player) > input.effectiveAwareness(enemy) || input.canSee && !input.canSee(enemy, input.player)) return { enemyId: enemy.id, kind: "idle", state: "idle" };
    if (input.time < enemy.nextActionAt) return { enemyId: enemy.id, kind: "wait", state: enemy.ai.state };
    if (input.canAttack(enemy, input.player)) return { enemyId: enemy.id, kind: "attack", state: "attack" };
    findPath ??= createCardinalPathBatch(input.floor, input.player);
    const path = findPath(enemy, { maxNodes: maxPathNodes, isBlocked: (position) => !input.canEnter(enemy, position) }, input.navigationGroup?.(enemy) ?? enemy.id);
    const to = path?.[1];
    return to ? { enemyId: enemy.id, kind: "move", state: "pursue", to } : { enemyId: enemy.id, kind: "blocked", state: "blocked" };
  });
}
