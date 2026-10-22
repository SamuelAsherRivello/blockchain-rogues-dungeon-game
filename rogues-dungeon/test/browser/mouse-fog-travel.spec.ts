import { expect, test } from "@playwright/test";
import { createRunCampaign } from "../../src/systems/procedural/world-procedural-system.ts";
import { isCellDiscovered } from "../../src/systems/procedural/map-discovery-system.ts";
import { openSavedGame } from "./start-saved-game.ts";

for (const movementMode of ["grid-snap", "grid-tween", "gridless"]) {
  test(`mouse walks to a fogged dark tile in ${movementMode}`, async ({ page }) => {
    const campaign = createRunCampaign(17, 1, 1);
    const target = { x: campaign.player.x + 6, y: campaign.player.y };
    delete campaign.floor.map;
    campaign.floor.entities = []; campaign.floor.objectSets = []; campaign.floor.decorations = [];
    for (let y = campaign.player.y - 1; y <= campaign.player.y + 1; y++) {
      for (let x = campaign.player.x; x <= target.x; x++) campaign.floor.cells[y][x] = { walkable: true, role: "ground" };
    }
    expect(isCellDiscovered(campaign, target)).toBe(false);
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(({ campaign, movementMode }) => {
      localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(campaign));
      localStorage.setItem("rogues-dungeon.preferences.v1", JSON.stringify({ movementMode, camera: "center", zoom: 1 }));
    }, { campaign, movementMode });
    await page.goto("/blockchain-rogues-dungeon-game/?mute=1"); await openSavedGame(page);
    const world = page.locator(".world-view");
    await expect(world).toHaveAttribute("data-render-test-mode", "3");
    const bounds = (await world.boundingBox())!;
    const x = bounds.x + bounds.width / 2 + 6 * 32, y = bounds.y + bounds.height / 2;
    const reticle = world.locator(".world-view__grid-reticle");
    const dots = world.locator(".world-view__path-dot");
    for (const distance of [2, 6]) {
      await page.mouse.move(bounds.x + bounds.width / 2 + distance * 32, y);
      await expect(world).toHaveAttribute("data-cursor", "walk");
      await expect(world).toHaveCSS("cursor", /walk-boots\.png/);
      await expect(reticle).toHaveClass("world-view__grid-reticle world-view__grid-reticle--valid");
      await expect(reticle).toHaveCSS("color", "rgb(245, 241, 230)");
      await expect.poll(() => dots.count()).toBeGreaterThanOrEqual(distance);
      for (const dot of await dots.all()) await expect(dot).toHaveCSS("background-color", "rgb(245, 241, 230)");
      const lastDot = (await dots.last().boundingBox())!;
      expect(lastDot.x + lastDot.width / 2).toBeCloseTo(bounds.x + bounds.width / 2 + distance * 32, 0);
      expect(lastDot.y + lastDot.height / 2).toBeCloseTo(y, 0);
    }
    await page.screenshot({ path: `output/playwright/mouse-fog-presentation-${movementMode}.png` });
    await page.mouse.click(x, y);
    await expect(world).toHaveAttribute("data-player-x", String(target.x), { timeout: 15_000 });
    await expect(world).toHaveAttribute("data-player-y", String(target.y));
    expect(errors).toEqual([]);
  });
}
