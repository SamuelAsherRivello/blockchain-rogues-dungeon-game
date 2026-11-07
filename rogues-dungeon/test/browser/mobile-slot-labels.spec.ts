import { expect, test } from "@playwright/test";
import { createCampaign } from "../../src/systems/procedural/world-procedural-system.ts";
import { installCampaignFixture } from "./campaign-fixture.ts";
import { openSavedGame } from "./start-saved-game.ts";

test("mobile displays two ability and quick slots without shortcut labels", async ({ page }) => {
  const campaign = createCampaign(9044);
  await installCampaignFixture(page, saved => localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(saved)), campaign);
  await page.setViewportSize({ width: 690, height: 320 });
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page);
  await expect(page.locator('.info-panel--primary [data-slot-type="ability"]')).toHaveCount(3);
  await expect(page.locator('.info-panel--primary .slot_item_number')).toHaveCount(3);
  await expect(page.locator('.info-panel--primary .slot_item_hotkey')).toHaveCount(2);
  await page.getByRole("button", { name: "L:D" }).click();
  const panel = page.locator(".mobile-information-panels");
  await expect(panel.locator('[data-slot-type="ability"]')).toHaveCount(2);
  await expect(panel.locator('[data-slot-type="quickslot"]')).toHaveCount(2);
  await expect(panel.locator('.slot_item_number, .slot_item_hotkey')).toHaveCount(0);
});
