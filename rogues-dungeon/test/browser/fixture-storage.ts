import { DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH, DEVELOPMENT_STORAGE_COMPATIBILITY_KEY } from "../../src/systems/persistence/development-storage-system.ts";

/** Fresh test data declares the same compatibility epoch as the app. */
export const fixtureCompatibilityMarker = Object.freeze({ name: DEVELOPMENT_STORAGE_COMPATIBILITY_KEY, value: DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH });

export function compatibleFixtureStorageState(baseURL: string) {
  return { cookies: [], origins: [{ origin: new URL(baseURL).origin, localStorage: [{ ...fixtureCompatibilityMarker }] }] };
}
