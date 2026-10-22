import { expect, type Page } from "@playwright/test";

export async function selectSavedGame(page: Page, slot: 1 | 2 | 3 = 1) {
  await page.getByRole("button", { name: new RegExp(`Saved Game ${slot}`) }).click();
  const mode = page.getByRole("dialog", { name: "Create Game", exact: true });
  const character = page.getByRole("dialog", { name: "Create Character", exact: true });
  await expect.poll(async () => await mode.isVisible() || await character.isVisible() || await page.locator(".game-screen").isVisible()).toBe(true);
  if (await mode.isVisible()) {
    await mode.getByRole("radio", { name: /Adventure/ }).click();
    await mode.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(character).toBeVisible();
  }
}

export async function openSavedGame(page: Page, slot: 1 | 2 | 3 = 1) {
  await selectSavedGame(page, slot);
  const roll = page.getByRole("button", { name: "Roll", exact: true });
  if (await roll.isVisible()) {
    await roll.click();
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await page.getByRole('heading', { name: 'Create World', exact: true }).waitFor();
    await roll.click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  }
  await expect(page.locator(".game-screen")).toBeVisible();
  await expect(page.locator('.world-view[data-renderer-ready="true"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Preparing the crypt...", { exact: true })).toHaveCount(0);
  await expect(page.locator(".world-view .ui_iris_transition")).toHaveCount(0, { timeout: 15_000 });
  const frameMeter = page.locator(".dev_settings output");
  if (await frameMeter.count()) await expect(frameMeter).toHaveText(/FPS: [0-9]/, { timeout: 15_000 });
}
