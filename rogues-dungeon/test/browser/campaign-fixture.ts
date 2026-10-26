import type { Page } from "@playwright/test";
import { runInNewContext } from "node:vm";
import type { Campaign } from "../../src/game/types.ts";
import { createCampaign, upgradeCampaignResources } from "../../src/systems/procedural/world-procedural-system.ts";
import { fixtureCompatibilityMarker } from "./fixture-storage.ts";

/** Build current campaigns before navigation, without exercising legacy-save migration. */
export function campaignFixturesFrom<T>(describe: (argument: T) => void, argument?: T) {
  const records: Record<string, Campaign> = {};
  const describeFixture = runInNewContext(`(${describe.toString()})`, {
    localStorage: { setItem(key: string, value: string) {
      if (!/^rogues-dungeon\.slot\.[123]$/.test(key)) throw new Error(`Unexpected fixture key ${key}`);
      const input = JSON.parse(value) as Campaign;
      const base = createCampaign(input.floor.seed, input.progression.difficulty, input.floor.level);
      const campaign: Campaign = {
        ...base, ...input, version: base.version, mode: input.mode ?? base.mode,
        generatorVersion: undefined, floors: undefined, levelStates: {}, floorProfiles: {},
        floor: { ...input.floor, generatorVersion: "browser-fixture", objectSets: input.floor.objectSets ?? [], decorations: input.floor.decorations ?? [], projectiles: [] },
        progression: { ...base.progression, ...input.progression, attributes: { ...base.progression.attributes, ...input.progression.attributes } },
        player: { ...base.player, ...input.player, pixel: input.player.pixel ?? { x: input.player.x * 32 + 16, y: input.player.y * 32 + 16 } },
        quest: input.quest ?? base.quest,
      };
      if (!campaign.floor.cells) campaign.floor.cells = campaign.floor.map!.map(row => row.map(tile => ({ walkable: tile === 0, role: tile === 0 ? "floor" : "wall" })));
      records[key] = upgradeCampaignResources(campaign);
    } },
  }) as (argument?: T) => void;
  describeFixture(argument);
  if (!Object.keys(records).length) throw new Error("Campaign fixture produced no saved slot");
  return records;
}

export async function installCampaignFixture<T>(page: Page, describe: (argument: T) => void, argument?: T) {
  const records = campaignFixturesFrom(describe, argument);
  await page.addInitScript(({ saved, marker }) => {
    localStorage.setItem(marker.name, marker.value);
    for (const [key, campaign] of Object.entries(saved)) localStorage.setItem(key, JSON.stringify(campaign));
  }, { saved: records, marker: fixtureCompatibilityMarker });
}

export async function readSavedCampaign(page: Page, slot: 1 | 2 | 3 = 1): Promise<Campaign> {
  return page.evaluate(async selectedSlot => {
    const modulePath = "/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts";
    const { readSlot } = await import(modulePath);
    const campaign = readSlot(localStorage, selectedSlot);
    if (!campaign) throw new Error("Missing browser fixture campaign");
    return campaign;
  }, slot);
}
