import type { AttributeName, Item } from "./types.ts";

/** Include removed modifiers so a replacement cannot hide its disadvantages. */
export function itemComparisonStats(item: Item | null, baseline: Item | null = null) {
  const names = new Set([...Object.keys(item?.modifiers ?? {}), ...Object.keys(baseline?.modifiers ?? {})]);
  const rows = [...names].map(name => {
    const value = item?.modifiers[name as AttributeName] ?? 0;
    return { name, value, delta: value - (baseline?.modifiers[name as AttributeName] ?? 0) };
  });
  const capacity = (entry: Item | null) => entry?.category === "capacity" ? 5 : 0;
  if (capacity(item) || capacity(baseline)) rows.push({ name: "capacity", value: capacity(item), delta: capacity(item) - capacity(baseline) });
  return rows;
}
