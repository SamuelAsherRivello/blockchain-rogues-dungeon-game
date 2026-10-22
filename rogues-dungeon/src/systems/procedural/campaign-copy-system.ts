import type { Campaign, Floor } from "../../game/types.ts";
import { isRuntimeGridValid, markRuntimeGridValid } from "./level-grid-system.ts";

const staticFloorFields = ["cells", "map", "tiledGrounds", "tiledWalls", "tiledDecorations"] as const;
type Generation = NonNullable<Floor["generation"]>;
// Only snapshots created here are trusted. Caller-owned metadata remains mutable
// and is detached before sharing; shallow external freezes do not establish ownership.
const ownedGenerations = new WeakSet<Generation>();

function plainMetadataObjects(root: Generation): object[] | null {
  const objects: object[] = [], seen = new Set<object>(), pending: unknown[] = [root];
  while (pending.length) {
    const value = pending.pop();
    if (value === null || value === undefined || ["string", "number", "boolean"].includes(typeof value)) continue;
    if (typeof value !== "object") return null;
    if (seen.has(value)) continue;
    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return null;
    seen.add(value); objects.push(value);
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
      if (!descriptor.enumerable) continue;
      if (!Object.hasOwn(descriptor, "value")) return null;
      pending.push(descriptor.value);
    }
  }
  return objects;
}

function ownGeneration(metadata: Generation): Generation | null {
  if (metadata === null || typeof metadata !== "object") return null;
  if (ownedGenerations.has(metadata)) return metadata;
  // Map, Set, Date and accessors cannot be made immutable with Object.freeze.
  // Unrecognized metadata keeps the existing independent mutable-copy behavior.
  if (!plainMetadataObjects(metadata)) return null;
  const snapshot = structuredClone(metadata);
  for (const object of plainMetadataObjects(snapshot)!) Object.freeze(object);
  ownedGenerations.add(snapshot);
  return snapshot;
}

/**
 * Clone the mutable graph once, without ever passing static grids to structuredClone.
 * Terrain is runtime-readonly: generation/import/repair replace its references.
 * Generation metadata is detached once and deeply frozen before later copies share it.
 * Projected floor shells preserve aliases between active, visited and recovery floors.
 */
export function copyCampaignMutableState(campaign: Campaign): Campaign {
  const floors = new Map<Floor, Floor>();
  const campaigns = new Map<Campaign, Campaign>();
  const generations = new Map<Generation, Generation | null>();
  const sharedGenerations = new Map<Floor, Generation>();
  const projectFloor = (floor: Floor) => {
    const previous = floors.get(floor); if (previous) return previous;
    const projected = { ...floor };
    for (const field of staticFloorFields) delete projected[field];
    if (floor.generation) {
      if (!generations.has(floor.generation)) generations.set(floor.generation, ownGeneration(floor.generation));
      const generation = generations.get(floor.generation);
      if (generation) { sharedGenerations.set(floor, generation); delete projected.generation; }
    }
    floors.set(floor, projected);
    return projected;
  };
  const projectCampaign = (source: Campaign): Campaign => {
    const previous = campaigns.get(source); if (previous) return previous;
    const projected = { ...source }; campaigns.set(source, projected);
    projected.floor = projectFloor(source.floor);
    if (source.floors) projected.floors = Object.fromEntries(Object.entries(source.floors).map(([level, floor]) => [level, projectFloor(floor)]));
    if (source.adventureBaseline) projected.adventureBaseline = projectCampaign(source.adventureBaseline);
    if (source.journeyCheckpoint) projected.journeyCheckpoint = projectCampaign(source.journeyCheckpoint);
    return projected;
  };
  const projected = projectCampaign(campaign);
  const originals = [...floors.keys()];
  const copy = structuredClone({ campaign: projected, floors: [...floors.values()] });
  copy.floors.forEach((floor, index) => {
    const original = originals[index];
    const serialization = Object.getOwnPropertyDescriptor(original, "toJSON");
    if (serialization && typeof serialization.value === "function") Object.defineProperty(floor, "toJSON", serialization);
    for (const field of staticFloorFields) if (Object.hasOwn(original, field)) {
      Object.defineProperty(floor, field, { configurable: true, enumerable: true, writable: true, value: original[field] });
    }
    const generation = sharedGenerations.get(original);
    if (generation) floor.generation = generation;
    if (isRuntimeGridValid(original)) markRuntimeGridValid(floor);
  });
  return copy.campaign;
}
