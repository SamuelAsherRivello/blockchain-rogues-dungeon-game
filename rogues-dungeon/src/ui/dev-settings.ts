import type { Orientation } from "./layout.ts";

export const DEV_SETTINGS_STORAGE_KEYS = Object.freeze({
  aspect: "rogues-dungeon.dev.aspect",
  pivots: "rogues-dungeon.dev.show-pivot-points",
  urlArgs: "rogues-dungeon.dev.url-args",
  mapTest: "rogues-dungeon.dev.map-test",
  itemTest: "rogues-dungeon.dev.item-test",
  enemyTest: "rogues-dungeon.dev.enemy-test",
  zoomTest: "rogues-dungeon.dev.zoom-test",
  leveltest: "rogues-dungeon.dev.leveltest",
  gameViewShader: "rogues-dungeon.dev.game-view-shader",
});

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

export function readDevGameViewShader(): number {
  try {
    const value = Number(localStorage.getItem(DEV_SETTINGS_STORAGE_KEYS.gameViewShader));
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function writeDevGameViewShader(value: number): void {
  try { localStorage.setItem(DEV_SETTINGS_STORAGE_KEYS.gameViewShader, String(value)); } catch { /* session fallback */ }
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
