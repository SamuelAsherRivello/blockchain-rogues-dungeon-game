import type { Campaign, Position, SelectedCell } from "./types.ts";
import { isWalkable } from "../systems/procedural/level-grid-system.ts";
import { isObjectSetBlocked } from "../systems/procedural/world-procedural-system.ts";

export function resolveWorldCursor(campaign: Campaign, target: SelectedCell | null, reachable: boolean | null, detected: ReadonlySet<string>, approach?: readonly Position[] | null) {
  if (!target || target.x === campaign.player.x && target.y === campaign.player.y) return "neutral";
  const entity = campaign.floor.entities.find((entry) => entry.x === target.x && entry.y === target.y);
  const adjacent = (from: Position) => Math.abs(target.x - from.x) + Math.abs(target.y - from.y) === 1;
  const canApproach = adjacent(campaign.player) || Boolean(approach?.length && adjacent(approach.at(-1)!));
  if (entity?.kind === "enemy") return detected.has(entity.id) ? canApproach ? "fight" : "blocked" : "neutral";
  const barrel = campaign.floor.objectSets?.find((set) => set.barrel.x === target.x && set.barrel.y === target.y);
  if (barrel) {
    const from = adjacent(campaign.player) ? campaign.player : approach?.at(-1) ?? campaign.player;
    const dx = target.x - from.x; const dy = target.y - from.y;
    if (!canApproach) return "blocked";
    const x = target.x + dx; const y = target.y + dy;
    return isWalkable(campaign.floor, x, y) && !isObjectSetBlocked(campaign.floor, campaign.player, x, y) && !campaign.floor.entities.some((entry) => entry.x === x && entry.y === y) ? "interact" : "blocked";
  }
  if (entity?.kind === "crate" && !entity.opened) return canApproach ? "interact" : "blocked";
  if (entity && ["item", "potion", "key", "gold", "chest", "campfire", "stairs"].includes(entity.kind)) return "interact";
  return reachable ? "walk" : "blocked";
}
