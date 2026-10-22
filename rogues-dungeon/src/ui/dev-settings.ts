import type { Orientation } from "./layout.ts";

export const DEV_SETTINGS_STORAGE_KEYS = Object.freeze({
  aspect: "rogues-dungeon.dev.aspect",
  pivots: "rogues-dungeon.dev.show-pivot-points",
  urlArgs: "rogues-dungeon.dev.url-args",
  mapTest: "rogues-dungeon.dev.map-test",
  itemTest: "rogues-dungeon.dev.item-test",
  enemyTest: "rogues-dungeon.dev.enemy-test",
  zoomTest: "rogues-dungeon.dev.zoom-test",
  battleVisuals: "rogues-dungeon.dev.battle-visuals",
  leveltest: "rogues-dungeon.dev.leveltest",
});

export function readBattleVisuals(): 1 | 2 {
  try { return localStorage.getItem(DEV_SETTINGS_STORAGE_KEYS.battleVisuals) === "1" ? 1 : 2; } catch { return 2; }
}

export function writeBattleVisuals(value: 1 | 2): void {
  try { localStorage.setItem(DEV_SETTINGS_STORAGE_KEYS.battleVisuals, String(value)); } catch { /* session fallback */ }
}

export function readDevBoolean(key: string, fallback = false): boolean {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "1" || value === "true";
  } catch {
    return fallback;
  }
}

export function writeDevBoolean(key: string, value: boolean): void {
  try { localStorage.setItem(key, String(value)); } catch { /* session fallback */ }
}

export function readDevAspect(): Orientation | null {
  try {
    const value = localStorage.getItem(DEV_SETTINGS_STORAGE_KEYS.aspect);
    return value === "landscape" || value === "portrait" ? value : null;
  } catch {
    return null;
  }
}

export function writeDevAspect(value: Orientation): void {
  try { localStorage.setItem(DEV_SETTINGS_STORAGE_KEYS.aspect, value); } catch { /* session fallback */ }
}
