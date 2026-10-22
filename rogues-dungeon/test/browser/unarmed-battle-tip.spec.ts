import { expect, test } from "@playwright/test";
import { installCampaignFixture } from "./campaign-fixture.ts";
import { openSavedGame } from "./start-saved-game.ts";

test("shows the unarmed Battle Mode Tip after entry and dismisses it for the battle when closed or moved", async ({ page }) => {
  await installCampaignFixture(page, () => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1));
    for (let y = 48; y <= 52; y++) for (let x = 48; x <= 52; x++) map[y][x] = 0;
    const cells = map.map((row) => row.map((tile) => ({ walkable: tile === 0, role: tile === 0 ? "floor" : "wall" })));
    const resource = (current: number, currentMax: number) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.2", JSON.stringify({
      version: 6, world: "One", realm: "Underground 1", floor: { generatorVersion: "fixture", seed: 2, width: 100, height: 100, map, cells, start: { x: 50, y: 50 }, time: 1, level: 1, entities: [{ id: "unarmed-enemy", kind: "enemy", x: 51, y: 50, hasMass: true, hp: 10, maxHp: 10, damage: 1, awareness: 4, actionCooldown: 1, nextActionAt: 2, name: "Rat", character: "rat", graphic: "rat", idle: "idle", attackKind: "melee", attackRange: 1, xp: 1, generation: 1, heading: "w", ai: { state: "idle", targetId: null } }] },
      progression: { attributes: { health: 30, stamina: 16, offense: 1, defense: 1, mana: 12, perception: 1, strength: 1, luck: 1, recovery: 1, stealth: 1 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, attributePoints: 0 },
      player: { x: 50, y: 50, hasMass: true, heading: "e", resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(1, 1), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [null, null], armor: [null, null] }, inventory: [{ id: "sword", name: "Sword", group: "weapons", modifiers: { offense: 3 } }], inventoryCapacity: 5, abilities: [null, null, null], quickSlots: [null, null], sneaking: false, encumberedDirection: null }, counters: { keys: 0, gold: 0 }, objective: "Find the exit", log: [],
    }));
  });
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page, 2);
  await expect(page.getByLabel("Game view, Battle mode")).toBeVisible();
  await expect(page.locator('.world-view[data-renderer-ready="true"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Assign a weapon to attack.", { exact: true })).toBeVisible({ timeout: 6_000 });
  await expect(page.getByText("Battle Mode", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tip" })).toBeVisible();
  await expect(page.getByText("(walk to cancel)", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close (walk to cancel)" }).click();
  await expect(page.getByText("Assign a weapon to attack.", { exact: true })).toBeHidden();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".world-view")).toHaveAttribute("data-player-x", "49");
  await expect(page.getByLabel("Game view, Battle mode")).toBeVisible();
  await page.waitForTimeout(3_500);
  await expect(page.getByText("Assign a weapon to attack.", { exact: true })).toBeHidden();

  await page.reload();
  await openSavedGame(page, 2);
  await expect(page.getByText("Assign a weapon to attack.", { exact: true })).toBeVisible({ timeout: 6_000 });
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".world-view")).toHaveAttribute("data-player-x", "49");
  await expect(page.getByLabel("Game view, Battle mode")).toBeVisible();
  await expect(page.getByText("Assign a weapon to attack.", { exact: true })).toBeHidden();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator(".world-view")).toHaveAttribute("data-player-y", "49");
  await page.waitForTimeout(3_500);
  await expect(page.getByText("Assign a weapon to attack.", { exact: true })).toBeHidden();

  await page.reload();
  await openSavedGame(page, 2);
  await expect(page.getByText("Assign a weapon to attack.", { exact: true })).toBeVisible({ timeout: 6_000 });
  // There is no affirmation direction, including a bump toward an enemy.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".world-view")).toHaveAttribute("data-player-x", "50");
  await expect(page.getByText("Assign a weapon to attack.", { exact: true })).toBeHidden();

  await page.reload();
  await openSavedGame(page, 2);
  await expect(page.getByText("Assign a weapon to attack.", { exact: true })).toBeVisible({ timeout: 6_000 });
  await page.getByRole("button", { name: "Drag Sword" }).dragTo(page.getByRole("button", { name: "Empty equipment slot" }).first());
  await expect(page.getByText("Assign a weapon to attack.", { exact: true })).toBeHidden();
});
