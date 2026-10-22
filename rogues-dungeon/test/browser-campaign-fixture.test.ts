import assert from "node:assert/strict";
import test from "node:test";
import { campaignFixturesFrom } from "./browser/campaign-fixture.ts";
import { createCampaign } from "../src/systems/procedural/world-procedural-system.ts";
import { readSlot, writeSlot } from "../src/systems/persistence/save-system.ts";

test("browser fixtures retain current campaign contracts without resetting their arena", () => {
  const source = createCampaign(90210);
  source.version = 3;
  source.floor.time = 7;
  source.player.x = 50; source.player.y = 50;
  source.floor.cells = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ({ walkable: true, role: "floor" })));
  delete source.floor.map;
  source.floor.entities = [{ id: "fixture-chest", kind: "chest", x: 49, y: 50, opened: false }];
  const records = campaignFixturesFrom(saved => localStorage.setItem("rogues-dungeon.slot.2", JSON.stringify(saved)), source);
  const campaign = records["rogues-dungeon.slot.2"]!;
  assert.equal(campaign.version, 6);
  assert.equal(campaign.mode, "adventure");
  assert.deepEqual(campaign.player.pixel, { x: 1616, y: 1616 });
  assert.equal(campaign.floor.time, 7);
  assert.equal(campaign.quest?.id, "my-first-quest");
  const data = new Map(Object.entries(records).map(([key, value]) => [key, JSON.stringify(value)]));
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  const loaded = readSlot(storage, 2)!;
  assert.equal(loaded.player.x, 50);
  assert.equal(loaded.floor.time, 7);
  assert.equal(loaded.floor.entities[0]?.id, "fixture-chest");
  writeSlot(storage, 2, loaded);
  const compact = JSON.parse(data.get("rogues-dungeon.slot.2")!);
  assert.equal(compact.floor.cells.length, 0);
  assert.equal(readSlot(storage, 2)!.floor.entities.find(entity => entity.id === "fixture-chest")?.kind, "chest");
  assert.equal(source.version, 3);
});

test("browser fixture descriptions cannot write non-fixture storage", () => {
  assert.throws(() => campaignFixturesFrom(() => localStorage.setItem("unrelated.preference", "value")), /Unexpected fixture key/);
});
