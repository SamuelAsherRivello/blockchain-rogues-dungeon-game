/** Image-collection tile IDs from tilesets/examples/objects-overlay.tsx.
 * These IDs do not index the unrelated packed objects-overlay.png sheet.
 */
export const AUTHORED_OBJECT_IMAGES = [
  ["barrel", 32, 32], ["barrel-shadow", 32, 32],
  ["bookshelf1", 32, 48], ["bookshelf2", 32, 48],
  ["bronze-chest-closed", 32, 32], ["bronze-chest-open", 32, 48],
  ["closet", 32, 48], ["crate", 32, 32], ["crate-shadow", 32, 32], ["crate2", 32, 32],
  ["front-door-closed", 32, 48], ["front-door-open", 32, 48],
  ["golden-chest-closed", 32, 32], ["golden-chest-open", 32, 48],
  ["side-door-closed", 64, 64], ["side-door-open", 64, 64],
  ["silver-chest-closed", 32, 32], ["silver-chest-open", 32, 48],
  ["table1", 32, 32], ["table2", 32, 32],
] as const;

export function authoredDecorationPresentation({ gid, x, y }: { gid: number; x: number; y: number }) {
  const group = gid <= 108 ? "tiles" : gid <= 143 ? "propsAnimated" : gid <= 163 ? "authoredObjects" : gid <= 171 ? "itemsAnimated" : gid <= 180 ? "items" : "propsStatic";
  const firstGid = { tiles: 1, propsAnimated: 109, authoredObjects: 144, itemsAnimated: 164, items: 172, propsStatic: 181 }[group];
  const frame = gid - firstGid;
  const image = group === "authoredObjects" ? AUTHORED_OBJECT_IMAGES[frame] : undefined;
  const width = image?.[1] ?? 32;
  const height = image?.[2] ?? 32;
  return {
    group, frame,
    // Tiled tile layers align image-collection art to the cell's bottom left.
    positionPx: [x * 32 + width / 2, (y + 1) * 32 - height / 2] as [number, number],
    sizePx: [width, height] as [number, number],
    floorDecal: group === "tiles",
    // Match authored wall-row depth so mounted torches/banners draw over walls.
    groundContactY: (y + 1) * 32,
  } as const;
}

/** The two authored home torches use the TSX's three 150 ms frames. */
export function authoredDecorationFrame(gid: number, elapsedMs: number) {
  const frame = authoredDecorationPresentation({ gid, x: 0, y: 0 }).frame;
  return gid === 137 ? frame + Math.floor(elapsedMs / 150) % 3 : frame;
}
