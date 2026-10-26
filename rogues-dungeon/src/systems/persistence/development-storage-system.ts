import type { StorageAccess, StorageCollection } from "../../game/types.ts";

export const DEVELOPMENT_STORAGE_COMPATIBILITY_KEY = "rogues-dungeon.compatibility-epoch.v1";
// Bump for an authorized development change that invalidates saved game content.
export const DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH = "dungeon-graph-1:prefab-portal-paired-1";

/** One reset per compatibility epoch, limited to this game's storage namespace. */
export function resetDevelopmentStorageCompatibility(storage: StorageCollection): boolean {
  if (storage.getItem(DEVELOPMENT_STORAGE_COMPATIBILITY_KEY) === DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH) return false;
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key?.startsWith("rogues-dungeon.")) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
  // Failed cleanup must not stamp the epoch as complete.
  storage.setItem(DEVELOPMENT_STORAGE_COMPATIBILITY_KEY, DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH);
  return true;
}

export function prepareBrowserDevelopmentStorage(storage: StorageAccess) {
  if (typeof window !== "undefined" && storage === window.localStorage) resetDevelopmentStorageCompatibility(window.localStorage);
}
