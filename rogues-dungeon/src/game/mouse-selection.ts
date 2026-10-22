import type { Position, SelectedCell } from "./types.ts";
type MouseCampaign = { player: Position; floor: Parameters<typeof findCardinalPath>[0] };
import { findCardinalApproachPath, findCardinalPath } from "./a-star.ts";
import { ensureSemanticCells, isWalkable } from "../systems/procedural/level-grid-system.ts";

export interface MousePathResult { path: ReturnType<typeof findCardinalPath>; reachable: boolean }
export const MAX_MOUSE_TRAVEL_STEPS = 30;
export const isMouseHazard = (floor: MouseCampaign["floor"], cell: Position) => floor.decorations?.some(entry => entry.kind === "trap" && entry.x === cell.x && entry.y === cell.y) ?? false;

/** Hidden objects must never turn a walking step into a pickup, attack or bump. */
function hiddenMouseInteractions(campaign: MouseCampaign, allowed: (position: Position) => boolean) {
  const cells = new Set<string>();
  for (const entity of campaign.floor.entities ?? []) {
    if (entity.kind === "discovery" || (entity.kind === "crate" || entity.kind === "chest") && entity.opened) continue;
    if (!allowed(entity)) cells.add(`${entity.x},${entity.y}`);
  }
  for (const set of campaign.floor.objectSets ?? []) {
    if (set.barrel && !allowed(set.barrel)) cells.add(`${set.barrel.x},${set.barrel.y}`);
  }
  return cells;
}

export function getMousePathResult(selectedCell: SelectedCell | null, campaign: MouseCampaign | null, allowed: (position: Position) => boolean = () => true): MousePathResult {
  if (!selectedCell || !campaign?.player || !campaign?.floor) return { path: null, reachable: false };
  // A terrain wall is never a valid mouse destination. Do not show the
  // approach path that is useful for walkable occupied targets in this case.
  if (!isWalkable(ensureSemanticCells(campaign.floor), selectedCell.x, selectedCell.y)) return { path: null, reachable: false };
  const hidden = hiddenMouseInteractions(campaign, allowed);
  const pathOptions = { respectObjectSets: true, avoidObjects: true, isBlocked: (cell: Position) => hidden.has(`${cell.x},${cell.y}`) };
  const path = findCardinalPath(campaign.floor, campaign.player, selectedCell, pathOptions);
  const preview = path ?? findCardinalApproachPath(campaign.floor, campaign.player, selectedCell, pathOptions);
  return { path: preview ? Object.freeze(preview.slice(0, MAX_MOUSE_TRAVEL_STEPS + 1)) : null, reachable: Boolean(path && path.length <= MAX_MOUSE_TRAVEL_STEPS + 1) };
}

/** The preview may cross hazards; one click stops before the first unconfirmed one. */
export function planMouseTravel(selected: SelectedCell, campaign: MouseCampaign, warnedHazard: Position | null = null, allowed: (position: Position) => boolean = () => true) {
  const result = getMousePathResult(selected, campaign, allowed);
  const path = result.path;
  const same = (a: Position, b: Position) => a.x === b.x && a.y === b.y;
  const confirmedHazard = path?.[1] && warnedHazard && same(path[1], warnedHazard) ? warnedHazard : null;
  const hazardIndex = path?.findIndex((cell, index) => index > 0 && allowed(cell) && isMouseHazard(campaign.floor, cell) && (!confirmedHazard || !same(cell, confirmedHazard))) ?? -1;
  // A click into fog requests walking only, even if approaching reveals an object.
  const stop = hazardIndex > 0 ? path![hazardIndex - 1] : !allowed(selected) ? path?.at(-1) ?? campaign.player : path?.length === MAX_MOUSE_TRAVEL_STEPS + 1 ? path.at(-1) : null;
  return { destination: stop ? { ...selected, ...stop, pixel: undefined } : selected, warnedHazard: hazardIndex > 0 ? path![hazardIndex] : null, confirmedHazard };
}

export function getMousePathFromSelectedCell(selectedCell: SelectedCell | null, campaign: MouseCampaign | null, allowed: (position: Position) => boolean = () => true) {
  return getMousePathResult(selectedCell, campaign, allowed).path;
}

/** Translate the selected world cell into the first step of its cardinal A* route. */
export function getMouseMovementFromSelectedCell(selectedCell: SelectedCell | null, campaign: MouseCampaign | null, path: ReturnType<typeof findCardinalPath> | undefined = undefined, allowed: (position: Position) => boolean = () => true) {
  if (path === undefined) path = getMousePathFromSelectedCell(selectedCell, campaign, allowed);
  if (!campaign || !selectedCell?.pressed) return null;
  if (!isWalkable(ensureSemanticCells(campaign.floor), selectedCell.x, selectedCell.y)) return null;
  const targetEntity = campaign.floor.entities?.find((entity) => entity.x === selectedCell.x && entity.y === selectedCell.y);
  const targetEntityState = targetEntity as (typeof targetEntity & { opened?: boolean }) | undefined;
  const targetIsInteractive = targetEntity?.kind === "enemy"
    || targetEntity?.kind === "campfire"
    || targetEntity?.kind === "chest" && !targetEntityState?.opened
    || targetEntity?.kind === "crate" && !targetEntityState?.opened
    || campaign.floor.objectSets?.some((set) => set.kind === "floor-trigger-door-barrel" && set.barrel?.x === selectedCell.x && set.barrel?.y === selectedCell.y);
  const targetIsAdjacent = Math.abs(selectedCell.x - campaign.player.x) + Math.abs(selectedCell.y - campaign.player.y) === 1;
  const next = path?.[1] ?? (targetIsInteractive && targetIsAdjacent ? selectedCell : null);
  if (!next || hiddenMouseInteractions(campaign, allowed).has(`${next.x},${next.y}`)) return null;
  const dx = next.x - campaign.player.x;
  const dy = next.y - campaign.player.y;
  if (!dx && !dy) return null;
  const direction = dx === 1 ? "e" : dx === -1 ? "w" : dy === 1 ? "s" : dy === -1 ? "n" : null;
  if (!direction) return null;
  return { direction, sprint: selectedCell.sprint === true };
}
