import type { Position, SelectedCell } from "./types.ts";
type MouseCampaign = { player: Position; floor: Parameters<typeof findCardinalPath>[0] };
import { findCardinalApproachPath, findCardinalPath } from "./a-star.ts";
import { ensureSemanticCells, isWalkable } from "../systems/procedural/level-grid-system.ts";

export interface MousePathResult { path: ReturnType<typeof findCardinalPath>; reachable: boolean }

export function getMousePathResult(selectedCell: SelectedCell | null, campaign: MouseCampaign | null): MousePathResult {
  if (!selectedCell || !campaign?.player || !campaign?.floor) return { path: null, reachable: false };
  // A terrain wall is never a valid mouse destination. Do not show the
  // approach path that is useful for walkable occupied targets in this case.
  if (!isWalkable(ensureSemanticCells(campaign.floor), selectedCell.x, selectedCell.y)) return { path: null, reachable: false };
  const pathOptions = { respectObjectSets: true };
  const path = findCardinalPath(campaign.floor, campaign.player, selectedCell, pathOptions);
  return path ? { path, reachable: true } : { path: findCardinalApproachPath(campaign.floor, campaign.player, selectedCell, pathOptions), reachable: false };
}

export function getMousePathFromSelectedCell(selectedCell: SelectedCell | null, campaign: MouseCampaign | null) {
  return getMousePathResult(selectedCell, campaign).path;
}

/** Translate the selected world cell into the first step of its cardinal A* route. */
export function getMouseMovementFromSelectedCell(selectedCell: SelectedCell | null, campaign: MouseCampaign | null, path = getMousePathFromSelectedCell(selectedCell, campaign)) {
  if (!campaign || !selectedCell?.pressed) return null;
  if (!isWalkable(ensureSemanticCells(campaign.floor), selectedCell.x, selectedCell.y)) return null;
  const targetEntity = campaign.floor.entities?.find((entity) => entity.x === selectedCell.x && entity.y === selectedCell.y);
  const targetEntityState = targetEntity as (typeof targetEntity & { opened?: boolean }) | undefined;
  const targetIsInteractive = targetEntity?.kind === "enemy"
    || targetEntity?.kind === "campfire"
    || targetEntity?.kind === "chest" && !targetEntityState?.opened
    || targetEntity?.kind === "crate" && !targetEntityState?.opened
    || campaign.floor.objectSets?.some((set) => set.barrel.x === selectedCell.x && set.barrel.y === selectedCell.y);
  const targetIsAdjacent = Math.abs(selectedCell.x - campaign.player.x) + Math.abs(selectedCell.y - campaign.player.y) === 1;
  const next = path?.[1] ?? (targetIsInteractive && targetIsAdjacent ? selectedCell : null);
  if (!next) return null;
  const dx = next.x - campaign.player.x;
  const dy = next.y - campaign.player.y;
  if (!dx && !dy) return null;
  const direction = dx === 1 ? "e" : dx === -1 ? "w" : dy === 1 ? "s" : dy === -1 ? "n" : null;
  if (!direction) return null;
  return { direction, sprint: selectedCell.sprint === true };
}
