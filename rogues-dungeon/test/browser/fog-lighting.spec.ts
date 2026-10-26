import { expect, test, type Page } from "@playwright/test";
import { createRunCampaign } from "../../src/systems/procedural/world-procedural-system.ts";
import { isCellDiscovered, revealDiscovery } from "../../src/systems/procedural/map-discovery-system.ts";
import { WorldRender } from "../../src/systems/rendering/world-render-system.ts";
import { openSavedGame } from "./start-saved-game.ts";

async function mode(page: Page, target: number) {
  const world = page.locator(".world-view");
  await expect(world).toHaveAttribute("data-render-test-mode", /^[0-3]$/);
  while (Number(await world.getAttribute("data-render-test-mode")) !== target) {
    const current = Number(await world.getAttribute("data-render-test-mode"));
    await page.getByRole("button", { name: `RT:${current}`, exact: true }).click();
    await expect(world).toHaveAttribute("data-render-test-mode", String((current + 1) % 4));
  }
}

test("@smoke fog permission conceals wall quarters after RT cycling and leaves saved knowledge unchanged", async ({ page }) => {
  const campaign = createRunCampaign(17, 1, 1, 1, 1, { level1TestMode: true });
  const wall = WorldRender.Render({ cells: campaign.floor.cells, entities: campaign.floor.entities, player: campaign.player }).walls.find(entry => entry.quarters?.length)!;
  expect(wall).toBeDefined();
  const observer = { x: wall.x - 6, y: wall.y };
  expect(campaign.floor.cells[observer.y][observer.x].walkable).toBe(true);
  campaign.player = { ...campaign.player, ...observer, pixel: { x: observer.x * 32 + 16, y: observer.y * 32 + 16 } };
  campaign.floor.entities = []; campaign.floor.objectSets = []; campaign.floor.decorations = [];
  campaign.discovery = {}; revealDiscovery(campaign, observer);
  expect(isCellDiscovered(campaign, wall)).toBe(false);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(saved => localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(saved)), campaign);
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1"); await openSavedGame(page);
  const before = await page.evaluate(() => localStorage.getItem("rogues-dungeon.slot.1"));
  for (const rt of [3, 0, 1, 2, 3]) {
    await mode(page, rt);
    const sample = async () => {
      const png = await page.locator(".world-view canvas").screenshot();
      return page.evaluate(async ({ base64, dx, dy }) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height), context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      const x = Math.floor(bitmap.width / 2 + dx * 32 - 16), y = Math.floor(bitmap.height / 2 + dy * 32 - 16);
      const rgba = context.getImageData(x, y, 32, 32).data;
      let litPixels = 0;
      for (let i = 0; i < rgba.length; i += 4) if (Math.max(rgba[i], rgba[i + 1], rgba[i + 2]) > 5) litPixels++;
      bitmap.close(); return litPixels;
      }, { base64: png.toString("base64"), dx: wall.x - observer.x, dy: wall.y - observer.y });
    };
    if (rt & 1) await expect.poll(sample).toBe(0);
    else await expect.poll(sample).toBeGreaterThan(0);
  }
  expect(await page.evaluate(() => localStorage.getItem("rogues-dungeon.slot.1"))).toBe(before);
  await page.reload(); await openSavedGame(page);
  await expect(page.locator(".world-view")).toHaveAttribute("data-render-test-mode", "3");
  expect(errors).toEqual([]);
});

test("Render Test remains session state through Perf regeneration and PC portrait preview", async ({ page }) => {
  const campaign = createRunCampaign(17, 1, 1);
  await page.addInitScript(saved => localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(saved)), campaign);
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1"); await openSavedGame(page);
  await mode(page, 0);
  await page.getByRole("button", { name: "P: 0", exact: true }).click();
  await expect(page.locator(".performance-controls")).toBeVisible();
  await expect(page.locator(".world-view")).toHaveAttribute("data-world-alive", "true");
  await expect(page.locator(".world-view")).toHaveAttribute("data-render-test-mode", "0");
  await page.getByRole("button", { name: "Restart route", exact: true }).click();
  await expect(page.locator(".world-view")).toHaveAttribute("data-render-test-mode", "0");
  await page.getByRole("button", { name: "Exit Perf", exact: true }).click();
  await expect(page.locator(".world-view")).toHaveAttribute("data-render-test-mode", "0");
  await page.getByRole("button", { name: "AR: L", exact: true }).click();
  await expect(page.getByRole("button", { name: "RT:0", exact: true })).toBeVisible();
  await mode(page, 3);
  await expect(page.getByRole("button", { name: "RT:3", exact: true })).toBeVisible();
});

test("tactical attenuation leaves unknown cells black", async ({ page }) => {
  const campaign = createRunCampaign(17, 1, 1);
  const enemy = campaign.floor.entities.find(entity => entity.kind === "enemy")!;
  enemy.x = campaign.player.x + 1; enemy.y = campaign.player.y;
  campaign.floor.entities = campaign.floor.entities.filter(entity => entity.kind !== "enemy" || entity.id === enemy.id);
  campaign.progression.attributes.perception = 10;
  expect(isCellDiscovered(campaign, { x: 59, y: 53 })).toBe(false);
  await page.addInitScript(saved => localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(saved)), campaign);
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1"); await openSavedGame(page);
  await expect(page.locator('.battle-indicator[data-phase="settled"]')).toBeVisible();
  const png = await page.locator(".world-view").screenshot();
  const pixel = await page.evaluate(async base64 => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height), context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const rgba = [...context.getImageData(Math.floor(bitmap.width / 2 + 9 * 32), Math.floor(bitmap.height / 2 + 3 * 32), 1, 1).data];
    bitmap.close(); return rgba;
  }, png.toString("base64"));
  expect(pixel.slice(0, 3)).toEqual([0, 0, 0]);
});
