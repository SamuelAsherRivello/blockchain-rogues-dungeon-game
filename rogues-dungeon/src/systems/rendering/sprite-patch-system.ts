import { updateSprite2D, type Sprite2DHandle, type Sprite2DProps } from "@babylonjs/lite";
import { countPerformance } from "./performance-system.ts";

// Every writer shares the actual last patch. Character updates and renderer
// overrides must not maintain conflicting snapshots of the same sprite.
const patches = new WeakMap<Sprite2DHandle, Record<string, unknown>>();
export const readSpritePatch = (handle: Sprite2DHandle) => patches.get(handle);
export function rememberSpritePatch(handle: Sprite2DHandle, props: Partial<Sprite2DProps>) {
  const copy: Record<string, unknown> = {};
  for (const key in props) { const value = (props as Record<string, unknown>)[key]; copy[key] = Array.isArray(value) ? value.slice() : value; }
  patches.set(handle, copy);
}
export function patchSprite(handle: Sprite2DHandle, patch: Partial<Sprite2DProps>) {
  if (!handle.layer.visible) return false;
  const prior = patches.get(handle) ?? {}, values = patch as Record<string, unknown>;
  let changed = false;
  for (const key in values) {
    const value = values[key], old = prior[key];
    if (Array.isArray(value)) {
      let same = false;
      if (Array.isArray(old) && old.length === value.length) {
        same = true;
        for (let i = 0; i < value.length; i++) if (old[i] !== value[i]) { same = false; break; }
      }
      if (same) continue;
      prior[key] = value.slice();
    } else { if (old === value) continue; prior[key] = value; }
    changed = true;
  }
  if (!changed) return false;
  updateSprite2D(handle, patch); patches.set(handle, prior);
  countPerformance("sprite patches");
  return true;
}
