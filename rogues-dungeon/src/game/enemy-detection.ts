import type { Campaign, Position } from "./types.ts";
import { effectiveAttributes, encounterLockdownSets, floorTriggerDoorSets, isEncounterLockdownDoorOpen, isObjectSetDoorOpen } from "../systems/procedural/world-procedural-system.ts";
import { isWalkable } from "../systems/procedural/level-grid-system.ts";

/** Grid traversal from cell centers, including both neighbors at corner ties. */
export function hasPerceptionLineOfSight(campaign: Campaign, from: Position, to: Position): boolean {
  const opaque = (x: number, y: number) => !isWalkable(campaign.floor, x, y)
    || floorTriggerDoorSets(campaign.floor).some((set) => set.door.x === x && set.door.y === y && !isObjectSetDoorOpen(set, campaign.player, campaign.floor.entities))
    || encounterLockdownSets(campaign.floor).some((set) => !isEncounterLockdownDoorOpen(set) && set.doors.some((door) => door.x === x && door.y === y));
  let x = from.x; let y = from.y;
  const dx = to.x - x; const dy = to.y - y; const sx = Math.sign(dx); const sy = Math.sign(dy);
  const tx = dx ? 1 / Math.abs(dx) : Infinity; const ty = dy ? 1 / Math.abs(dy) : Infinity;
  let nextX = tx / 2; let nextY = ty / 2;
  while (x !== to.x || y !== to.y) {
    if (Math.abs(nextX - nextY) < 1e-10) {
      if (opaque(x + sx, y) && opaque(x, y + sy)) return false;
      x += sx; y += sy; nextX += tx; nextY += ty;
    } else if (nextX < nextY) { x += sx; nextX += tx; }
    else { y += sy; nextY += ty; }
    if (opaque(x, y)) return false;
  }
  return true;
}

export function detectedEnemyIds(campaign: Campaign): ReadonlySet<string> {
  const range = Math.max(1, 2 * effectiveAttributes(campaign).perception);
  return new Set(campaign.floor.entities.filter((enemy) => enemy.kind === "enemy" && enemy.hp > 0 && Math.max(Math.abs(enemy.x - campaign.player.x), Math.abs(enemy.y - campaign.player.y)) <= range && hasPerceptionLineOfSight(campaign, campaign.player, enemy)).map((enemy) => enemy.id));
}
