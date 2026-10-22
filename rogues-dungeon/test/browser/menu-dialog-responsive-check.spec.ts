import { expect, test, type Page } from "@playwright/test";

const base = "http://127.0.0.1:6081/blockchain-rogues-dungeon-game/?mute=1";

async function rect(page: Page, selector: string) {
  return page.locator(selector).boundingBox();
}

test("menu dialogs follow Start Game geometry and density across fitted sizes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base);
  await expect(page.getByRole("heading", { name: "Start Game", exact: true })).toBeVisible();

  const start = await rect(page, ".main-menu-window");
  expect(start).not.toBeNull();
  const savedLabel = page.locator(".main-menu-window__saved-game-list button > b").first();

  await page.locator(".main-menu-window__settings").click({ force: true });
  await page.waitForTimeout(200);
  const menuSettings = await rect(page, ".settings-window--menu");
  expect(menuSettings).not.toBeNull();
  expect(Math.abs(menuSettings!.x - start!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(menuSettings!.y - start!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(menuSettings!.width - start!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(menuSettings!.height - start!.height)).toBeLessThanOrEqual(1);
  const generousSavedSize = await savedLabel.evaluate((element) => getComputedStyle(element).fontSize);
  const generousSettingsSize = await page.locator(".main-menu-window__settings").evaluate((element) => getComputedStyle(element).fontSize);
  expect(generousSettingsSize).toBe(generousSavedSize);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator(".settings-window--menu")).toHaveCount(0);

  await page.setViewportSize({ width: 700, height: 500 });
  await expect(page.getByRole("heading", { name: "Start Game", exact: true })).toBeVisible();
  const compactStart = await rect(page, ".main-menu-window");
  const compactSavedSize = await savedLabel.evaluate((element) => getComputedStyle(element).fontSize);
  const compactFooterSize = await page.locator(".main-menu-window__settings").evaluate((element) => getComputedStyle(element).fontSize);
  expect(compactFooterSize).toBe(compactSavedSize);

  await page.locator(".main-menu-window__settings").click({ force: true });
  await page.waitForTimeout(200);
  const compactSettings = await rect(page, ".settings-window--menu");
  expect(compactSettings).not.toBeNull();
  expect(Math.abs(compactSettings!.x - compactStart!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(compactSettings!.y - compactStart!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(compactSettings!.width - compactStart!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(compactSettings!.height - compactStart!.height)).toBeLessThanOrEqual(1);
  const compactDialogActionSize = await page.locator(".settings-window--menu .settings-window__actions").evaluate((element) => getComputedStyle(element).fontSize);
  expect(compactDialogActionSize).toBe(compactSavedSize);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator(".settings-window--menu")).toHaveCount(0);

  await page.getByRole("button", { name: /Saved Game 1 New Game/ }).click();
  await page.waitForTimeout(200);
  await expect(page.getByRole("heading", { name: "Create Character", exact: true })).toBeVisible();
  const character = await rect(page, ".create-character-window");
  const liveStartForCharacter = await rect(page, ".main-menu-window");
  expect(character).not.toBeNull();
  expect(liveStartForCharacter).not.toBeNull();
  expect(Math.abs(character!.x - liveStartForCharacter!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(character!.y - liveStartForCharacter!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(character!.width - liveStartForCharacter!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(character!.height - liveStartForCharacter!.height)).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Roll", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.waitForTimeout(200);

  await expect(page.getByRole("heading", { name: "Create World", exact: true })).toBeVisible();
  const world = await rect(page, ".create-world-window");
  expect(world).not.toBeNull();
  expect(Math.abs(world!.x - liveStartForCharacter!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(world!.y - liveStartForCharacter!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(world!.width - liveStartForCharacter!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(world!.height - liveStartForCharacter!.height)).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Roll", exact: true }).click();
  await expect(page.locator(".create-world-window [data-renderer-ready='true']")).toBeVisible({ timeout: 30_000 });
  const preview = await page.locator(".create-world-window__preview canvas").boundingBox();
  expect(preview).not.toBeNull();
  expect(preview!.width).toBeGreaterThan(0);
  expect(preview!.height).toBeGreaterThan(0);
});
