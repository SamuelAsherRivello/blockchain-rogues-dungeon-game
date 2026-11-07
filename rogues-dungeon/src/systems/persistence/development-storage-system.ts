import type { StorageAccess, StorageCollection } from "../../game/types.ts";

export const DEVELOPMENT_STORAGE_COMPATIBILITY_KEY = "rogues-dungeon.compatibility-epoch.v1";
// Bump for an authorized development change that invalidates saved game content.
export const DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH = "dungeon-graph-1:prefab-portal-paired-1:flexible-jewels-1:bomb-1:dagger-2:stairs-clearance-1";

/** One origin-wide localStorage reset per incompatible development epoch. */
export function resetDevelopmentStorageCompatibility(storage: StorageCollection): boolean {
  const previousEpoch = storage.getItem(DEVELOPMENT_STORAGE_COMPATIBILITY_KEY);
  if (previousEpoch === DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH) return false;
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key !== null) keys.push(key);
  }
  // An origin with no prior game data is a first visit, not an incompatible update.
  if (previousEpoch === null && !keys.some((key) => key.startsWith("rogues-dungeon."))) {
    storage.setItem(DEVELOPMENT_STORAGE_COMPATIBILITY_KEY, DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH);
    return false;
  }
  // Preserve a retry marker until every other key has been removed. Without it,
  // a partially completed reset could look like a first visit on retry.
  if (previousEpoch === null) storage.setItem(DEVELOPMENT_STORAGE_COMPATIBILITY_KEY, `${DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH}:pending`);
  for (const key of keys) if (key !== DEVELOPMENT_STORAGE_COMPATIBILITY_KEY) storage.removeItem(key);
  // Failed cleanup must not stamp the epoch as complete.
  storage.setItem(DEVELOPMENT_STORAGE_COMPATIBILITY_KEY, DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH);
  return true;
}

export function prepareBrowserDevelopmentStorage(storage: StorageAccess) {
  if (typeof window !== "undefined" && storage === window.localStorage) resetDevelopmentStorageCompatibility(window.localStorage);
}
