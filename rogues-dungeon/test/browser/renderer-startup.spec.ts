import { expect, test } from "@playwright/test";
import { openSavedGame } from "./start-saved-game.ts";
import { createCampaign } from "../../src/systems/procedural/world-procedural-system.ts";
import { sampleCanvasPixels } from "./canvas-pixel-sample.ts";

test("@smoke keeps the dungeon and minimap rendering after the first moves", async ({ page }) => {
  const campaign = createCampaign(12345);
  const errors: string[] = [];
  let engineStarts = 0;
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
    if (/Babylon Lite .*WebGPU engine/.test(message.text())) engineStarts++;
  });
  await page.addInitScript(saved => localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(saved)), campaign);
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page);
  const assertWorldVisible = async () => {
    for (const selector of [".world-view canvas", ".minimap-view canvas"]) {
      const png = await page.locator(selector).screenshot();
      const pixels = await sampleCanvasPixels(page, png);
      const minimum = selector === ".world-view canvas" ? pixels.width * pixels.height * .05 : 100;
      expect(pixels.nonBlackPixels, `${selector} must contain rendered world pixels`).toBeGreaterThan(minimum);
    }
  };
  await assertWorldVisible();
  const startsBeforeMovement = engineStarts;
  const { x, y } = campaign.player;
  const directions = [{ key: "ArrowRight", dx: 1, dy: 0 }, { key: "ArrowDown", dx: 0, dy: 1 }, { key: "ArrowLeft", dx: -1, dy: 0 }, { key: "ArrowUp", dx: 0, dy: -1 }] as const;
  const step = directions.find(({ dx, dy }) => campaign.floor.cells[y + dy]?.[x + dx]?.walkable && !campaign.floor.entities.some(entity => entity.x === x + dx && entity.y === y + dy));
  expect(step).toBeDefined();
  await page.keyboard.press(step!.key);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time)).toBeGreaterThan(campaign.floor.time);
  // Sample after the movement tween and any erroneous asynchronous scene rebuild.
  await page.waitForTimeout(1000);
  await assertWorldVisible();
  await page.keyboard.press(({ ArrowRight: "ArrowLeft", ArrowLeft: "ArrowRight", ArrowDown: "ArrowUp", ArrowUp: "ArrowDown" })[step!.key]!);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).player.x)).toBe(x);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).player.y)).toBe(y);
  await page.waitForTimeout(1000);
  await assertWorldVisible();
  await test.info().attach("dungeon-after-movement", { body: await page.screenshot(), contentType: "image/png" });
  expect(engineStarts).toBe(startsBeforeMovement);
  expect(errors).toEqual([]);
});

test("@smoke renders the dungeon after loading every world texture", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page);
  await expect(page.locator(".game-screen")).toBeVisible();
  await expect(page.getByText("Preparing the crypt...")).toBeHidden({ timeout: 30_000 });
  await expect(page.locator(".world-view canvas").first()).toBeVisible();
  expect(errors).toEqual([]);
});
