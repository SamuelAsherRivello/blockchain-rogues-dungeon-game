import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { Campaign } from '../src/game/types.ts';
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
test('direct generation remains deterministic under the current balance', () => {
  assert.equal(fixture.sourceHash, 'afc33973203552d61cc54b4d3a76d2715499d2063895ebd8d088659ae6385396');
  for (const entry of fixture.direct) {
    const floor = generateFloor(entry.level, entry.seed, entry.difficulty, entry.options);
    const repeat = generateFloor(entry.level, entry.seed, entry.difficulty, entry.options);
    assert.equal(floor.cells.length, floor.height, `${entry.name} floor height`);
    assert.equal(floor.cells[floor.start.y]?.[floor.start.x]?.walkable, true, `${entry.name} start is walkable`);
    assert.deepEqual(repeat, floor, `${entry.name} deterministic generation`);
  }
});

test('historical compact profiles reject without changing the saved record', () => {
  const originalFixtureHash = hash(fixture);
  for (const entry of fixture.compact) {
    const record = structuredClone(entry.record);
    const before = JSON.stringify(record);
    assert.throws(() => restoreCompactCampaign(record), /Unsupported saved world generator/);
    assert.equal(JSON.stringify(record), before);
  }
  assert.equal(hash(fixture), originalFixtureHash);
});
