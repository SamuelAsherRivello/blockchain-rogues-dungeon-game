export const DUNGEON_WANG_ORDER = Object.freeze(["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const);
export type DungeonWangFamilyName = "Room frame" | "Void frame" | "Details" | "Details alternate" | "Generated wall boundary";

export interface DungeonWangRule {
  readonly family: DungeonWangFamilyName;
  readonly tileId: number;
  readonly wangId: readonly number[];
  readonly mask: number;
}

export interface DungeonWangFamily {
  readonly name: DungeonWangFamilyName;
  readonly rules: readonly DungeonWangRule[];
  readonly byMask: ReadonlyMap<number, DungeonWangRule>;
}

export interface DungeonTilesetRules {
  readonly inwardCornerRules: Readonly<Record<number, number>>;
  readonly floorTiles: readonly number[];
  readonly wallQuarterProfiles: Readonly<Record<string, readonly number[]>>;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly tileCount: number;
  readonly columns: number;
  readonly imageSource: string;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly families: ReadonlyMap<string, DungeonWangFamily>;
}

function attributes(source: string) {
  const values: Record<string, string> = {};
  for (const match of source.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) values[match[1]] = match[2];
  return values;
}

function asInteger(value: string | undefined, label: string) {
  const number = Number(value);
  if (!Number.isInteger(number)) throw new Error(`${label} must be an integer`);
  return number;
}

function unescapeXml(value: string) {
  return value.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}

function wangMask(wangId: readonly number[]) {
  return wangId.reduce((mask, value, index) => mask | (value > 0 ? 1 << index : 0), 0);
}

function parseWangId(value: string, family: string, tileId: number) {
  const wangId = value.split(",").map((part) => Number(part.trim()));
  if (wangId.length !== 8 || wangId.some((part) => !Number.isInteger(part) || part < 0)) throw new Error(`${family} tile ${tileId} has an invalid Wang ID`);
  return wangId;
}

export function parseDungeonTilesetRules(xml: string): DungeonTilesetRules {
  const tilesetMatch = xml.match(/<tileset\b([^>]*)>/);
  const imageMatch = xml.match(/<image\b([^>]*)\/>/);
  if (!tilesetMatch || !imageMatch) throw new Error("Dungeon TSX must contain a tileset and image element");
  const tileset = attributes(tilesetMatch[1]);
  const image = attributes(imageMatch[1]);
  const tileWidth = asInteger(tileset.tilewidth, "tileset tilewidth");
  const tileHeight = asInteger(tileset.tileheight, "tileset tileheight");
  const tileCount = asInteger(tileset.tilecount, "tileset tilecount");
  const columns = asInteger(tileset.columns, "tileset columns");
  const imageWidth = asInteger(image.width, "tileset image width");
  const imageHeight = asInteger(image.height, "tileset image height");
  if (!image.source) throw new Error("Dungeon TSX image source is missing");
  if (tileWidth !== 32 || tileHeight !== 32 || imageWidth !== columns * tileWidth || imageHeight !== Math.ceil(tileCount / columns) * tileHeight) throw new Error("Dungeon TSX atlas geometry is inconsistent");

  const families = new Map<string, DungeonWangFamily>();
  const property = (name: string) => {
    for (const match of xml.matchAll(/<property\b([^>]*)\/>/g)) {
      const entry = attributes(match[1]);
      if (entry.name === name) return unescapeXml(entry.value ?? "");
    }
    return null;
  };
  const floorTiles = (property("dungeon:floor-tiles") ?? "13").split(",").map(Number);
  const inwardCornerRules = JSON.parse(property("dungeon:inward-corner-rules") ?? "{}") as Record<number, number>;
  for (const [mask, tileId] of Object.entries(inwardCornerRules)) {
    if (![5, 20, 65, 80].includes(Number(mask)) || !Number.isInteger(tileId) || tileId < 0 || tileId >= tileCount) throw new Error("Invalid inward corner rule");
  }
  const wallQuarterProfiles = JSON.parse(property("dungeon:wall-quarter-profiles") ?? "{}") as Record<string, number[]>;
  for (const ids of [floorTiles, ...Object.values(wallQuarterProfiles)]) {
    if (ids.some(id => !Number.isInteger(id) || id < 0 || id >= tileCount)) throw new Error("Composition tile is outside the atlas");
  }
  if (Object.keys(wallQuarterProfiles).length && ["nw", "ne", "sw", "se"].some(key => wallQuarterProfiles[key]?.length !== 8)) throw new Error("Wall quarter profiles must each contain eight contact patterns");
  const wangsets = xml.matchAll(/<wangset\b([^>]*)>([\s\S]*?)<\/wangset>/g);
  for (const wangsetMatch of wangsets) {
    const wangset = attributes(wangsetMatch[1]);
    const name = unescapeXml(wangset.name ?? "");
    if (!name) throw new Error("Dungeon Wang set has no name");
    const rules: DungeonWangRule[] = [];
    if (families.has(name)) throw new Error(`Duplicate Wang family ${name}`);
    const colorCount = [...wangsetMatch[2].matchAll(/<wangcolor\b/g)].length;
    const byMask = new Map<number, DungeonWangRule>();
    for (const wangtileMatch of wangsetMatch[2].matchAll(/<wangtile\b([^>]*)\/>/g)) {
      const wangtile = attributes(wangtileMatch[1]);
      const tileId = asInteger(wangtile.tileid, `${name} tile ID`);
      if (tileId < 0 || tileId >= tileCount) throw new Error(`${name} tile ${tileId} is outside the atlas`);
      const wangId = parseWangId(wangtile.wangid ?? "", name, tileId);
      if (colorCount && wangId.some(color => color > colorCount)) throw new Error(`${name} references an undeclared Wang color`);
      if (wangId.some(color => color > 1)) throw new Error(`${name} requires full Wang color identity; binary mask lookup is not valid for this family`);
      const mask = wangMask(wangId);
      const prior = byMask.get(mask);
      if (prior && prior.tileId !== tileId) throw new Error(`${name} mask ${mask} maps to both tile ${prior.tileId} and tile ${tileId}`);
      const rule = prior ?? { family: name as DungeonWangFamilyName, tileId, wangId: Object.freeze(wangId), mask };
      if (!prior) { byMask.set(mask, rule); rules.push(rule); }
    }
    families.set(name, { name: name as DungeonWangFamilyName, rules: Object.freeze(rules), byMask });
  }
  // A Tiled Wang tile has one signature per set. Runtime blocked-cell masks
  // can intentionally share source art, so their recipes are TSX properties
  // rather than duplicate wangtile definitions that Tiled would overwrite.
  const blockedRules = JSON.parse(property("dungeon:blocked-cell-rules") ?? "{}") as Record<string, number>;
  if (Object.keys(blockedRules).length) {
    const name = "Generated wall boundary";
    if (families.has(name)) throw new Error("Blocked-cell rules duplicate an authored Wang family");
    const rules = Object.entries(blockedRules).map(([value, tileId]) => {
      const mask = Number(value);
      if (!Number.isInteger(tileId) || tileId < 0 || tileId >= tileCount) throw new Error("Blocked-cell tile is outside the atlas");
      return { family: name as DungeonWangFamilyName, tileId, mask, wangId: Object.freeze(wangIdForMask(mask)) };
    });
    families.set(name, { name, rules: Object.freeze(rules), byMask: new Map(rules.map(rule => [rule.mask, rule])) });
  }
  return { inwardCornerRules, floorTiles, wallQuarterProfiles, tileWidth, tileHeight, tileCount, columns, imageSource: unescapeXml(image.source), imageWidth, imageHeight, families };
}

export interface WallQuarter { tileId: number; quarter: number }

/** Exact three-contact quadrant composition, authored in the TSX. */
export function wallQuartersForMask(rules: DungeonTilesetRules, mask: number): WallQuarter[] | null {
  if (!Number.isInteger(mask) || mask < 1 || mask > 255) return null;
  const contacts = [["nw", 1, 64, 128], ["ne", 1, 4, 2], ["sw", 16, 64, 32], ["se", 16, 4, 8]] as const;
  const result: WallQuarter[] = [];
  for (const [quarter, [name, a, b, diagonal]] of contacts.entries()) {
    const index = Number(Boolean(mask & a)) | Number(Boolean(mask & b)) << 1 | Number(Boolean(mask & diagonal)) << 2;
    const tileId = rules.wallQuarterProfiles[name]?.[index];
    if (tileId === undefined) return null;
    result.push({ tileId, quarter });
  }
  return result;
}

export function ruleForMask(rules: DungeonTilesetRules, family: string, mask: number) {
  return rules.families.get(family)?.byMask.get(mask) ?? null;
}

export function wangIdForMask(mask: number) {
  if (!Number.isInteger(mask) || mask < 0 || mask > 255) throw new Error(`Wang mask must be an integer from 0 to 255: ${mask}`);
  return DUNGEON_WANG_ORDER.map((_, index) => Number(Boolean(mask & (1 << index))));
}
