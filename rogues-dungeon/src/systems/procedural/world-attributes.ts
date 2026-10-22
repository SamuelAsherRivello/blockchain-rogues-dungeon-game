import type { WorldAttributes, WorldAttributeName, WorldGrowthEvent } from '../../game/types.ts';

export const WORLD_RULES_VERSION = 'world-attributes-1';
export const worldAttributeNames: readonly WorldAttributeName[] = ['clarity', 'comfort', 'discovery', 'fortune', 'guidance', 'mercy', 'openness', 'peace', 'plenty', 'safety'];
export const worldAttributeLabels: Record<WorldAttributeName, string> = { clarity: 'Clarity', comfort: 'Comfort', discovery: 'Discovery', fortune: 'Fortune', guidance: 'Guidance', mercy: 'Mercy', openness: 'Openness', peace: 'Peace', plenty: 'Plenty', safety: 'Safety' };
export const worldAttributeHelp: Record<WorldAttributeName, string> = {
  clarity: 'Simplifies layouts with fewer branches and dead ends.',
  comfort: 'Adds campfires and recovery points.',
  discovery: 'Adds optional rewards, hidden discoveries, and alternate routes.',
  fortune: 'Improves reward chances, payout amounts, and reward quality.',
  guidance: 'Places the exit closer to the entrance.',
  mercy: 'Weakens enemies and reduces elite threats.',
  openness: 'Improves route accessibility with wider corridors and fewer blocked approaches.',
  peace: 'Reduces enemy numbers and makes enemies less aggressive.',
  plenty: 'Increases pickup frequency and the quantity of common supplies.',
  safety: 'Reduces traps and environmental hazards.',
};
export const DEFAULT_WORLD_ATTRIBUTES: WorldAttributes = Object.freeze(Object.fromEntries(worldAttributeNames.map(name => [name, 3])) as WorldAttributes);
export function normalizeWorldAttributes(value?: Partial<WorldAttributes>): WorldAttributes {
  return Object.fromEntries(worldAttributeNames.map(name => [name, Number.isFinite(value?.[name]) ? Math.max(0, Math.min(99, Math.trunc(value![name]!))) : 3])) as WorldAttributes;
}
export function validStartingWorld(value: WorldAttributes) {
  return worldAttributeNames.every(name => Number.isInteger(value[name]) && value[name] >= 0 && value[name] <= 5) && worldAttributeNames.reduce((n, name) => n + value[name], 0) === 30;
}
export function rollWorldAttributes(random = Math.random): WorldAttributes {
  const sheet = Object.fromEntries(worldAttributeNames.map(name => [name, 0])) as WorldAttributes;
  for (let point = 0; point < 30; point++) {
    const eligible = worldAttributeNames.filter(name => sheet[name] < 5);
    sheet[eligible[Math.min(eligible.length - 1, Math.floor(random() * eligible.length))]]++;
  }
  return sheet;
}
export function taggedSeed(seed: number, tag: string) {
  let hash = seed >>> 0;
  for (const char of tag) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash;
}
export function worldRandom(seed: number, tag: string) {
  let value = taggedSeed(seed, tag);
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
/** Linear early growth, then a smooth asymptote at effective rank 20. */
export function effectiveWorldRank(value: number) {
  const v = Math.max(0, Math.min(99, value));
  return v <= 14 ? v : 14 + 6 * (1 - Math.exp(-(v - 14) / 24));
}
export function worldTuning(attributes: WorldAttributes) {
  const r = (name: WorldAttributeName) => effectiveWorldRank(attributes[name]);
  return {
    roomCount: Math.max(5, Math.round(14 - r('clarity') * 1.15)),
    corridorWidth: Math.min(5, 1 + Math.floor(r('openness') / 2)),
    extraLinks: Math.min(5, Math.floor(r('openness') / 3)),
    exitDistance: Math.max(6, Math.round(52 / (1 + r('guidance') * .22))),
    enemyChance: .96 / (1 + r('peace') * .18),
    awareness: Math.max(2, 9 / (1 + r('peace') * .13)),
    engagementDelay: Math.min(5, Math.floor(r('peace') / 3)),
    threatScale: 1.48 / (1 + r('mercy') * .16),
    eliteChance: .6 / (1 + r('mercy') * .25),
    campfires: 1 + r('comfort') * .65,
    discoveries: r('discovery') * .8,
    rewardChance: Math.min(.9, .2 + r('fortune') * .07),
    rewardScale: 1 + r('fortune') * .22,
    rewardQuality: Math.floor(r('fortune') / 2),
    supplyScale: 2.6 * (1 - Math.exp(-(.35 + r('plenty') * .28) / 2.6)),
    supplyQuantity: 1 + Math.floor(r('plenty') / 4),
    trapScale: 1.6 / (1 + r('safety') * .35),
  };
}
export function growWorld(before: WorldAttributes, event: Pick<WorldGrowthEvent, 'seed' | 'level' | 'difficulty'>, recent: readonly WorldAttributeName[] = [], randomOverride?: () => number) {
  const after = normalizeWorldAttributes(before);
  const random = randomOverride ?? worldRandom(event.seed, `${WORLD_RULES_VERSION}:growth:${event.level}:${event.difficulty}`);
  let unused = 0;
  const chosen: WorldAttributeName[] = [];
  for (let point = 0; point < 3; point++) {
    const eligible = worldAttributeNames.filter(name => after[name] < 99);
    if (!eligible.length) { unused++; continue; }
    const weights = eligible.map(name => {
      const repetition = recent.filter(n => n === name).length;
      const pressure = ['peace', 'mercy', 'safety', 'comfort'].includes(name) ? 1 / (1 + event.difficulty * .04) : 1;
      return pressure / (1 + repetition * .3);
    });
    let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
    let selected = eligible.at(-1)!;
    for (let i = 0; i < eligible.length; i++) { roll -= weights[i]; if (roll < 0) { selected = eligible[i]; break; } }
    after[selected]++; chosen.push(selected);
  }
  return { before: { ...before }, after, chosen, unused };
}
