import assert from 'node:assert/strict';
import test from 'node:test';
import type { Campaign, Equipment } from '../src/game/types.ts';
import { applyAction, buildDeathRecovery, compactCampaignForSave, createAdventureLevelBaseline, createCampaign, createRunCampaign, effectiveAttributes, prepareJourneyCheckpoint, restoreCompactCampaign, worldDroppableItemInstance } from '../src/systems/procedural/world-procedural-system.ts';
import { DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH, DEVELOPMENT_STORAGE_COMPATIBILITY_KEY, resetDevelopmentStorageCompatibility } from '../src/systems/persistence/development-storage-system.ts';
import { readSlot, writeSlot } from '../src/systems/persistence/save-system.ts';
import { droppableItemSpriteFrame } from '../src/systems/rendering/world-object-sprite-system.ts';
import { JEWEL_NAMES } from '../src/content/items/jewel-catalog.ts';
import { emptyLockboxState, reconcileLockboxRecovery, transferLockboxItem } from '../src/systems/persistence/lockbox-storage-system.ts';
import { readLockboxState } from '../src/systems/persistence/save-system.ts';

class MemoryStorage {
  values = new Map<string, string>(); get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function mixedLoadout() {
  let state = createCampaign(42); state.floor.entities = []; state.floor.objectSets = []; state.player.inventoryCapacity = 10;
  const ring = worldDroppableItemInstance('Silver Ring of Vigor', 'worn-ring'), amulet = worldDroppableItemInstance('Sapphire Amulet', 'worn-amulet');
  state.player.inventory = [ring, amulet, worldDroppableItemInstance('Gold Guard Bracelet', 'carried'), worldDroppableItemInstance('Prismatic Amulet', 'dropped'), worldDroppableItemInstance('Gold Ring of Vigor', 'duplicate-a'), worldDroppableItemInstance('Gold Ring of Vigor', 'duplicate-b')];
  for (const [index, itemId] of [[0, ring.id], [1, amulet.id]] as const) {
    const result = applyAction(state, { type: 'equip', group: 'jewels', index, itemId }); assert.equal(result.accepted, true); state = result.state;
  }
  const dropped = applyAction(state, { type: 'drop-item', source: { kind: 'inventory', itemId: 'dropped' } }); assert.equal(dropped.accepted, true); state = dropped.state;
  const chest = { kind: 'chest', id: 'unopened-jewel-chest', x: state.player.x + 2, y: state.player.y, rewardAmount: 0, rewardItem: worldDroppableItemInstance('Quartz Amulet', 'unopened-reward') } as const;
  state.floor.entities.push(chest);
  return state;
}

function assertMixed(restored: Campaign, source: Campaign) {
  assert.deepEqual(restored.player.equipment.jewels, source.player.equipment.jewels);
  assert.deepEqual(restored.player.inventory, source.player.inventory); assert.deepEqual(restored.player.resources, source.player.resources);
  assert.deepEqual(effectiveAttributes(restored), effectiveAttributes(source));
  for (const id of ['dropped', 'unopened-reward']) {
    const find = (state: Campaign) => state.floor.entities.flatMap(entity => entity.kind === 'item' ? [entity.item] : entity.kind === 'chest' || entity.kind === 'crate' ? entity.rewardItem ? [entity.rewardItem] : [] : []).find(item => item.id === id);
    assert.deepEqual(find(restored), find(source)); assert.equal(droppableItemSpriteFrame(find(restored)?.name), droppableItemSpriteFrame(find(source)?.name));
  }
  const ids = [...restored.player.inventory, ...restored.player.equipment.jewels.filter(item => item !== null)].map(item => item.id);
  assert.equal(new Set(ids).size, ids.length); assert.equal(ids.filter(id => id.startsWith('duplicate-')).length, 2);
}

test('mixed Jewels round-trip live saves, compact floor deltas, rewards, drops and repeated reloads', () => {
  const state = mixedLoadout(), storage = new MemoryStorage();
  const compact = compactCampaignForSave(state); assertMixed(restoreCompactCampaign(structuredClone(compact)), state);
  writeSlot(storage, '1', state);
  for (let pass = 0; pass < 3; pass++) { const restored = readSlot(storage, '1'); assert.ok(restored); assertMixed(restored, state); writeSlot(storage, '1', restored); }
});

test('same-epoch saves missing Jewels initialize only two empty positions', () => {
  const state = createCampaign(42), storage = new MemoryStorage();
  writeSlot(storage, '2', state); const snapshot = structuredClone(readSlot(storage, '2')!.player);
  delete (state.player.equipment as Partial<Equipment>).jewels;
  storage.setItem(DEVELOPMENT_STORAGE_COMPATIBILITY_KEY, DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH);
  storage.setItem('rogues-dungeon.slot.1', JSON.stringify(state));
  const restored = readSlot(storage, '1'); assert.ok(restored); assert.deepEqual(restored.player, snapshot);
  assert.deepEqual(restored.player.equipment.jewels, [null, null]);
});

test('Jewel ownership follows Adventure reset, Journey checkpoint, and Classic death', () => {
  const adventure = mixedLoadout(); adventure.mode = 'adventure'; adventure.adventureBaseline = createAdventureLevelBaseline(adventure);
  const reset = buildDeathRecovery(adventure); assert.ok(reset); assert.deepEqual(reset.player.equipment.jewels, [null, null]);
  assert.equal(reset.player.inventory.some(item => item.group === 'jewels'), false);
  const journey = mixedLoadout(); journey.mode = 'journey'; journey.journeyCheckpoint = prepareJourneyCheckpoint(journey);
  const checkpoint = structuredClone(journey); journey.player.equipment.jewels = [null, null]; journey.player.inventory = [];
  const recovered = buildDeathRecovery(journey); assert.ok(recovered); assertMixed(recovered, checkpoint);
  const storage = new MemoryStorage(); writeSlot(storage, '1', journey); const loaded = readSlot(storage, '1'); assert.ok(loaded?.journeyCheckpoint);
  assertMixed(buildDeathRecovery(loaded)!, checkpoint);
  assert.equal(buildDeathRecovery({ ...mixedLoadout(), mode: 'classic' }), null);
});

test('a Jewel save survives subsequent startups under the current development epoch', () => {
  const storage = new MemoryStorage(); storage.setItem('unrelated', 'keep'); storage.setItem('rogues-dungeon.slot.1', 'obsolete');
  assert.equal(resetDevelopmentStorageCompatibility(storage), true); assert.equal(storage.getItem('unrelated'), 'keep');
  const state = mixedLoadout(); writeSlot(storage, '1', state); const bytes = storage.getItem('rogues-dungeon.slot.1');
  assert.equal(resetDevelopmentStorageCompatibility(storage), false); assert.equal(storage.getItem('rogues-dungeon.slot.1'), bytes); assertMixed(readSlot(storage, '1')!, state);
});

test('all ten Jewels follow generic lockbox ownership without buffs or checkpoint copies', () => {
  let state = createRunCampaign(42, 1, 1, 1, 1, { mode: 'journey' }); state.player.inventoryCapacity = 10;
  state.player.inventory = JEWEL_NAMES.map((name, index) => worldDroppableItemInstance(name, `stored-${index}`));
  const original = structuredClone(state.player.inventory), baseline = effectiveAttributes(state);
  state.journeyCheckpoint = prepareJourneyCheckpoint(state);
  let boxes = emptyLockboxState();
  for (const item of original) {
    const moved = transferLockboxItem(state, boxes, 'shared-lockbox', 'inventory', item.id); assert.ok(moved);
    state = moved.campaign; boxes = moved.storage;
  }
  assert.equal(state.player.inventory.length, 0); assert.deepEqual(effectiveAttributes(state), baseline);
  const storage = new MemoryStorage(); writeSlot(storage, '1', state, boxes);
  state = readSlot(storage, '1')!; boxes = readLockboxState(storage, '1');
  const recovered = reconcileLockboxRecovery(buildDeathRecovery(state)!, boxes);
  assert.equal(recovered.player.inventory.length, 0); assert.deepEqual(recovered.player.equipment.jewels, [null, null]);
  assert.deepEqual(boxes.containers['shared-lockbox']!.map(item => item.id).sort(), original.map(item => item.id).sort());
  for (const item of original) {
    const moved = transferLockboxItem(state, boxes, 'shared-lockbox', 'lockbox', item.id); assert.ok(moved);
    state = moved.campaign; boxes = moved.storage;
    const restored = state.player.inventory.find(entry => entry.id === item.id)!;
    assert.deepEqual(restored.modifiers, item.modifiers); assert.equal(restored.name, item.name); assert.equal(droppableItemSpriteFrame(restored.name), droppableItemSpriteFrame(item.name));
  }
  assert.equal(state.player.inventory.length, 10); assert.equal(boxes.containers['shared-lockbox']!.length, 0); assert.deepEqual(effectiveAttributes(state), baseline);
});
