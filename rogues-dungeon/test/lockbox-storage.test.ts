import assert from "node:assert/strict";
import test from "node:test";
import { createRunCampaign } from "../src/systems/procedural/world-procedural-system.ts";
import { deleteSlot, readSlot, readSlotSummary, readLockboxState, writeSlot } from "../src/systems/persistence/save-system.ts";
import { emptyLockboxState, transferLockboxItem } from "../src/systems/persistence/lockbox-storage-system.ts";
import type { Item } from "../src/game/types.ts";

class MemoryStorage {
  values = new Map<string, string>();
  fail = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.fail) throw new Error("Quota"); this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
const sword = (id = "sword"): Item => ({ id, name: "Sword", group: "weapons", modifiers: { offense: 2 } });

test("persists independent lockboxes and retains them after Classic termination", () => {
  const storage = new MemoryStorage();
  const campaign = createRunCampaign(42, 1, 1, 1, 1, { mode: "classic" });
  const boxes = emptyLockboxState(); boxes.containers["player-home:3"] = [sword()];
  writeSlot(storage, 1, campaign, boxes);
  assert.equal(readLockboxState(storage, 1).containers["player-home:3"]!.length, 1);
  assert.deepEqual(readLockboxState(storage, 2).containers, {});
  assert.equal(readSlot(storage, 1)!.mode, "classic");
  deleteSlot(storage, 1);
  assert.equal(readSlot(storage, 1), null);
  assert.equal(readSlotSummary(storage)[0]!.occupied, false);
  assert.equal(readLockboxState(storage, 1).containers["player-home:3"]!.length, 1);
  writeSlot(storage, 1, createRunCampaign(42, 1, 2));
  assert.equal(readLockboxState(storage, 1).containers["player-home:3"]!.length, 1);
});

test("transfers whole items and stacks with fixed capacity and no mutation on rejection", () => {
  const campaign = createRunCampaign(43, 1, 1);
  campaign.player.inventory = [sword()];
  const boxes = emptyLockboxState();
  const deposited = transferLockboxItem(campaign, boxes, "player-home:3", "inventory", "sword")!;
  assert.equal(deposited.campaign.player.inventory.length, 0);
  assert.equal(deposited.storage.containers["player-home:3"]!.length, 1);
  assert.equal(campaign.player.inventory.length, 1);
  assert.deepEqual(boxes.containers, {});
  const withdrawn = transferLockboxItem(deposited.campaign, deposited.storage, "player-home:3", "lockbox", "sword")!;
  assert.equal(withdrawn.campaign.player.inventory[0]!.id, "sword");
  boxes.containers["player-home:3"] = Array.from({ length: 10 }, (_, i) => sword(String(i)));
  assert.equal(transferLockboxItem(campaign, boxes, "player-home:3", "inventory", "sword"), null);
});

test("storage writes reject atomically without mutating the supplied campaign or containers", () => {
  const storage = new MemoryStorage(), campaign = createRunCampaign(44, 1, 1), boxes = emptyLockboxState();
  campaign.player.inventory = [sword()];
  writeSlot(storage, 1, campaign, boxes);
  const original = storage.getItem("rogues-dungeon.slot.1");
  const transaction = transferLockboxItem(campaign, boxes, "player-home:3", "inventory", "sword")!;
  storage.fail = true;
  assert.throws(() => writeSlot(storage, 1, transaction.campaign, transaction.storage), /Quota/);
  assert.equal(storage.getItem("rogues-dungeon.slot.1"), original);
  assert.equal(campaign.player.inventory.length, 1);
  assert.deepEqual(boxes.containers, {});
});
