import { expect, test } from "@playwright/test";
import { installCampaignFixture } from "./campaign-fixture.ts";
import { openSavedGame } from "./start-saved-game.ts";

test("previews and commits a muted occupied weapon-slot swap", async ({ page }) => {
  await installCampaignFixture(page, () => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1)); map[50][50] = 0;
    const cells = map.map((row) => row.map((cell) => ({ walkable: cell === 0, role: cell === 0 ? "floor" : "wall" })));
    const resource = (current: number, currentMax: number) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.2", JSON.stringify({
      version: 6, world: "One", realm: "Underground 1", floor: { generatorVersion: "fixture", seed: 2, width: 100, height: 100, map, cells, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, attributePoints: 0 },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(8, 8), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [{ id: "sword", name: "Sword", group: "weapons", modifiers: { offense: 8 }, hitChance: 82, critChance: 16 }, null], armor: [null, null] }, inventory: [{ id: "dagger", name: "Dagger (Magic)", group: "weapons", modifiers: { offense: 3, mana: 2 }, hitChance: 94, critChance: 4 }], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false }, counters: { keys: 1, gold: 0 }, objective: "Find the exit", log: [],
    }));
  });
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page, 2);
  const dagger = page.getByRole("button", { name: "Drag Dagger (Magic)" });
  const sword = page.getByRole("button", { name: "Drag Sword" });
  const source = (await dagger.boundingBox())!;
  const target = (await sword.boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 });
  await expect(page.getByLabel("Equipment comparison")).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.2")!).player.equipment.weapons[0].name)).toBe("Sword");
  await page.mouse.up();
  await expect(page.getByLabel("Equipment comparison")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.2")!).player.equipment.weapons[0].name)).toBe("Dagger (Magic)");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.2")!).player.inventory.some((item: { name: string }) => item.name === "Sword"))).toBe(true);
});
