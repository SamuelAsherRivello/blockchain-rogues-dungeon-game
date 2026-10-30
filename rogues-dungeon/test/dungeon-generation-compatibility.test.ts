import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { Campaign, Floor } from '../src/game/types.ts';
import { compactCampaignForSave, generateFloor, restoreCompactCampaign } from '../src/systems/procedural/world-procedural-system.ts';

interface ExpectedLegacyFloor { geometryHash: string; placementHash: string }
interface LegacyFixture {
  sourceHash: string;
  direct: { name: string; level: number; seed: number; difficulty: number; options: Parameters<typeof generateFloor>[3]; expected: ExpectedLegacyFloor }[];
  compact: { name: string; record: Campaign; expected: ExpectedLegacyFloor }[];
}
// Captured before graph integration. These expectations must never be regenerated from the new implementation.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/legacy-generation-fixtures.json', import.meta.url), 'utf8')) as LegacyFixture;
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function assertLegacyFloor(floor: Floor, expected: ExpectedLegacyFloor, name: string) {
  assert.equal(hash({ width: floor.width, height: floor.height, cells: floor.cells, start: floor.start, startRoom: floor.startRoom }), expected.geometryHash, `${name} semantic terrain/start changed`);
  assert.equal(hash({ entities: floor.entities, objectSets: floor.objectSets, decorations: floor.decorations, prefabPlacements: floor.prefabPlacements }), expected.placementHash, `${name} generated placements changed`);
}

test('historical direct geometry remains exact while eligible loot uses the approved Jewel balance', () => {
  assert.equal(fixture.sourceHash, 'afc33973203552d61cc54b4d3a76d2715499d2063895ebd8d088659ae6385396');
  // New balance witnesses are separate from the immutable pre-Jewel captures.
  const jewelPlacements: Record<string, string> = {
    'direct-world-2': '8e8ff752010b5c2ad617cb1b1a4659f39f782e78e2ba699e05306afec373ff5d',
    'direct-world-200': '36ff519902d00d1bf3a7e289c3cdd3a8501e9802c326a6f1f08ba0300d41bd6f',
  };
  for (const entry of fixture.direct) {
    const floor = generateFloor(entry.level, entry.seed, entry.difficulty, entry.options);
    assertLegacyFloor(floor, { ...entry.expected, placementHash: jewelPlacements[entry.name] ?? entry.expected.placementHash }, entry.name);
    if (jewelPlacements[entry.name]) assert.deepEqual(generateFloor(entry.level, entry.seed, entry.difficulty, entry.options).entities, floor.entities, `${entry.name} deterministic Jewel witness`);
  }
});

test('supported historical compact profiles replay exactly and retired balance profiles reject unchanged', () => {
  const originalFixtureHash = hash(fixture);
  for (const entry of fixture.compact) {
    const record = structuredClone(entry.record);
    assert.equal(record.floor.cells.length, 0);
    for (const profile of Object.values(record.floorProfiles ?? {})) assert.equal('topologyVersion' in profile, false);
    if (Object.values(record.floorProfiles ?? {}).some(profile => profile.tuningVersion === 'world-attributes-1:world-balance-1')) {
      const before = JSON.stringify(record);
      assert.throws(() => restoreCompactCampaign(record), /Unsupported saved world generator/);
      assert.equal(JSON.stringify(record), before);
      continue;
    }
    const restored = restoreCompactCampaign(record);
    assertLegacyFloor(restored.floor, entry.expected, entry.name);
    const reloaded = restoreCompactCampaign(JSON.parse(JSON.stringify(compactCampaignForSave(restored))) as Campaign);
    assertLegacyFloor(reloaded.floor, entry.expected, `${entry.name} second compact round trip`);
  }
  assert.equal(hash(fixture), originalFixtureHash);
});
