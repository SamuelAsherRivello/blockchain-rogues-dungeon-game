import assert from "node:assert/strict";
import test from "node:test";
import { applyAction, createRunCampaign } from "../src/systems/procedural/world-procedural-system.ts";
import { emptyLockboxState, reconcileLockboxRecovery, transferLockboxItem, validateLockboxState } from "../src/systems/persistence/lockbox-storage-system.ts";
import { deleteSlot, readLockboxState, readSlot, writeSlot } from "../src/systems/persistence/save-system.ts";
import type { Item, LockboxStorage } from "../src/game/types.ts";

const SHARED = "shared-lockbox";
const sword = (id: string): Item => ({ id, name: "Sword", group: "weapons", modifiers: { offense: 2 } });
class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

test("every authored home lockbox opens the same storage ID", () => {
  const campaign = createRunCampaign(42, 1, 1);
  const arrow = campaign.floor.entities.find(entity => entity.kind === "teleport-arrow")!;
  campaign.player.x = arrow.x; campaign.player.y = arrow.y;
  const home = applyAction(campaign, { type: "enter-teleport" }).state;
  assert.equal(new Set(home.floor.lockboxes!.map(box => box.storageId)).size, 1);
  for (const box of home.floor.lockboxes!) {
    home.player.x = box.x === 1 ? 2 : 7; home.player.y = 8;
    const result = applyAction(home, { type: "move", direction: box.x === 1 ? "w" : "e" });
    assert.equal(result.events.find(event => event.type === "lockbox.opened")?.facts.id, SHARED);
    assert.equal(result.ticks, 0);
  }
});

test("legacy independent contents reset once without mutating the source record", () => {
  const legacy: LockboxStorage = { ...emptyLockboxState(), containers: { "player-home:3": [sword("left")], "player-home:4": [sword("right")] } };
  const original = structuredClone(legacy);
  const merged = validateLockboxState(legacy);
  assert.deepEqual(merged.containers, {});
  assert.deepEqual(legacy, original);
  assert.deepEqual(validateLockboxState(merged), merged);
});

test("legacy contents above ten reset before a new shared deposit is persisted", () => {
  const legacy: LockboxStorage = { ...emptyLockboxState(), containers: {
    "player-home:3": Array.from({ length: 7 }, (_, i) => sword(`left-${i}`)),
    "player-home:4": Array.from({ length: 7 }, (_, i) => sword(`right-${i}`)),
  } };
  const campaign = createRunCampaign(42, 1, 1), disk = new MemoryStorage();
  disk.setItem("rogues-dungeon.slot.1", JSON.stringify({ savedGameVersion: 1, campaign, storage: legacy }));
  const storage = readLockboxState(disk, 1);
  assert.deepEqual(storage.containers, {});
  campaign.player.inventory = [sword("new")];
  const tx = transferLockboxItem(campaign, storage, SHARED, "inventory", "new", 7)!;
  assert.ok(tx);
  writeSlot(disk, 1, tx.campaign, tx.storage);
  const reloaded = readLockboxState(disk, 1);
  assert.deepEqual(Object.keys(reloaded.containers), [SHARED]);
  assert.equal(reloaded.containers[SHARED]![0]!.id, "new");
  assert.equal(reloaded.containers[SHARED]![0]!.containerSlot, 7);
  assert.deepEqual(validateLockboxState(reloaded), reloaded);
});

test("already-canonical overflow stays withdrawable and rejects new deposits until within capacity", () => {
  const storage: LockboxStorage = { ...emptyLockboxState(), legacyOverflow: true, containers: {
    [SHARED]: Array.from({ length: 14 }, (_, i) => sword(`left-${i}`)),
  } };
  const campaign = createRunCampaign(42, 1, 1);
  campaign.player.inventory = [sword("new")];
  assert.equal(storage.containers[SHARED]!.length, 14);
  const disk = new MemoryStorage();
  writeSlot(disk, 1, campaign, storage);
  assert.equal(readLockboxState(disk, 1).containers[SHARED]!.length, 14);
  assert.equal(readLockboxState(disk, 1).legacyOverflow, true);
  assert.throws(() => validateLockboxState({ ...storage, legacyOverflow: false }), /contents/);
  assert.equal(transferLockboxItem(campaign, storage, SHARED, "inventory", "new", 0), null);
  const withdrawal = transferLockboxItem(campaign, storage, SHARED, "lockbox", "left-0", 2)!;
  assert.ok(withdrawal);
  assert.equal(withdrawal.storage.containers[SHARED]!.length, 13);
  assert.equal(withdrawal.campaign.player.inventory.find(item => item.id === "left-0")!.containerSlot, 2);
  assert.deepEqual(validateLockboxState(withdrawal.storage), withdrawal.storage);
  withdrawal.campaign.player.inventoryCapacity = 20;
  let current = withdrawal;
  while (current.storage.containers[SHARED]!.length > 9) {
    const item = current.storage.containers[SHARED]![0]!;
    current = transferLockboxItem(current.campaign, current.storage, SHARED, "lockbox", item.id)!;
    assert.ok(current);
  }
  assert.equal(current.storage.legacyOverflow, undefined);
  assert.ok(transferLockboxItem(current.campaign, current.storage, SHARED, "inventory", "new"));
});

test("reset discards legacy stacks while preserving shared contents and ownership history", () => {
  const potion = (id: string, quantity: number): Item => ({ id, name: "Health Potion", group: "weapons", modifiers: {}, category: "consumable", consumableResource: "health", isStackable: true, quantity });
  const legacy: LockboxStorage = { ...emptyLockboxState(), revision: 2, containers: { "player-home:3": [potion("a", 2)], "player-home:4": [potion("b", 3)], [SHARED]: [{ ...sword("shared"), containerSlot: 8 }] }, provenance: { a: [{ id: "source-a", quantity: 2 }], b: [{ id: "source-b", quantity: 3 }] }, journal: [{ revision: 1, direction: "deposit", lots: [{ id: "source-a", quantity: 2 }] }, { revision: 2, direction: "deposit", lots: [{ id: "source-b", quantity: 3 }] }] };
  const merged = validateLockboxState(legacy);
  assert.equal(merged.containers[SHARED]!.length, 1);
  assert.deepEqual(merged.containers, { [SHARED]: [{ ...sword("shared"), containerSlot: 8 }] });
  assert.equal(merged.revision, legacy.revision);
  assert.deepEqual(merged.journal, legacy.journal);
  assert.deepEqual(merged.provenance, legacy.provenance);
  assert.deepEqual(validateLockboxState(merged), merged);
});

test("reset retains the deposit journal so an older checkpoint cannot revive discarded contents", () => {
  const checkpoint = createRunCampaign(42, 1, 1);
  checkpoint.player.inventory = [sword("discarded"), sword("unrelated")];
  const tx = transferLockboxItem(checkpoint, emptyLockboxState(), SHARED, "inventory", "discarded")!;
  const legacy = { ...tx.storage, containers: { "player-home:3": tx.storage.containers[SHARED]! } };
  const reset = validateLockboxState(legacy);
  assert.deepEqual(reset.containers, {});
  const recovered = reconcileLockboxRecovery(checkpoint, reset);
  assert.deepEqual(recovered.player.inventory.map(item => item.id), ["unrelated"]);
  assert.deepEqual(reconcileLockboxRecovery(recovered, reset), recovered);
  assert.deepEqual(checkpoint.player.inventory.map(item => item.id), ["discarded", "unrelated"]);
});

test("shared storage survives reload and Classic replacement while Saved Games stay separate", () => {
  const disk = new MemoryStorage(), campaign = createRunCampaign(42, 1, 1, 1, 1, { mode: "classic" });
  campaign.player.inventory = [sword("retained")];
  const tx = transferLockboxItem(campaign, emptyLockboxState(), SHARED, "inventory", "retained", 7)!;
  assert.ok(tx); writeSlot(disk, 1, tx.campaign, tx.storage);
  assert.equal(readLockboxState(disk, 1).containers[SHARED]![0]!.containerSlot, 7);
  assert.deepEqual(readLockboxState(disk, 2).containers, {});
  deleteSlot(disk, 1); assert.equal(readSlot(disk, 1), null);
  writeSlot(disk, 1, createRunCampaign(42, 1, 2));
  assert.equal(readLockboxState(disk, 1).containers[SHARED]![0]!.id, "retained");
});
