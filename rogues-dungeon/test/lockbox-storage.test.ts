import assert from "node:assert/strict";
import test from "node:test";
import { buildDeathRecovery, createGameSession, createRunCampaign, normalizeQuickSlots, normalizeStackableLocations, prepareJourneyCheckpoint } from "../src/systems/procedural/world-procedural-system.ts";
import { clearRoguesDungeonStorage, createLockboxPersistence, deleteSlot, readSlot, readSlotSummary, readLockboxState, writeSlot } from "../src/systems/persistence/save-system.ts";
import { emptyLockboxState, reconcileLockboxRecovery, transferLockboxItem } from "../src/systems/persistence/lockbox-storage-system.ts";
import { consumeItemProvenance, mergeItemProvenance } from "../src/systems/procedural/item-provenance-system.ts";
import type { Action, Item } from "../src/game/types.ts";
import { resolveInventoryDrop } from "../src/game/inventory-drag.ts";

class MemoryStorage {
  values = new Map<string, string>();
  fail = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.fail) throw new Error("Quota"); this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
}
const sword = (id = "sword"): Item => ({ id, name: "Sword", group: "weapons", modifiers: { offense: 2 } });

test("persists shared lockbox storage and retains it after Classic termination", () => {
  const storage = new MemoryStorage();
  const campaign = createRunCampaign(42, 1, 1, 1, 1, { mode: "classic" });
  const boxes = emptyLockboxState(); boxes.containers["shared-lockbox"] = [sword()];
  writeSlot(storage, 1, campaign, boxes);
  assert.equal(readLockboxState(storage, 1).containers["shared-lockbox"]!.length, 1);
  assert.deepEqual(readLockboxState(storage, 2).containers, {});
  assert.equal(readSlot(storage, 1)!.mode, "classic");
  deleteSlot(storage, 1);
  assert.equal(readSlot(storage, 1), null);
  assert.equal(readSlotSummary(storage)[0]!.occupied, false);
  assert.equal(readLockboxState(storage, 1).containers["shared-lockbox"]!.length, 1);
  writeSlot(storage, 1, createRunCampaign(42, 1, 2));
  assert.equal(readLockboxState(storage, 1).containers["shared-lockbox"]!.length, 1);
});

test("transfers whole items and stacks with fixed capacity and no mutation on rejection", () => {
  const campaign = createRunCampaign(43, 1, 1);
  campaign.player.inventory = [sword()];
  const boxes = emptyLockboxState();
  const deposited = transferLockboxItem(campaign, boxes, "shared-lockbox", "inventory", "sword")!;
  assert.equal(deposited.campaign.player.inventory.length, 0);
  assert.equal(deposited.storage.containers["shared-lockbox"]!.length, 1);
  assert.equal(campaign.player.inventory.length, 1);
  assert.deepEqual(boxes.containers, {});
  const withdrawn = transferLockboxItem(deposited.campaign, deposited.storage, "shared-lockbox", "lockbox", "sword")!;
  assert.equal(withdrawn.campaign.player.inventory[0]!.id, "sword");
  boxes.containers["shared-lockbox"] = Array.from({ length: 10 }, (_, i) => sword(String(i)));
  assert.equal(transferLockboxItem(campaign, boxes, "shared-lockbox", "inventory", "sword"), null);
});

test("storage writes reject atomically without mutating the supplied campaign or containers", () => {
  const storage = new MemoryStorage(), campaign = createRunCampaign(44, 1, 1), boxes = emptyLockboxState();
  campaign.player.inventory = [sword()];
  writeSlot(storage, 1, campaign, boxes);
  const original = storage.getItem("rogues-dungeon.slot.1");
  const transaction = transferLockboxItem(campaign, boxes, "shared-lockbox", "inventory", "sword")!;
  storage.fail = true;
  assert.throws(() => writeSlot(storage, 1, transaction.campaign, transaction.storage), /Quota/);
  assert.equal(storage.getItem("rogues-dungeon.slot.1"), original);
  assert.equal(campaign.player.inventory.length, 1);
  assert.deepEqual(boxes.containers, {});
});

test("loads legacy records empty and rejects malformed storage without rewriting bytes", () => {
  const storage = new MemoryStorage(), campaign = createRunCampaign(45, 1, 1);
  writeSlot(storage, 1, campaign);
  assert.equal(JSON.parse(storage.getItem("rogues-dungeon.slot.1")!).version, 6);
  assert.deepEqual(readLockboxState(storage, 1), emptyLockboxState());
  const raw = JSON.stringify({ savedGameVersion: 1, campaign, storage: { version: 9 } });
  storage.setItem("rogues-dungeon.slot.1", raw);
  assert.throws(() => readLockboxState(storage, 1), /lockbox/i);
  assert.throws(() => readSlot(storage, 1), /lockbox/i);
  assert.equal(storage.getItem("rogues-dungeon.slot.1"), raw);
});

const potion = (id: string, quantity = 1): Item => ({ id, name: "Health Potion", group: "weapons", modifiers: {}, category: "consumable", consumableResource: "health", isStackable: true, quantity });

test("rejects capacity removal, multi-position overflow and unknown authored targets", () => {
  const campaign = createRunCampaign(46, 1, 1), storage = emptyLockboxState();
  campaign.player.inventoryCapacity = 1;
  campaign.player.inventory = [{ ...sword("capacity"), category: "capacity", capacityBonus: 6 }, sword("a"), sword("b")];
  assert.equal(transferLockboxItem(campaign, storage, "shared-lockbox", "inventory", "capacity"), null);
  campaign.player.inventoryCapacity = 5;
  campaign.player.inventory = [{ ...sword(), slotSpan: 2 }];
  storage.containers["shared-lockbox"] = Array.from({ length: 9 }, (_, i) => sword(String(i)));
  assert.equal(transferLockboxItem(campaign, storage, "shared-lockbox", "inventory", "sword"), null);
  assert.equal(transferLockboxItem(campaign, storage, "player-home:999", "inventory", "sword"), null);
});

test("whole stacks merge and withdraw into Inventory even beside an occupied Quick Slot", () => {
  const campaign = createRunCampaign(47, 1, 1), storage = emptyLockboxState();
  campaign.player.inventory = [potion("a", 2)];
  storage.containers["shared-lockbox"] = [potion("b", 3)];
  const deposited = transferLockboxItem(campaign, storage, "shared-lockbox", "inventory", "a")!;
  assert.equal(deposited.storage.containers["shared-lockbox"]![0]!.quantity, 5);
  deposited.campaign.player.quickSlots = [{ item: potion("quick"), quantity: 4 }, null];
  const withdrawn = transferLockboxItem(deposited.campaign, deposited.storage, "shared-lockbox", "lockbox", "b")!;
  normalizeQuickSlots(withdrawn.campaign); normalizeStackableLocations(withdrawn.campaign);
  assert.equal(withdrawn.campaign.player.inventory[0]!.quantity, 5);
  assert.equal(withdrawn.campaign.player.quickSlots![0]!.quantity, 4);
});

test("Journey reconciliation removes deposited ownership from possessions and world pickups idempotently", () => {
  const campaign = createRunCampaign(48, 1, 1, 1, 1, { mode: "journey" });
  campaign.player.inventory = [sword()];
  campaign.journeyCheckpoint = prepareJourneyCheckpoint(campaign);
  const deposited = transferLockboxItem(campaign, emptyLockboxState(), "shared-lockbox", "inventory", "sword")!;
  const recovery = reconcileLockboxRecovery(buildDeathRecovery(deposited.campaign)!, deposited.storage);
  assert.equal(recovery.player.inventory.length, 0);
  assert.deepEqual(reconcileLockboxRecovery(recovery, deposited.storage).player.inventory, []);
  const oldWorld = structuredClone(campaign);
  oldWorld.player.inventory = [];
  oldWorld.floor.entities.push({ kind: "item", id: "source", x: 2, y: 2, item: sword() });
  assert.equal(reconcileLockboxRecovery(oldWorld, deposited.storage).floor.entities.some(entity => entity.id === "source"), false);
});

test("withdrawals survive reload and later Journey checkpoints without reviving the earlier source", () => {
  const storage = new MemoryStorage(), campaign = createRunCampaign(49, 1, 1, 1, 1, { mode: "journey" });
  campaign.player.inventory = [sword()];
  const deposited = transferLockboxItem(campaign, emptyLockboxState(), "shared-lockbox", "inventory", "sword")!;
  writeSlot(storage, 1, deposited.campaign, deposited.storage);
  const withdrawn = transferLockboxItem(readSlot(storage, 1)!, readLockboxState(storage, 1), "shared-lockbox", "lockbox", "sword")!;
  withdrawn.campaign.journeyCheckpoint = prepareJourneyCheckpoint(withdrawn.campaign);
  writeSlot(storage, 1, withdrawn.campaign, withdrawn.storage);
  const loaded = readSlot(storage, 1)!;
  assert.equal(loaded.player.inventory.length, 1);
  assert.equal(reconcileLockboxRecovery(buildDeathRecovery(loaded)!, withdrawn.storage).player.inventory.length, 1);
  assert.equal(withdrawn.storage.containers["shared-lockbox"]!.length, 0);
});

test("merged and partially consumed stack provenance keeps the unrelated checkpoint quantity", () => {
  const campaign = createRunCampaign(50, 1, 1, 1, 1, { mode: "journey" });
  const a = potion("a", 3), b = potion("b", 2);
  campaign.player.inventory = [a, b];
  campaign.journeyCheckpoint = prepareJourneyCheckpoint(campaign);
  mergeItemProvenance(campaign, a, b);
  a.quantity = 5; campaign.player.inventory = [a];
  consumeItemProvenance(campaign, a, 5, 1); a.quantity = 4;
  const deposited = transferLockboxItem(campaign, emptyLockboxState(), "shared-lockbox", "inventory", "a")!;
  const recovery = reconcileLockboxRecovery(buildDeathRecovery(deposited.campaign)!, deposited.storage);
  assert.equal(recovery.player.inventory.reduce((sum, item) => sum + (item.quantity ?? 1), 0), 1);
  assert.equal(reconcileLockboxRecovery(recovery, deposited.storage).player.inventory[0]!.quantity, 1);
});

test("session pauses every world action and publishes a storage result only after persistence succeeds", () => {
  const campaign = createRunCampaign(51, 1, 1); campaign.player.inventory = [sword()];
  let publications = 0;
  const session = createGameSession(campaign, { getInputPaused: () => true });
  session.subscribe(() => publications++);
  const attempts: Action[] = [{ type: "wait" }, { type: "move", direction: "e" }, { type: "move-pixels", to: { x: 20, y: 20 } }, { type: "trap-strike", hazardElapsedMs: 5000 }, { type: "ability", index: 0 }, { type: "resolve-ability", abilityId: "heal" }, { type: "rest" }, { type: "toggle-sneak" }, { type: "use-quick-slot", index: 0 }];
  for (const action of attempts) {
    assert.equal(session.dispatch(action)?.accepted, false);
    assert.equal(session.getState(), campaign);
  }
  const transaction = transferLockboxItem(campaign, emptyLockboxState(), "shared-lockbox", "inventory", "sword")!;
  assert.throws(() => session.commitStorage(campaign, transaction.campaign, () => { throw new Error("Quota"); }), /Quota/);
  assert.equal(session.getState(), campaign); assert.equal(publications, 0);
  assert.equal(session.commitStorage(campaign, transaction.campaign, () => {}), true);
  assert.equal(publications, 1); assert.equal(session.getState().floor.time, campaign.floor.time);
  assert.equal(session.commitStorage(campaign, transaction.campaign, () => { throw new Error("Stale write"); }), false);
});

test("storage sources and destinations never fall through to legacy loadout or world-drop actions", () => {
  const item = sword();
  const source = { kind: "lockbox" as const, boxId: "shared-lockbox", item };
  for (const destination of [{ kind: "drop-item" as const }, { kind: "quick-slot" as const, index: 0 }, { kind: "slot" as const, group: "weapons" as const, index: 0 }, { kind: "inventory" as const }]) assert.equal(resolveInventoryDrop(source, destination), null);
  assert.equal(resolveInventoryDrop({ kind: "inventory", item }, { kind: "lockbox", boxId: "shared-lockbox" }), null);
});

test("the memory adapter isolates inspection storage and publishes no state after a failed durable write", () => {
  const memory = createLockboxPersistence(null, 1), campaign = createRunCampaign(52, 1, 1);
  campaign.player.inventory = [sword()];
  const transaction = transferLockboxItem(campaign, memory.getState(), "shared-lockbox", "inventory", "sword")!;
  memory.commit(transaction.campaign, transaction.storage);
  assert.equal(memory.getState().containers["shared-lockbox"]!.length, 1);
  const browser = new MemoryStorage(), durable = createLockboxPersistence(browser, 1);
  browser.fail = true;
  assert.throws(() => durable.commit(transaction.campaign, transaction.storage));
  assert.deepEqual(durable.getState(), emptyLockboxState());
  assert.equal(browser.values.size, 0);
  browser.fail = false;
  durable.commit(transaction.campaign, transaction.storage);
  clearRoguesDungeonStorage(browser);
  assert.deepEqual(readLockboxState(browser, 1), emptyLockboxState());
});

test("travel, reload and Adventure recovery preserve shared storage and retire generated loot", () => {
  const disk = new MemoryStorage(), original = createRunCampaign(53, 1, 1);
  const arrow = original.floor.entities.find(entity => entity.kind === "teleport-arrow")!;
  original.player.x = arrow.x; original.player.y = arrow.y;
  original.player.inventory = [sword("generated-a"), { ...sword("generated-b"), slotSpan: 2 }];
  const adapter = createLockboxPersistence(disk, 1);
  let session = createGameSession(original, { reconcileRecovery: state => reconcileLockboxRecovery(state, adapter.getState()) });
  for (const [id, box] of [["generated-a", "shared-lockbox"], ["generated-b", "shared-lockbox"]]) {
    const before = session.getState();
    const tx = transferLockboxItem(before, adapter.getState(), box!, "inventory", id!)!;
    assert.equal(session.commitStorage(before, tx.campaign, () => adapter.commit(tx.campaign, tx.storage)), true);
  }
  const enteredHome = session.dispatch({ type: "enter-teleport" });
  assert.ok(enteredHome && !("queued" in enteredHome));
  assert.equal(enteredHome.state.activePrefab?.id, "player-home");
  writeSlot(disk, 1, session.getState());
  const loaded = readSlot(disk, 1)!;
  assert.equal(loaded.floor.lockboxes?.length, 2);
  const recovered = reconcileLockboxRecovery(buildDeathRecovery(loaded)!, adapter.getState());
  assert.equal(recovered.player.inventory.length, 0);
  assert.equal(readLockboxState(disk, 1).containers["shared-lockbox"]![0]!.id, "generated-a");
  assert.equal(readLockboxState(disk, 1).containers["shared-lockbox"]!.find(item => item.id === "generated-b")!.slotSpan, 2);
  session = createGameSession(recovered);
  assert.ok(session.getState());
});

test("Journey ownership distinguishes equal names and retires equipment aliases across checkpoint revisions", () => {
  const campaign = createRunCampaign(54, 1, 1, 1, 1, { mode: "journey" });
  const wide = { ...sword("wide"), slotSpan: 2 as const };
  campaign.player.inventory = [wide, sword("different-sword")];
  campaign.player.equipment.weapons = [wide, wide];
  campaign.journeyCheckpoint = prepareJourneyCheckpoint(campaign);
  campaign.player.equipment.weapons = [null, null];
  const deposit = transferLockboxItem(campaign, emptyLockboxState(), "shared-lockbox", "inventory", "wide")!;
  const recovered = reconcileLockboxRecovery(buildDeathRecovery(deposit.campaign)!, deposit.storage);
  assert.deepEqual(recovered.player.inventory.map(item => item.id), ["different-sword"]);
  assert.deepEqual(recovered.player.equipment.weapons, [null, null]);
  deposit.campaign.journeyCheckpoint = prepareJourneyCheckpoint(deposit.campaign);
  const withdraw = transferLockboxItem(deposit.campaign, deposit.storage, "shared-lockbox", "lockbox", "wide")!;
  const middle = reconcileLockboxRecovery(buildDeathRecovery(withdraw.campaign)!, withdraw.storage);
  assert.deepEqual(middle.player.inventory.map(item => item.id), ["different-sword"]);
  assert.deepEqual(withdraw.storage.containers["shared-lockbox"], []);
  withdraw.campaign.journeyCheckpoint = prepareJourneyCheckpoint(withdraw.campaign);
  const latest = reconcileLockboxRecovery(buildDeathRecovery(withdraw.campaign)!, withdraw.storage);
  assert.equal(latest.player.inventory.find(item => item.id === "wide")?.slotSpan, 2);
});

test("transfers retain the chosen slot in both directions across reloads", () => {
  const disk = new MemoryStorage(), campaign = createRunCampaign(55, 1, 1);
  campaign.player.inventoryCapacity = 10;
  campaign.player.inventory = [sword("a"), sword("b")];
  const deposit = transferLockboxItem(campaign, emptyLockboxState(), "shared-lockbox", "inventory", "a", 7)!;
  assert.equal(deposit.storage.containers["shared-lockbox"]![0]!.containerSlot, 7);
  assert.equal(deposit.campaign.player.inventory[0]!.containerSlot, 1);
  writeSlot(disk, 1, deposit.campaign, deposit.storage);
  assert.equal(readLockboxState(disk, 1).containers["shared-lockbox"]![0]!.containerSlot, 7);
  const withdrawal = transferLockboxItem(readSlot(disk, 1)!, readLockboxState(disk, 1), "shared-lockbox", "lockbox", "a", 6)!;
  writeSlot(disk, 1, withdrawal.campaign, withdrawal.storage);
  assert.equal(readSlot(disk, 1)!.player.inventory.find(item => item.id === "a")!.containerSlot, 6);
});

test("a chosen slot must fit the complete item and cannot replace an unrelated item", () => {
  const campaign = createRunCampaign(55, 1, 1), storage = emptyLockboxState();
  campaign.player.inventory = [{ ...sword("wide"), slotSpan: 2 }];
  storage.containers["shared-lockbox"] = [sword("occupied")];
  assert.equal(transferLockboxItem(campaign, storage, "shared-lockbox", "inventory", "wide", 0), null);
  assert.equal(transferLockboxItem(campaign, storage, "shared-lockbox", "inventory", "wide", 9), null);
  assert.equal(transferLockboxItem(campaign, storage, "shared-lockbox", "inventory", "wide", -1), null);
  const accepted = transferLockboxItem(campaign, storage, "shared-lockbox", "inventory", "wide", 7)!;
  assert.equal(accepted.storage.containers["shared-lockbox"]!.find(item => item.id === "wide")!.containerSlot, 7);
});

test("a merged whole stack occupies the user's chosen available slot", () => {
  const campaign = createRunCampaign(55, 1, 1), storage = emptyLockboxState();
  campaign.player.inventory = [potion("incoming", 2)];
  storage.containers["shared-lockbox"] = [{ ...potion("existing", 3), containerSlot: 2 }];
  const result = transferLockboxItem(campaign, storage, "shared-lockbox", "inventory", "incoming", 8)!;
  assert.equal(result.storage.containers["shared-lockbox"]!.length, 1);
  assert.equal(result.storage.containers["shared-lockbox"]![0]!.quantity, 5);
  assert.equal(result.storage.containers["shared-lockbox"]![0]!.containerSlot, 8);
});
