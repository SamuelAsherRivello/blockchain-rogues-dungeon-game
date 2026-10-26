import { expect, test } from "@playwright/test";
import { createRunCampaign, GENERATOR_VERSION, isObjectSetDoorOpen } from "../../src/systems/procedural/world-procedural-system.ts";
import { installCampaignFixture, readSavedCampaign } from "./campaign-fixture.ts";
import { openSavedGame } from "./start-saved-game.ts";
import { sampleCanvasPixels } from "./canvas-pixel-sample.ts";

test("@smoke pushes a barrel onto its floor trigger in a muted Edge session", async ({ page }) => {
  await installCampaignFixture(page, (generatorVersion: string) => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1));
    for (const [x, y] of [[47, 50], [48, 50], [49, 50], [50, 50], [51, 50], [52, 50], [53, 50], [54, 50], [55, 50], [49, 51]] as const) map[y][x] = 0;
    const resource = (current: number, currentMax: number) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 6, world: "One", realm: "Underground 1",
      floor: {
        generatorVersion, seed: 1, width: 100, height: 100, map, start: { x: 47, y: 50 }, time: 0, level: 1,
        entities: [{ id: "depth-rat", kind: "enemy", name: "Rat", x: 49, y: 51, hp: 3, maxHp: 3, damage: 0, xp: 1, awareness: 0, actionCooldown: 9, nextActionAt: 9 }],
        objectSets: [{ id: "fixture", kind: "floor-trigger-door-barrel", barrel: { x: 48, y: 50 }, trigger: { x: 49, y: 50 }, door: { x: 54, y: 50 }, regionRole: "optional-reward" }],
      },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, attributePoints: 0 },
      player: { x: 47, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(8, 8), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [null, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false }, counters: { keys: 0, gold: 0 }, objective: "Find the exit", log: [],
    }));
  }, GENERATOR_VERSION);
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page);
  await expect(page.locator(".world-view")).toBeVisible();
  await expect(page.locator(".world-view canvas")).toHaveCount(1);
  await expect(page.getByText(/requires WebGPU/i)).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).player)).toMatchObject({ x: 47, y: 50 });
  await page.keyboard.press("ArrowRight");
  // This gate is an injected fixture, not a gate in the procedural base.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).levelStates["1"].objectSetOverrides.fixture.barrel)).toEqual({ x: 49, y: 50, hasMass: true });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).player)).toMatchObject({ x: 48, y: 50 });
  await expect.poll(async () => (await readSavedCampaign(page)).floor.entities.find(entity => entity.id === "depth-rat")).toMatchObject({ x: 49, y: 51 });
  await page.screenshot({ path: "output/playwright/render-depth-barrel.png" });
});

test("@smoke synchronizes generated puzzle pixels in both views and retains them after compact reload", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const campaign = createRunCampaign(17, 1, 1);
  const puzzle = campaign.floor.objectSets!.find(set => set.kind === "floor-trigger-door-barrel")!;
  expect(puzzle.trigger).toEqual({ x: puzzle.barrel.x + 1, y: puzzle.barrel.y });
  // Preserve the generated gate and terrain; isolate its interaction from enemy turns.
  campaign.floor.entities = campaign.floor.entities.filter(entity => entity.kind !== "enemy");
  campaign.player.x = puzzle.barrel.x - 1;
  campaign.player.y = puzzle.barrel.y;
  campaign.player.pixel = { x: campaign.player.x * 32 + 16, y: campaign.player.y * 32 + 16 };
  const firstCenter = { x: campaign.player.x, y: campaign.player.y };
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await page.evaluate(async saved => {
    const modulePath = "/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts";
    const { writeSlot } = await import(modulePath);
    writeSlot(localStorage, 1, saved);
    localStorage.setItem("rogues-dungeon.preferences.v1", JSON.stringify({ movementMode: "grid-snap", zoom: 1, camera: "screen", muteAll: true }));
    for (const key of ["item-test", "enemy-test", "leveltest", "map-test", "zoom-test", "game-view-shader"]) localStorage.setItem(`rogues-dungeon.dev.${key}`, "0");
  }, campaign);
  const enter = async () => {
    await page.reload();
    await openSavedGame(page);
    await expect(page.locator('.minimap-view[data-renderer-ready="true"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "P: 0", exact: true })).toBeVisible();
    // Compare puzzle artwork independently of player-position/heading light.
    // The RT3 doorway and fog composition have their own browser cases.
    await page.getByRole("button", { name: "RT:3", exact: true }).click();
    await expect(page.locator(".world-view")).toHaveAttribute("data-render-test-mode", "0");
  };
  const state = async () => {
    const saved = await readSavedCampaign(page);
    const set = saved.floor.objectSets!.find(entry => entry.id === puzzle.id);
    if (!set || set.kind !== "floor-trigger-door-barrel") throw new Error("Generated puzzle was not restored");
    return { time: saved.floor.time, player: { x: saved.player.x, y: saved.player.y }, barrel: set.barrel, open: isObjectSetDoorOpen(set, saved.player, saved.floor.entities) };
  };
  const capture = async (label: string, center: { x: number; y: number }) => {
    const box = (await page.locator(".world-view canvas").boundingBox())!;
    const doorX = box.x + box.width / 2 + (puzzle.door.x - center.x) * 32;
    const doorY = box.y + box.height / 2 + (puzzle.door.y - center.y) * 32;
    const door = await sampleCanvasPixels(page, await page.screenshot({ clip: { x: Math.floor(doorX - 16), y: Math.floor(doorY - 16), width: 32, height: 32 } }));
    const minimap = await sampleCanvasPixels(page, await page.locator(".minimap-view canvas").screenshot());
    await page.screenshot({ path: testInfo.outputPath(`${label}.png`) });
    return { door, minimap };
  };
  await enter();
  const initial = await state();
  expect(initial.open).toBe(false);
  const closed = await capture("closed", firstCenter);
  expect(closed.minimap.inactivePuzzlePixels).toBeGreaterThan(0);
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => (await state()).barrel.x).toBe(puzzle.trigger.x);
  await expect.poll(async () => (await capture("open", firstCenter)).minimap.activePuzzlePixels).toBeGreaterThan(closed.minimap.activePuzzlePixels);
  const opened = await capture("open", firstCenter);
  const openState = await state();
  expect(openState.open).toBe(true);
  expect(openState.time).toBe(initial.time + 1);
  expect(opened.door.hash).not.toBe(closed.door.hash);
  expect(opened.minimap.hash).not.toBe(closed.minimap.hash);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.cells.length)).toBe(0);
  await enter();
  const restored = await state();
  expect(restored).toEqual(openState);
  const reloaded = await capture("reloaded", restored.player);
  expect(reloaded.door.hash).toBe(opened.door.hash);
  expect(reloaded.minimap.activePuzzlePixels).toBe(opened.minimap.activePuzzlePixels);
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => (await state()).barrel.x).toBe(puzzle.trigger.x + 1);
  expect((await state()).open).toBe(true);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(async () => (await state()).open).toBe(false);
  await expect.poll(async () => (await capture("released", restored.player)).minimap.activePuzzlePixels).toBe(closed.minimap.activePuzzlePixels);
  const released = await capture("released", restored.player);
  expect(released.door.hash).toBe(closed.door.hash);
  expect((await state()).time).toBe(initial.time + 3);
  expect(errors).toEqual([]);
});
