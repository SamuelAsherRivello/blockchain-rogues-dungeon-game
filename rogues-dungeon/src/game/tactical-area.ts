import type { Campaign, Position } from "./types.ts";
import { detectedEnemyIds } from "./enemy-detection.ts";
import { isBattleThreat } from "../systems/procedural/world-procedural-system.ts";

export interface TacticalRectangle { minX: number; maxX: number; minY: number; maxY: number }

export function tacticalRectangles(campaign: Campaign, detected = detectedEnemyIds(campaign)): TacticalRectangle[] {
  const player = campaign.player;
  return [player, ...campaign.floor.entities.filter((enemy) => enemy.kind === "enemy" && detected.has(enemy.id) && isBattleThreat(campaign, enemy))].map((target) => ({
    minX: Math.min(player.x, target.x), maxX: Math.max(player.x, target.x),
    // Reserve a full row above the engagement for tall and hopping sprites.
    minY: Math.min(player.y, target.y) - 1, maxY: Math.max(player.y, target.y),
  }));
}

/** Disjoint row spans prevent overlap from adding a third brightness level. */
export function tacticalRowSpans(rectangles: readonly TacticalRectangle[], bounds: TacticalRectangle) {
  const spans: { x: number; y: number; width: number }[] = [];
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    const intervals = rectangles.filter((rect) => y >= rect.minY && y <= rect.maxY)
      .map((rect) => [Math.max(bounds.minX, rect.minX), Math.min(bounds.maxX, rect.maxX)])
      .filter(([start, end]) => start <= end).sort((a, b) => a[0] - b[0]);
    let current: number[] | null = null;
    for (const interval of intervals) {
      if (current && interval[0] <= current[1] + 1) current[1] = Math.max(current[1], interval[1]);
      else { if (current) spans.push({ x: current[0], y, width: current[1] - current[0] + 1 }); current = interval; }
    }
    if (current) spans.push({ x: current[0], y, width: current[1] - current[0] + 1 });
  }
  return spans;
}

export function tacticalContains(rectangles: readonly TacticalRectangle[], cell: Position) {
  return rectangles.some((rect) => cell.x >= rect.minX && cell.x <= rect.maxX && cell.y >= rect.minY && cell.y <= rect.maxY);
}
