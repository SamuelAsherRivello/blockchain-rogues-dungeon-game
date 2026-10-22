import type { Direction, Position } from "../../game/types.ts";
import { countPerformance, measurePerformance } from "./performance-system.ts";

export type LightColor = readonly [number, number, number];
export interface GridLight extends Position { id: string; radius: number; color: LightColor; heading?: Direction; castFrom?: Position }
export const CAMPFIRE_LIGHT = Object.freeze({ radius: 5, color: [0.90, 0.58, 0.25] as LightColor });
export const GRID_LIGHTING = Object.freeze({ ambient: [0.30, 0.32, 0.36] as LightColor,
  playerRadius: 3, forwardRadius: 6, torchRadius: CAMPFIRE_LIGHT.radius, campfireRadius: CAMPFIRE_LIGHT.radius,
  playerColor: [0.58, 0.56, 0.50] as LightColor, forwardColor: [0.34, 0.33, 0.29] as LightColor,
  torchColor: CAMPFIRE_LIGHT.color, campfireColor: CAMPFIRE_LIGHT.color });
export interface LightingScene { width: number; height: number; terrain: object; opaque: (x: number, y: number) => boolean; blockerRevision: string; sources: readonly GridLight[] }
interface Receiver { index: number; color: LightColor; face: number }
const vectors: Record<Direction, Position> = { n: { x: 0, y: -1 }, e: { x: 1, y: 0 }, s: { x: 0, y: 1 }, w: { x: -1, y: 0 } };
const faceVectors = [vectors.n, vectors.e, vectors.s, vectors.w];

/** First opaque receiver is lit; pinched diagonal corners block, matching detection's convention. */
export function directLightFace(from: Position, to: Position, opaque: LightingScene["opaque"]): number {
  let x = from.x, y = from.y;
  const dx = to.x - x, dy = to.y - y, sx = Math.sign(dx), sy = Math.sign(dy);
  const tx = dx ? 1 / Math.abs(dx) : Infinity, ty = dy ? 1 / Math.abs(dy) : Infinity;
  let nextX = tx / 2, nextY = ty / 2, face = -1;
  while (x !== to.x || y !== to.y) {
    if (Math.abs(nextX - nextY) < 1e-10) {
      const blockedX = opaque(x + sx, y), blockedY = opaque(x, y + sy);
      if (blockedX && blockedY) return -2;
      x += sx; y += sy; nextX += tx; nextY += ty; face = sy > 0 ? 0 : 2;
      // At an exact tile corner use the exposed receiving face. A vertical
      // wall's neighboring tile must not receive light on its buried top face.
      if (blockedX) face = sx > 0 ? 3 : 1;
    } else if (nextX < nextY) { x += sx; nextX += tx; face = sx > 0 ? 3 : 1; }
    else { y += sy; nextY += ty; face = sy > 0 ? 0 : 2; }
    if (opaque(x, y) && (x !== to.x || y !== to.y)) return -2;
  }
  return opaque(to.x, to.y) ? Math.max(0, face) : -1;
}
/** Stable N/E/S/W emission side, independent of where the player happens to stand. */
export function wallLightOrigin(position: Position, opaque: LightingScene["opaque"]) {
  for (const heading of ["n", "e", "s", "w"] as const) {
    const v = vectors[heading], adjacent = { x: position.x + v.x, y: position.y + v.y };
    if (!opaque(adjacent.x, adjacent.y)) return adjacent;
  }
  return null;
}
export function playerGridLights(player: Position & { heading?: Direction }): GridLight[] {
  return [{ ...player, id: "player-surround", radius: GRID_LIGHTING.playerRadius, color: GRID_LIGHTING.playerColor },
    { ...player, id: "player-forward", radius: GRID_LIGHTING.forwardRadius, color: GRID_LIGHTING.forwardColor, heading: player.heading ?? "e" }];
}
function footprint(scene: LightingScene, source: GridLight): Receiver[] {
  const result: Receiver[] = [], direction = source.heading ? vectors[source.heading] : undefined;
  countPerformance("light source visits");
  for (let y = Math.max(0, source.y - source.radius); y <= Math.min(scene.height - 1, source.y + source.radius); y++) {
    for (let x = Math.max(0, source.x - source.radius); x <= Math.min(scene.width - 1, source.x + source.radius); x++) {
      const dx = x - source.x, dy = y - source.y, distance = Math.hypot(dx, dy);
      if (distance > source.radius + 0.5 || (direction && dx * direction.x + dy * direction.y < 0)) continue;
      countPerformance("light receiver visits");
      const face = directLightFace(source.castFrom ?? source, { x, y }, scene.opaque);
      if (face === -2) continue;
      const falloff = Math.max(0, 1 - distance / (source.radius + 0.5));
      result.push({ index: y * scene.width + x, color: source.color.map((v) => v * falloff) as unknown as LightColor, face });
    }
  }
  return result;
}

/** Retains source footprints and accumulators; a move touches only old/new bounded footprints. */
export function createGridLighting() {
  let terrain: object | undefined, width = 0, height = 0, blockers = "", revision = 0;
  let opacity = new Uint8Array(), sum = new Float32Array(), faces = new Float32Array();
  let pixels = new Uint8ClampedArray();
  const sources = new Map<string, { key: string; light: GridLight; receivers: Receiver[] }>();
  const dirty = new Set<number>();
  let changedCells: readonly number[] = [];
  function apply(receivers: Receiver[], sign: number) {
    for (const r of receivers) {
      dirty.add(r.index);
      const offset = r.face < 0 ? r.index * 3 : (r.index * 4 + r.face) * 3;
      const target = r.face < 0 ? sum : faces;
      for (let channel = 0; channel < 3; channel++) target[offset + channel]! += sign * r.color[channel]!;
    }
  }
  return {
    update(scene: LightingScene, enabled = true) {
      if (!enabled) return false;
      return measurePerformance("lighting preparation", () => {
        const reset = terrain !== scene.terrain || width !== scene.width || height !== scene.height;
        if (reset) {
          terrain = scene.terrain; width = scene.width; height = scene.height; blockers = "";
          sum = new Float32Array(width * height * 3); faces = new Float32Array(width * height * 12);
          pixels = new Uint8ClampedArray(width * height * 4); opacity = new Uint8Array(width * height);
          sources.clear(); dirty.clear();
          for (let i = 0; i < width * height; i++) dirty.add(i);
          countPerformance("light static rebuilds");
        }
        const changed: Position[] = [];
        if (reset || blockers !== scene.blockerRevision) {
          for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const i = y * width + x, value = Number(scene.opaque(x, y));
            if (value !== opacity[i]) changed.push({ x, y });
            opacity[i] = value;
          }
          blockers = scene.blockerRevision;
        }
        const cachedScene = { ...scene, opaque: (x: number, y: number) => x < 0 || y < 0 || x >= width || y >= height || Boolean(opacity[y * width + x]) };
        const ids = new Set(scene.sources.map((s) => s.id));
        for (const [id, old] of sources) if (!ids.has(id)) { apply(old.receivers, -1); sources.delete(id); }
        for (const light of scene.sources) {
          const key = JSON.stringify(light), old = sources.get(light.id);
          const intersects = changed.some((p) => Math.abs(p.x - light.x) <= light.radius + 1 && Math.abs(p.y - light.y) <= light.radius + 1);
          if (old?.key === key && !intersects) continue;
          if (old) apply(old.receivers, -1);
          const receivers = footprint(cachedScene, light); apply(receivers, 1);
          sources.set(light.id, { key, light, receivers });
        }
        if (!dirty.size) { changedCells = []; return false; }
        for (const i of dirty) {
          for (let channel = 0; channel < 3; channel++) {
            let contribution = sum[i * 3 + channel]!;
            // Wall-mounted artwork samples its anchor rather than a wall face.
            // Give it the strongest incident surface light; wall geometry below
            // still selects one exposed face and cannot reveal back-side light.
            if (opacity[i]) for (let face = 0; face < 4; face++) contribution = Math.max(contribution, faces[(i * 4 + face) * 3 + channel]!);
            pixels[i * 4 + channel] = Math.round(Math.max(0, Math.min(1, GRID_LIGHTING.ambient[channel]! + contribution)) * 255);
          }
          pixels[i * 4 + 3] = 255;
        }
        countPerformance("light cells updated", dirty.size);
        changedCells = [...dirty]; dirty.clear(); revision++;
        return true;
      });
    },
    get pixels() { return pixels; }, get revision() { return revision; }, get sourceCount() { return sources.size; }, get changedCells() { return changedCells; },
    sample(position: Position, wallViewer?: Position): LightColor {
      const x = Math.floor(position.x), y = Math.floor(position.y), i = y * width + x;
      if (x < 0 || y < 0 || x >= width || y >= height) return GRID_LIGHTING.ambient;
      if (wallViewer) {
        const dx = wallViewer.x - x, dy = wallViewer.y - y;
        let face = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 1 : 3 : dy > 0 ? 2 : 0;
        const exposed = (candidate: number) => {
          const normal = faceVectors[candidate]!, nx = x + normal.x, ny = y + normal.y;
          return nx >= 0 && ny >= 0 && nx < width && ny < height && !opacity[ny * width + nx];
        };
        // At a shallow viewing angle the dominant axis can point into another
        // wall tile. Select a real exposed face on the viewer's side instead.
        if (opacity[i] && !exposed(face)) {
          let best = 0;
          for (let candidate = 0; candidate < 4; candidate++) {
            const normal = faceVectors[candidate]!, towardViewer = normal.x * dx + normal.y * dy;
            if (towardViewer > best && exposed(candidate)) { face = candidate; best = towardViewer; }
          }
        }
        return GRID_LIGHTING.ambient.map((v, c) => Math.max(0, Math.min(1, v + faces[(i * 4 + face) * 3 + c]!))) as unknown as LightColor;
      }
      return [pixels[i * 4]! / 255, pixels[i * 4 + 1]! / 255, pixels[i * 4 + 2]! / 255];
    },
    dispose() { terrain = undefined; sources.clear(); dirty.clear(); pixels = new Uint8ClampedArray(); sum = new Float32Array(); faces = new Float32Array(); opacity = new Uint8Array(); },
  };
}
