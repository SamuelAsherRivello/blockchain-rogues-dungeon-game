import { expect, test } from "@playwright/test";
import { createCampaign } from "../../src/systems/procedural/world-procedural-system.ts";
import { installCampaignFixture, readSavedCampaign } from "./campaign-fixture.ts";
import { openSavedGame } from "./start-saved-game.ts";

test("@smoke renders a closed test chest left of the level-one entrance", async ({ page }) => {
  const campaign = createCampaign(1);
  campaign.floor.cells = Array.from({ length: 100 }, (_, y) => Array.from({ length: 100 }, (_, x) => ({ walkable: x >= 47 && x <= 52 && y >= 48 && y <= 52, role: "floor" })));
  delete campaign.floor.map;
  campaign.floor.start = { x: 50, y: 50 }; campaign.player.x = 50; campaign.player.y = 50;
  campaign.floor.entities = [{ id: "test-chest", kind: "chest", opened: false, x: 49, y: 50 }];
  campaign.floor.objectSets = []; campaign.floor.decorations = []; campaign.floor.prefabPlacements = [];
  await installCampaignFixture(page, saved => localStorage.setItem("rogues-dungeon.slot.3", JSON.stringify(saved)), campaign);
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page, 3);
  await expect(page.locator(".world-view canvas")).toBeVisible();
  await expect.poll(async () => (await readSavedCampaign(page, 3)).floor.entities.find(entity => entity.id === "test-chest")).toEqual({ id: "test-chest", kind: "chest", opened: false, x: 49, y: 50 });
  await expect.poll(async () => (await readSavedCampaign(page, 3)).floor.entities.filter(entity => entity.kind === "chest").length).toBe(1);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(async () => {
    const campaign = await readSavedCampaign(page, 3);
    const chest = campaign.floor.entities.find(entity => entity.kind === "chest" && entity.id === "test-chest");
    const coins = campaign?.floor.entities.filter((entity: { id: string; kind: string }) => entity.kind === "gold" && entity.id.startsWith("chest-gold-"));
    return { player: { x: campaign.player.x, y: campaign.player.y }, opened: chest?.kind === "chest" ? chest.opened : undefined, coins: coins?.length };
  }).toEqual({ player: { x: 50, y: 50 }, opened: true, coins: 3 });
  await page.locator(".world-view").screenshot({ path: "output/playwright/test-chest.png" });
});
