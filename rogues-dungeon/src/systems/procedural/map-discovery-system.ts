import type { Campaign, Position } from "../../game/types.ts";
import { countPerformance } from "../rendering/performance-system.ts";

export const DISCOVERY_RADIUS = 4;
type DiscoveryRealm = Pick<Campaign, "floor" | "discovery" | "activePrefab" | "worldSeed" | "world" | "run">;
const decoded = new Map<string, Uint8Array>();
const validated = new Map<string, boolean>();

/** Stable across deterministic floor reconstruction, distinct across home and dungeon. */
export function discoveryRealmKey(campaign: DiscoveryRealm) {
  const floor = campaign.floor;
  return JSON.stringify(["discovery-v2", campaign.worldSeed ?? floor.seed, campaign.world, campaign.run ?? 1,
    campaign.activePrefab ? `prefab:${campaign.activePrefab.id}` : `dungeon:${floor.level ?? floor.depth ?? 1}`,
    floor.seed, floor.width, floor.height]);
}
export function validDiscoveryEncoding(value: unknown, width: number, height: number): value is string {
  if (typeof value !== "string" || !value.startsWith(`${width}x${height}:`)) return false;
  const key = `${width}x${height}:${value}`;
  if (validated.has(key)) return validated.get(key)!;
  let valid = false;
  try { valid = atob(value.slice(value.indexOf(":") + 1)).length === Math.ceil(width * height / 8); }
  catch { /* Invalid encoded knowledge remains unknown. */ }
  if (validated.size >= 16) validated.delete(validated.keys().next().value!);
  validated.set(key, valid);
  return valid;
}
export function discoveryRevision(campaign: DiscoveryRealm) {
  const { width, height } = campaign.floor;
  const current = campaign.discovery?.[discoveryRealmKey(campaign)];
  if (validDiscoveryEncoding(current, width, height)) return current;
  // Old numeric keys describe dungeon levels only. A prefab can never inherit one.
  if (!campaign.activePrefab) {
    const legacy = campaign.discovery?.[String(campaign.floor.level ?? campaign.floor.depth ?? 1)];
    if (validDiscoveryEncoding(legacy, width, height)) return legacy;
  }
  return "";
}
function readBytes(campaign: DiscoveryRealm) {
  const { width, height } = campaign.floor;
  const value = discoveryRevision(campaign);
  const key = `${width}x${height}:${value}`;
  let bytes = decoded.get(key);
  if (!bytes) {
    countPerformance("discovery decodes");
    bytes = new Uint8Array(Math.ceil(width * height / 8));
    if (value) {
      const binary = atob(value.slice(value.indexOf(":") + 1));
      for (let i = 0; i < bytes.length; i++) bytes[i] = binary.charCodeAt(i);
    }
    if (decoded.size >= 16) decoded.delete(decoded.keys().next().value!);
    decoded.set(key, bytes);
  }
  return bytes;
}
/** Visit changed cell indices without exposing the cached immutable bitmap. */
export function changedDiscoveryCells(previous: string, campaign: DiscoveryRealm, visit: (index: number, known: boolean) => void) {
  const next = readBytes(campaign), { width, height } = campaign.floor;
  const old = validDiscoveryEncoding(previous, width, height) ? atob(previous.slice(previous.indexOf(":") + 1)) : "";
  for (let byte = 0; byte < next.length; byte++) {
    const changed = (old.charCodeAt(byte) || 0) ^ next[byte]!;
    if (!changed) continue;
    for (let bit = 0; bit < 8; bit++) if ((changed & (1 << bit)) && byte * 8 + bit < width * height) visit(byte * 8 + bit, Boolean(next[byte]! & (1 << bit)));
  }
}
function encode(width: number, height: number, bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `${width}x${height}:${btoa(binary)}`;
}
export function revealDiscovery(campaign: Campaign, center: Position, radius = DISCOVERY_RADIUS) {
  const { width, height } = campaign.floor;
  if (!Number.isFinite(center.x) || !Number.isFinite(center.y) || !Number.isFinite(radius) || radius < 0) return campaign;
  const previous = readBytes(campaign);
  let bytes: Uint8Array | undefined;
  const reach = radius + 0.5;
  for (let y = Math.max(0, Math.ceil(center.y - reach)); y <= Math.min(height - 1, Math.floor(center.y + reach)); y++) {
    for (let x = Math.max(0, Math.ceil(center.x - reach)); x <= Math.min(width - 1, Math.floor(center.x + reach)); x++) {
      if ((x - center.x) ** 2 + (y - center.y) ** 2 > reach ** 2) continue;
      const index = y * width + x, mask = 1 << (index & 7);
      if (previous[index >> 3]! & mask) continue;
      bytes ??= previous.slice();
      bytes[index >> 3]! |= mask;
    }
  }
  const key = discoveryRealmKey(campaign);
  const legacy = discoveryRevision(campaign);
  if (bytes || (legacy && !campaign.discovery?.[key])) {
    campaign.discovery = { ...campaign.discovery, [key]: bytes ? encode(width, height, bytes) : legacy };
  }
  return campaign;
}
/** Resolve identity/encoding once, then use constant-time immutable bit tests for a view. */
export function createDiscoveryReader(campaign: DiscoveryRealm) {
  const { width, height } = campaign.floor;
  const bytes = readBytes(campaign);
  return (position: Position) => {
    const x = Math.floor(position.x), y = Math.floor(position.y);
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const index = y * width + x;
    return Boolean(bytes[index >> 3]! & (1 << (index & 7)));
  };
}
export function isCellDiscovered(campaign: DiscoveryRealm, position: Position) { return createDiscoveryReader(campaign)(position); }
export function discoveredCoverage(campaign: DiscoveryRealm) {
  const cells = campaign.floor.width * campaign.floor.height;
  return cells ? Math.round(discoveryStatistics(campaign).count / cells * 100) : 0;
}
export function discoveryStatistics(campaign: DiscoveryRealm) {
  const cells = campaign.floor.width * campaign.floor.height;
  const bytes = readBytes(campaign);
  let count = 0, fingerprint = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    const byte = i === bytes.length - 1 && cells % 8 ? bytes[i]! & ((1 << (cells % 8)) - 1) : bytes[i]!;
    fingerprint = Math.imul(fingerprint ^ byte, 16777619) >>> 0;
    let bits = byte; while (bits) { bits &= bits - 1; count++; }
  }
  return { count, fingerprint };
}
/** Normalize only identities whose original floor is retained; leave unknown legacy bytes intact. */
export function normalizeDiscovery(campaign: Campaign) {
  campaign.discovery ??= {};
  const floors = { ...campaign.floors, ...(!campaign.activePrefab ? { [String(campaign.floor.level ?? campaign.floor.depth ?? 1)]: campaign.floor } : {}) };
  for (const floor of Object.values(floors)) {
    const realm = { ...campaign, floor, activePrefab: undefined };
    const value = discoveryRevision(realm), key = discoveryRealmKey(realm);
    if (value && !campaign.discovery[key]) campaign.discovery = { ...campaign.discovery, [key]: value };
  }
  return campaign;
}
