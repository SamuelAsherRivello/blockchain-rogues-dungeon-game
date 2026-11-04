import test from 'node:test';
import assert from 'node:assert/strict';
import { compactCampaignForSave, createCampaign, restoreCompactCampaign } from '../src/systems/procedural/world-procedural-system.ts';

test('a newly compacted unversioned full campaign round-trips and old compact data fails unchanged', () => {
  const campaign = createCampaign(421);
  const compact = compactCampaignForSave(campaign);
  const profile = compact.floorProfiles!['1'];
  assert.match(profile.tuningVersion!, /world-balance-4-throwing-knife$/);
  const restored = restoreCompactCampaign(structuredClone(compact));
  assert.deepEqual(restored.floor.entities, campaign.floor.entities);
  const stale = structuredClone(compact);
  delete stale.floorProfiles!['1'].tuningVersion;
  const before = JSON.stringify(stale);
  assert.throws(() => restoreCompactCampaign(stale), /Unsupported saved world generator/);
  assert.equal(JSON.stringify(stale), before);
});
