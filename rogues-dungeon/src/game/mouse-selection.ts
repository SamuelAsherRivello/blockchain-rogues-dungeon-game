import type { Position, SelectedCell } from "./types.ts";
type MouseCampaign = { player: Position; floor: Parameters<typeof findCardinalPath>[0] & { lockboxes?: Position[] } };
import { findCardinalApproachPath, findCardinalPath } from "./a-star.ts";
import { ensureSemanticCells, isWalkable } from "../systems/procedural/level-grid-system.ts";

export interface MousePathResult { path: ReturnType<typeof findCardinalPath>; reachable: boolean }
export interface MouseTravelSelection extends SelectedCell { walkOnly?: boolean }
export const MAX_MOUSE_TRAVEL_STEPS = 30;
export const isMouseHazard = (floor: MouseCampaign["floor"], cell: Position) => floor.decorations?.some(entry => entry.kind === "trap" && entry.x === cell.x && entry.y === cell.y) ?? false;
const isMouseStopTile = (floor: MouseCampaign["floor"], cell: Position) => isMouseHazard(floor, cell)
  || floor.entities?.some(entity => entity.kind === "stairs" && entity.x === cell.x && entity.y === cell.y) === true;

/** Hidden objects must never turn a walking step into a pickup, attack or bump. */
function hiddenMouseInteractions(campaign: MouseCampaign, allowed: (position: Position) => boolean, walkOnlyTarget?: Position) {
  const cells = new Set<string>();
  const walkOnlyKey = walkOnlyTarget ? `${walkOnlyTarget.x},${walkOnlyTarget.y}` : undefined;
  for (const entity of campaign.floor.entities ?? []) {
    if (entity.kind === "discovery" || (entity.kind === "crate" || entity.kind === "chest") && entity.opened) continue;
    const key = `${entity.x},${entity.y}`;
    if (!allowed(entity) || key === walkOnlyKey) cells.add(key);
  }
  for (const set of campaign.floor.objectSets ?? []) {
    if (set.kind !== "enemy-locked-door" && set.barrel) {
      const key = `${set.barrel.x},${set.barrel.y}`;
      if (!allowed(set.barrel) || key === walkOnlyKey) cells.add(key);
    }
  }
  return cells;
}

export function getMousePathResult(selectedCell: MouseTravelSelection | null, campaign: MouseCampaign | null, allowed: (position: Position) => boolean = () => true): MousePathResult {
  if (!selectedCell || !campaign?.player || !campaign?.floor) return { path: null, reachable: false };
  const lockbox = !selectedCell.walkOnly && allowed(selectedCell) && (campaign.floor.lockboxes?.some(box => box.x === selectedCell.x && box.y === selectedCell.y) ?? false);
  const hidden = hiddenMouseInteractions(campaign, allowed, selectedCell.walkOnly ? selectedCell : undefined);
  const selectedIsAdjacentStop = isMouseStopTile(campaign.floor, selectedCell)
    && Math.abs(selectedCell.x - campaign.player.x) + Math.abs(selectedCell.y - campaign.player.y) === 1;
  const pathOptions = { respectObjectSets: true, avoidObjects: true, isBlocked: (cell: Position) => hidden.has(`${cell.x},${cell.y}`)
    || isMouseStopTile(campaign.floor, cell) && !(selectedIsAdjacentStop && cell.x === selectedCell.x && cell.y === selectedCell.y) };
  const walkableTarget = isWalkable(ensureSemanticCells(campaign.floor), selectedCell.x, selectedCell.y);
  const targetIsAdjacent = Math.abs(selectedCell.x - campaign.player.x) + Math.abs(selectedCell.y - campaign.player.y) === 1;
  // A nearby hovered grid spot means the player intends to step into or
  // interact with it. Keep the preview direct, regardless of its target kind
  // or any stale/path-entry facing hint from the renderer.
  if (targetIsAdjacent && !hidden.has(`${selectedCell.x},${selectedCell.y}`)) {
    const path = Object.freeze([Object.freeze({ x: campaign.player.x, y: campaign.player.y }), Object.freeze({ x: selectedCell.x, y: selectedCell.y })]);
    return { path, reachable: walkableTarget || lockbox };
  }
  // A wall remains an invalid destination, but preview the shortest route to
  // an adjacent walkable cell so the player sees the cardinal approach and
  // facing direction at the selected grid spot.
  if (!lockbox && !walkableTarget) {
    return { path: findCardinalApproachPath(campaign.floor, campaign.player, selectedCell, pathOptions), reachable: false };
  }
  let path: ReturnType<typeof findCardinalPath>;
  const directedInteraction = lockbox || selectedCell.kind === "enemy" || selectedCell.kind === "item";
  if (selectedCell.pathEntryDirection && directedInteraction && (selectedCell.x !== campaign.player.x || selectedCell.y !== campaign.player.y)) {
    const approachOffset = selectedCell.pathEntryDirection === "e" ? [-1, 0] : selectedCell.pathEntryDirection === "w" ? [1, 0] : selectedCell.pathEntryDirection === "s" ? [0, -1] : [0, 1];
    const approach = { x: selectedCell.x + approachOffset[0], y: selectedCell.y + approachOffset[1] };
    const approachPath = findCardinalPath(campaign.floor, campaign.player, approach, pathOptions);
    path = approachPath ? Object.freeze([...approachPath, Object.freeze({ x: selectedCell.x, y: selectedCell.y })]) : null;
  } else {
    path = findCardinalPath(campaign.floor, campaign.player, selectedCell, pathOptions);
  }
  const preview = path ?? (selectedCell.pathEntryDirection && directedInteraction ? null : findCardinalApproachPath(campaign.floor, campaign.player, selectedCell, pathOptions));
  const approached = lockbox && preview?.at(-1);
  const reachesBox = approached && Math.abs(approached.x - selectedCell.x) + Math.abs(approached.y - selectedCell.y) === 1;
  return { path: preview, reachable: Boolean((path || reachesBox) && preview && preview.length <= MAX_MOUSE_TRAVEL_STEPS + 1) };
}

/** Clicking an interaction or hazard approaches it without entering its cell. */
export function planMouseTravel(selected: MouseTravelSelection, campaign: MouseCampaign, _warnedHazard: Position | null = null, allowed: (position: Position) => boolean = () => true) {
  const selection = selected.walkOnly || !allowed(selected) ? { ...selected, walkOnly: true } : selected;
  const same = (a: Position, b: Position) => a.x === b.x && a.y === b.y;
  const targetNeedsApproach = allowed(selection) && (isMouseHazard(campaign.floor, selection)
    || campaign.floor.lockboxes?.some(box => same(box, selection))
    || campaign.floor.entities?.some(entity => same(entity, selection) && entity.kind !== "discovery" && !((entity.kind === "crate" || entity.kind === "chest") && entity.opened))
    || campaign.floor.objectSets?.some(set => set.kind !== "enemy-locked-door" && set.barrel && same(set.barrel, selection)));
  if (targetNeedsApproach) {
    const hidden = hiddenMouseInteractions(campaign, allowed);
    const path = findCardinalApproachPath(campaign.floor, campaign.player, selection, {
      respectObjectSets: true, avoidObjects: true,
      isBlocked: cell => same(cell, selection) || hidden.has(`${cell.x},${cell.y}`) || isMouseStopTile(campaign.floor, cell),
    });
    const approach = path?.at(-1);
    const adjacent = approach && Math.abs(approach.x - selection.x) + Math.abs(approach.y - selection.y) === 1;
    return { destination: { ...selection, ...(approach ?? campaign.player), pixel: undefined, kind: undefined, pathEntryDirection: undefined, walkOnly: true }, warnedHazard: null, confirmedHazard: null, reachable: Boolean(adjacent && path && path.length <= MAX_MOUSE_TRAVEL_STEPS + 1) };
  }
  const result = getMousePathResult(selection, campaign, allowed);
  const path = result.path?.slice(0, MAX_MOUSE_TRAVEL_STEPS + 1) ?? null;
  const targetIsStopTile = isMouseStopTile(campaign.floor, selection);
  const targetIsAdjacent = Math.abs(selection.x - campaign.player.x) + Math.abs(selection.y - campaign.player.y) === 1;
  const allowSelectedStopTile = targetIsStopTile && targetIsAdjacent && same(path?.at(-1) ?? campaign.player, selection);
  const stopIndex = path?.findIndex((cell, index) => index > 0 && allowed(cell) && isMouseStopTile(campaign.floor, cell) && !(allowSelectedStopTile && index === path!.length - 1)) ?? -1;
  // A click into fog requests walking only, even if approaching reveals an object.
  const stop = stopIndex > 0 ? path![stopIndex - 1]
    : targetIsStopTile && !allowSelectedStopTile ? path?.at(-1) ?? campaign.player
      : selection.walkOnly ? path?.at(-1) ?? campaign.player
        : result.path && result.path.length >= MAX_MOUSE_TRAVEL_STEPS + 1 ? path?.at(-1) : null;
  const destination = stop ? { ...selection, ...stop, pixel: undefined } : selection;
  return { destination: destination.walkOnly || allowed(destination) ? destination : { ...destination, walkOnly: true }, warnedHazard: stopIndex > 0 ? path![stopIndex] : null, confirmedHazard: null, reachable: result.reachable };
}

export function getMousePathFromSelectedCell(selectedCell: MouseTravelSelection | null, campaign: MouseCampaign | null, allowed: (position: Position) => boolean = () => true) {
  return getMousePathResult(selectedCell, campaign, allowed).path;
}

/** Translate the selected world cell into the first step of its cardinal A* route. */
export function getMouseMovementFromSelectedCell(selectedCell: MouseTravelSelection | null, campaign: MouseCampaign | null, path: ReturnType<typeof findCardinalPath> | undefined = undefined, allowed: (position: Position) => boolean = () => true) {
  if (path === undefined) path = getMousePathFromSelectedCell(selectedCell, campaign, allowed);
  if (!campaign || !selectedCell?.pressed) return null;
  const lockbox = !selectedCell.walkOnly && allowed(selectedCell) && campaign.floor.lockboxes?.some(box => box.x === selectedCell.x && box.y === selectedCell.y);
  if (!lockbox && !isWalkable(ensureSemanticCells(campaign.floor), selectedCell.x, selectedCell.y)) return null;
  const targetEntity = campaign.floor.entities?.find((entity) => entity.x === selectedCell.x && entity.y === selectedCell.y);
  const targetEntityState = targetEntity as (typeof targetEntity & { opened?: boolean }) | undefined;
  const targetIsInteractive = lockbox || targetEntity?.kind === "enemy"
    || targetEntity?.kind === "campfire"
    || targetEntity?.kind === "chest" && !targetEntityState?.opened
    || targetEntity?.kind === "crate" && !targetEntityState?.opened
    || campaign.floor.objectSets?.some((set) => set.kind === "barrel-panel-door" && set.barrel?.x === selectedCell.x && set.barrel?.y === selectedCell.y);
  const targetIsAdjacent = Math.abs(selectedCell.x - campaign.player.x) + Math.abs(selectedCell.y - campaign.player.y) === 1;
  const next = path?.[1] ?? (targetIsInteractive && targetIsAdjacent ? selectedCell : null);
  if (!next || hiddenMouseInteractions(campaign, allowed, selectedCell.walkOnly ? selectedCell : undefined).has(`${next.x},${next.y}`)) return null;
  const dx = next.x - campaign.player.x;
  const dy = next.y - campaign.player.y;
  if (!dx && !dy) return null;
  const direction = dx === 1 ? "e" : dx === -1 ? "w" : dy === 1 ? "s" : dy === -1 ? "n" : null;
  if (!direction) return null;
  return { direction, sprint: selectedCell.sprint === true };
}
