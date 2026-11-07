import type { Floor, Position } from '../../game/types.ts';
import { isWalkable } from './level-grid-system.ts';

export const BOMB_DAMAGE = 10;

/** The center and cardinal neighbors whose underlying terrain admits movement. */
export function bombBlastCells(floor: Floor, center: Position): Position[] {
  return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]
    .map(offset => ({ x: center.x + offset.x, y: center.y + offset.y }))
    .filter(cell => isWalkable(floor, cell.x, cell.y));
}

/** Strength improves the minimum two-cell throw range. */
export function bombThrowRange(strength: number): number {
  return 2 + Math.floor(Math.max(0, (Number.isFinite(strength) ? strength : 1) - 1) / 2);
}
