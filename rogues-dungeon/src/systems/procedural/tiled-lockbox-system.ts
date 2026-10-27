export interface AuthoredLockbox { id: string; name: string; x: number; y: number; gid: number }

const attributes = (text: string) => Object.fromEntries([...text.matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)].map(match => [match[1]!, match[2]!]));

/** Reads the orthogonal, unrotated single-tile object subset used by authored prefabs. */
export function readAuthoredLockboxes(xml: string): AuthoredLockbox[] {
  const source = xml.replace(/<!--[\s\S]*?-->/g, "");
  const map = attributes(source.match(/<map\b([^>]*)>/)?.[1] ?? "");
  const tileWidth = Number(map.tilewidth), tileHeight = Number(map.tileheight);
  const prefab = [...source.matchAll(/<property\b([^>]*)\/?\s*>/g)].map(match => attributes(match[1]!)).find(property => property.name === "prefab-id")?.value;
  if (!prefab || map.orientation !== "orthogonal" || !(tileWidth > 0 && tileHeight > 0)) throw new Error("Invalid lockbox prefab metadata.");
  const result: AuthoredLockbox[] = [], identities = new Set<string>();
  for (const layerMatch of source.matchAll(/<objectgroup\b([^>]*)>([\s\S]*?)<\/objectgroup>/g)) {
    const layer = attributes(layerMatch[1]!);
    for (const objectMatch of layerMatch[2]!.matchAll(/<object\b([^>]*?)(?:\/>|>([\s\S]*?)<\/object>)/g)) {
      const object = attributes(objectMatch[1]!);
      if ((object.class ?? object.type) !== "lockbox") continue;
      const properties = [...(objectMatch[2] ?? "").matchAll(/<property\b([^>]*)\/?\s*>/g)].map(match => attributes(match[1]!));
      const blocking = properties.find(property => property.name === "walkable");
      const id = `${prefab}:${object.id}`, px = Number(object.x), py = Number(object.y);
      const x = px / tileWidth, y = py / tileHeight - 1, gid = Number(object.gid);
      if (layer.name !== "Objects" || Number(layer.offsetx ?? 0) || Number(layer.offsety ?? 0)
        || !Number.isSafeInteger(Number(object.id)) || Number(object.id) < 1 || identities.has(id)
        || Number(object.width) !== tileWidth || Number(object.height) !== tileHeight || Number(object.rotation ?? 0)
        || !Number.isSafeInteger(x) || !Number.isSafeInteger(y) || x < 0 || y < 0 || x >= Number(map.width) || y >= Number(map.height)
        || !Number.isSafeInteger(gid) || gid < 1 || gid > 0x0fffffff
        || blocking?.type !== "bool" || blocking.value !== "false" || /<(?:ellipse|polygon|polyline|point)\b/.test(objectMatch[2] ?? "")) {
        throw new Error(`Invalid authored lockbox ${id}.`);
      }
      identities.add(id);
      result.push({ id, name: object.name ?? "Lockbox", x, y, gid });
    }
  }
  return result;
}
