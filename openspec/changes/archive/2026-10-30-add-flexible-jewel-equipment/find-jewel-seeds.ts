import { writeFileSync } from 'node:fs';
import { JEWEL_CATALOG } from '../../../rogues-dungeon/src/content/items/jewel-catalog.ts';
import { generateFloor } from '../../../rogues-dungeon/src/systems/procedural/world-procedural-system.ts';
import { DEFAULT_WORLD_ATTRIBUTES } from '../../../rogues-dungeon/src/systems/procedural/world-attributes.ts';

const witnesses: { name: string; level: number; seed: number; source: string; id: string; x: number; y: number }[] = [];
for (const level of [2, 4, 6, 7]) {
  const wanted = JEWEL_CATALOG.filter(jewel => jewel.unlockLevel === level).map(jewel => jewel.name as string);
  for (let seed = 1; seed <= 2000 && wanted.some(name => !witnesses.some(witness => witness.name === name)); seed++) {
    const floor = generateFloor(level, seed, level, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
    for (const entity of floor.entities) {
      const item = entity.kind === 'item' ? entity.item : entity.kind === 'chest' || entity.kind === 'crate' ? entity.rewardItem : undefined;
      if (item?.group === 'jewels' && wanted.includes(item.name) && !witnesses.some(witness => witness.name === item.name)) {
        const witness = { name: item.name, level, seed, source: entity.kind, id: entity.id, x: entity.x, y: entity.y };
        witnesses.push(witness); console.log(JSON.stringify(witness));
      }
    }
  }
}
if (witnesses.length !== 10) throw new Error(`Only ${witnesses.length}/10 production witnesses found`);
writeFileSync(new URL('../../../rogues-dungeon/test/jewel-production-seeds.json', import.meta.url), JSON.stringify(witnesses, null, 2) + '\n');
