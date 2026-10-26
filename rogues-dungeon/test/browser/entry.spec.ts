import { GENERATOR_VERSION } from '../../src/systems/procedural/world-procedural-system.ts';
import { expect, test } from "@playwright/test";
import { fixtureCompatibilityMarker } from "./fixture-storage.ts";
import path from "node:path";
import { openSavedGame } from "./start-saved-game.ts";
import { installCampaignFixture, readSavedCampaign } from "./campaign-fixture.ts";
import { buildManualTileScenario } from "../../src/systems/procedural/manual-tile-scenarios.ts";
import { buildDungeonWangWalls } from "../../src/systems/rendering/tile-map-system.ts";
import { sampleCanvasPixels } from "./canvas-pixel-sample.ts";

test("@smoke opens the muted saved-game entry screen", async ({ page }) => {
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");

  await expect(page).toHaveURL(/\/blockchain-rogues-dungeon-game\/\?mute=1$/);
  await expect(page.getByRole("heading", { name: "Rogue's Dungeon" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Start Game" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Saved Game [1-3]/ })).toHaveCount(3);
});

test("waits for menu art before showing the main menu", async ({ page }) => {
  let releaseArt!: () => void;
  const artGate = new Promise<void>(resolve => { releaseArt = resolve; });
  await page.route("**/dungeon-hero.png", async (route) => {
    await artGate;
    await route.continue();
  });
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Start Game" })).toBeHidden();
  await expect(page.getByText("Loading Rogue's Dungeon...")).toBeVisible();
  releaseArt();
  await expect(page.getByRole("heading", { name: "Start Game" })).toBeVisible();
});

test("@smoke shows My First Quest in a new muted Saved Game", async ({ page }) => {
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page);
  for (const selector of [".world-view canvas", ".minimap-view canvas"]) {
    await expect.poll(async () => {
      const pixels = await sampleCanvasPixels(page, await page.locator(selector).screenshot());
      return pixels.nonBlackPixels;
    }, { message: `${selector} must render after the Create World preview unmounts` }).toBeGreaterThan(selector === ".minimap-view canvas" ? 0 : 100);
  }
  const information = page.locator(".information-panels");
  await expect(information.getByText("My First Quest", { exact: true })).toBeVisible();
  await expect(information.getByText("Walk through the stairs", { exact: true })).toBeVisible();
  await expect(information.getByText("Collect a Health Potion", { exact: true })).toBeVisible();
  await expect(information.getByText("Collect a coin", { exact: true })).toBeVisible();
});

test("title Save & Exit confirmation is centered over the game and returns to the menu", async ({ page }) => {
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page);
  await page.getByRole("button", { name: "Rogue's Dungeon" }).click();
  const dialog = page.getByRole("dialog", { name: "Are you sure?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Save your progress and exit.");
  const centered = await page.evaluate(() => {
    const view = document.querySelector(".world-view-region")!.getBoundingClientRect();
    const confirmation = document.querySelector(".confirmation-dialog")!.getBoundingClientRect();
    return { x: Math.abs((confirmation.x + confirmation.width / 2) - (view.x + view.width / 2)), y: Math.abs((confirmation.y + confirmation.height / 2) - (view.y + view.height / 2)) };
  });
  expect(centered.x).toBeLessThan(1);
  expect(centered.y).toBeLessThan(1);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".settings-window")).toBeHidden();
  await page.getByRole("button", { name: "Rogue's Dungeon" }).click();
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("heading", { name: "Start Game" })).toBeVisible();
});

test("new muted runs begin with an empty loadout and five inventory positions", async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page, 1);
  await expect(page.getByRole("heading", { name: "INVENTORY 00/05" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Empty equipment slot" })).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Empty ability slot" })).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Empty quick slot" })).toHaveCount(2);
});

test("@smoke clears local storage from the main menu", async ({ page }) => {
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await page.evaluate(() => {
    localStorage.setItem("rogues-dungeon.slot.1", "saved-game");
    localStorage.setItem("rogues-dungeon.preferences.v1", "preferences");
    localStorage.setItem("unrelated.preference", "keep-me");
  });
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Clear Local Storage" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("heading", { name: "Start Game" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({ ...localStorage }))).toEqual({ [fixtureCompatibilityMarker.name]: fixtureCompatibilityMarker.value });
});

test("@smoke keeps settings on the menu frame or centered over the live game view", async ({ page }) => {
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await expect(page.locator(".main-menu-window")).toBeVisible();
  const menuPlacement = await page.evaluate(() => {
    const panel = document.querySelector(".main-menu-window")!.getBoundingClientRect();
    return { panel };
  });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator(".settings-window")).toHaveCSS("scale", "1");
  const menuDialog = await page.evaluate(() => {
    const dialog = document.querySelector(".settings-window")!.getBoundingClientRect();
    return { x: dialog.x, y: dialog.y, width: dialog.width, height: dialog.height, background: getComputedStyle(document.querySelector(".settings-window")!).backgroundColor };
  });
  expect(Math.abs(menuDialog.x - menuPlacement.panel.x)).toBeLessThan(1);
  expect(Math.abs(menuDialog.y - menuPlacement.panel.y)).toBeLessThan(1);
  expect(Math.abs(menuDialog.width - menuPlacement.panel.width)).toBeLessThan(1);
  expect(Math.abs(menuDialog.height - menuPlacement.panel.height)).toBeLessThan(1);
  expect(menuDialog.background).not.toBe("rgb(16, 14, 23)");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await openSavedGame(page);
  await expect(page.locator(".game-screen")).toBeVisible();
  await expect(page.locator(".world-view")).toBeVisible();
  await expect(page.locator(".minimap-view")).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator(".settings-window")).toHaveCSS("scale", "1");
  const gamePlacement = await page.evaluate(() => {
    const view = document.querySelector(".world-view-region")!.getBoundingClientRect();
    const dialog = document.querySelector(".settings-window")!.getBoundingClientRect();
    return { view, dialog };
  });
  expect(gamePlacement.dialog.width).toBeGreaterThan(0);
  expect(gamePlacement.dialog.height).toBeGreaterThan(0);
  expect(gamePlacement.dialog.width).toBeLessThanOrEqual(gamePlacement.view.width);
  expect(gamePlacement.dialog.height).toBeLessThanOrEqual(gamePlacement.view.height);
  expect(Math.abs((gamePlacement.dialog.x + gamePlacement.dialog.width / 2) - (gamePlacement.view.x + gamePlacement.view.width / 2))).toBeLessThan(1);
  expect(Math.abs((gamePlacement.dialog.y + gamePlacement.dialog.height / 2) - (gamePlacement.view.y + gamePlacement.view.height / 2))).toBeLessThan(1);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator(".settings-window")).toHaveCount(0);
});

test("@smoke opens How To Play above Settings and returns without advancing time", async ({ page }) => {
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page);
  await expect(page.locator(".game-screen")).toBeVisible();
  await page.keyboard.press("x");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("rogues-dungeon.slot.1"))).not.toBeNull();
  const time = await page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "How To Play", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "How To Play" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  const help = page.getByRole("dialog", { name: "How To Play", exact: true });
  await help.getByRole("button", { name: "1. The Basics", exact: true }).click();
  await help.getByRole("option", { name: "3. Combat", exact: true }).click();
  await expect(help.getByRole("region", { name: "Combat", exact: true })).toContainText("Move toward an adjacent enemy to attack with your equipped weapons.");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "How To Play" })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time)).toBe(time);
});

test("@smoke opens the named manual tile scenario and exports its editable map", async ({ page }) => {
  test.setTimeout(60_000);
  const scenario = buildManualTileScenario("corridor-joins", 13579, 1)!;
  const expectedWalls = buildDungeonWangWalls({ cells: scenario.cells }).walls.map(({ x, y, frame, quarters }) => ({ x, y, frame, quarters }));
  await page.goto("/blockchain-rogues-dungeon-game/?world=1&level=1&slot=1&seed=13579&mute=1&debug-fix-map-autotiled=1&scenario=corridor-joins");
  await expect(page.getByRole("button", { name: "Open Editable Copy" })).toBeVisible();
  const world = page.locator(".world-view");
  await expect(world).toHaveAttribute("data-renderer-ready", "true", { timeout: 30_000 });
  const renderedWalls = async () => JSON.parse((await world.getAttribute("data-wang-cells"))!).map(({ x, y, frame, quarters }: { x: number; y: number; frame: number; quarters?: unknown }) => ({ x, y, frame, quarters }));
  await expect.poll(renderedWalls).toEqual(expectedWalls);
  await expect(page.locator(".dev_settings output")).toHaveText(/FPS: [0-9]/, { timeout: 15_000 });
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time);
  await page.keyboard.press("x");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time)).toBe(before + 1);
  await expect.poll(renderedWalls).toEqual(expectedWalls);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Open Editable Copy" }).click();
  expect((await download).suggestedFilename()).toMatch(/rogues-dungeon-world-One-level-1-seed-13579\.zip/);
  await page.reload();
  await openSavedGame(page);
  await expect(world).toHaveAttribute("data-renderer-ready", "true", { timeout: 30_000 });
  await expect.poll(renderedWalls).toEqual(expectedWalls);
});

test("@smoke Tab clears pointer focus without navigating in the menu, game, or settings", async ({ page }) => {
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await expect(page.locator(".main-menu-window")).toBeVisible();
  const assertTabDoesNothing = async () => {
    for (const key of ["Tab", "Tab", "Shift+Tab"]) {
      await page.keyboard.press(key);
      expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    }
    expect(await page.locator("button, input, select, a[href], canvas").evaluateAll((elements) => elements.every((element) => (element as HTMLElement).tabIndex === -1))).toBe(true);
    expect(await page.locator(".world-view, .world-view *").evaluateAll((elements) => elements.every((element) => (element as HTMLElement).tabIndex === -1))).toBe(true);
  };
  await assertTabDoesNothing();
  await page.evaluate(() => {
    const lateControl = document.createElement("button");
    lateControl.textContent = "Late control";
    document.body.append(lateControl);
  });
  await expect.poll(() => page.getByRole("button", { name: "Late control" }).evaluate((element) => element.tabIndex)).toBe(-1);
  await openSavedGame(page);
  await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeVisible();
  await assertTabDoesNothing();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await assertTabDoesNothing();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Settings" })).toHaveCount(0);
});

test("@smoke expands the keyboard tray and shows input feedback", async ({ page }) => {
  await installCampaignFixture(page, (generatorVersion: string) => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1)); map[50][50] = 0; map[50][51] = 0;
    const resource = (current: number, currentMax: number) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 6, world: "One", realm: "Underground 1",
      floor: { generatorVersion, seed: 1, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, attributePoints: 0 },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(8, 8), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [{ id: "starter-stick", name: "Wooden Stick", group: "weapons", modifiers: { offense: 8 } }, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false },
      counters: { keys: 1, gold: 0 }, objective: "Find the exit", log: [],
    }));
  }, GENERATOR_VERSION);
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page);
  await expect(page.locator(".controls-area")).toBeVisible();
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".keyboard_tray_panel")).toHaveCSS("opacity", "0");
  await expect(page.locator(".keyboard_collapsed_summary")).toContainText("Move");
  const regionBox = (await page.locator(".keyboard_controls_region").boundingBox())!;
  const surface = page.locator(".controls-area_surface");
  const surfaceBox = (await surface.boundingBox())!;
  const collapsedTransform = await surface.evaluate(element => getComputedStyle(element).transform);
  const collapsedTab = page.locator(".keyboard_controls_region .tab-control");
  const collapsedTabBox = (await collapsedTab.boundingBox())!;
  expect(Math.abs((collapsedTabBox.x + collapsedTabBox.width / 2) - (surfaceBox.x + surfaceBox.width / 2))).toBeLessThan(2);
  expect(Math.abs((collapsedTabBox.y + collapsedTabBox.height) - regionBox.y)).toBeLessThan(2);
  expect(collapsedTabBox.width).toBeLessThan(70);
  const collapsedKeyBox = (await page.getByLabel("Keyboard key W", { exact: true }).first().boundingBox())!;
  await collapsedTab.click();
  await page.waitForTimeout(300);
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "false");
  const expandedTab = page.locator(".keyboard_controls_region .tab-control");
  const expandedTabBox = (await expandedTab.boundingBox())!;
  const expandedPanelBox = (await page.locator(".keyboard_tray_panel").boundingBox())!;
  expect(Math.abs(expandedTabBox.height - collapsedTabBox.height)).toBeLessThan(1);
  expect(Math.abs((expandedTabBox.y + expandedTabBox.height) - expandedPanelBox.y)).toBeLessThanOrEqual(2);
  await expect(page.locator(".input-key")).toHaveCount(24);
  await expect(page.locator(".keyboard_tray_key")).toHaveCount(12);
  await expect(page.locator(".keyboard_collapsed_controls .input-key").first()).toHaveAttribute("data-input-mode", "display");
  await expect(page.locator(".keyboard_tray_key").first()).toHaveAttribute("data-input-mode", "feedback");
  const beforeAbility = await page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time);
  await page.keyboard.down("1");
  try {
    await expect(page.locator(".keyboard_tray_key", { hasText: "1" })).toHaveClass(/input-key--pressed/);
  } finally {
    await page.keyboard.up("1");
  }
  await expect(page.locator(".keyboard_tray_key", { hasText: "1" })).not.toHaveClass(/input-key--pressed/);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time)).toBe(beforeAbility + 1);
  const beforeWait = await page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time);
  await page.keyboard.press("x");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time)).toBe(beforeWait + 1);
  const expandedKeyBox = (await page.locator(".keyboard_tray_key", { hasText: "W" }).boundingBox())!;
  expect(Math.abs(expandedKeyBox.width - collapsedKeyBox.width)).toBeLessThan(1);
  expect(Math.abs(expandedKeyBox.height - collapsedKeyBox.height)).toBeLessThan(1);
  await page.mouse.move(0, 0);
  await expect(page.locator(".keyboard_tray_title")).toHaveText("Controls");
  await expect(page.locator(".keyboard_tray_title")).toBeVisible();
  const titleBox = (await page.locator(".keyboard_tray_title").boundingBox())!;
  expect(Math.abs((titleBox.y + titleBox.height / 2) - (regionBox.y + regionBox.height / 2))).toBeLessThan(2);
  await expandedTab.hover({ force: true });
  await expect(page.locator(".keyboard_tray_title")).toHaveText("Controls");
  await expect(page.locator(".keyboard_tray_label")).toHaveCount(0);
  await page.locator(".keyboard_tray_key", { hasText: "1" }).hover({ force: true });
  await expect(page.locator(".keyboard_tray_title")).toHaveText("Use ability 1");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.locator(".keyboard_tray_key", { hasText: "Q" }).hover({ force: true });
  await expect(page.locator(".keyboard_tray_title")).toHaveText("Use Quickslot 1");
  await page.locator(".keyboard_tray_key", { hasText: "W" }).hover({ force: true });
  await expect(page.locator(".keyboard_tray_title")).toHaveText("Move Up");
  await expect(surface).not.toHaveCSS("transform", collapsedTransform);
  await expect(page.locator(".keyboard_tray_panel")).toHaveCSS("transition-duration", "0.25s");
  const beforeEmptyQuickSlot = await page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time);
  await page.locator(".keyboard_tray_key", { hasText: "Q" }).click({ force: true });
  await page.keyboard.press("q");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time)).toBe(beforeEmptyQuickSlot);
  await expandedTab.click();
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".keyboard_tray_panel")).toHaveCSS("opacity", "0");
  await collapsedTab.click();
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator(".keyboard_tray_title")).toHaveCSS("pointer-events", "auto");
  await expect.poll(() => surface.evaluate(element => Math.abs(new DOMMatrix(getComputedStyle(element).transform).m42 + element.getBoundingClientRect().height))).toBeLessThan(.1);
  await page.locator(".keyboard_tray_title").click();
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
  await page.locator(".keyboard_collapsed_controls .input-key").filter({ hasText: "Z" }).click({ force: true });
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "false");
  await page.locator(".keyboard_tray_key").filter({ hasText: "Z" }).click({ force: true });
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
  await page.keyboard.press("z");
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "false");
  await page.keyboard.press("z");
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
});

test("@smoke exposes only ability positions 1–3 and ignores key 4", async ({ page }) => {
  await installCampaignFixture(page, (generatorVersion: string) => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1)); map[50][50] = 0;
    const resource = (current: number, currentMax: number) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 6, world: "One", realm: "Underground 1",
      floor: { generatorVersion, seed: 1, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, attributePoints: 0 },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(8, 8), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [null, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null, "heal"], sneaking: false },
      counters: { keys: 1, gold: 0 }, objective: "Find the exit", log: [],
    }));
  }, GENERATOR_VERSION);
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page);
  const abilityRows = page.locator(".information-panels .info-panel--primary .slot_item--ability");
  await expect(abilityRows).toHaveCount(3);
  await expect(abilityRows).toHaveText([/\[1\]/, /\[2\]/, /\[3\]/]);
  await expect(page.locator(".information-panels .info-panel--primary")).not.toContainText("[04]");
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time);
  await page.keyboard.press("4");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time)).toBe(before);
  await expect.poll(async () => (await readSavedCampaign(page)).player.abilities).toEqual(["heal", "wand", null]);
});

test("@smoke displays the non-blocking Attribute Points callout", async ({ page }) => {
  await installCampaignFixture(page, (generatorVersion: string) => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1)); map[50][50] = 0; map[50][51] = 0;
    const resource = (current: number, currentMax: number) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 6, world: "One", realm: "Underground 1",
      floor: { generatorVersion, seed: 1, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [{ id: "rat", kind: "enemy", name: "Cave Rat", x: 51, y: 50, hp: 1, maxHp: 1, damage: 0, xp: 8, awareness: 6, actionCooldown: 2, nextActionAt: 2 }] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 2, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, attributePoints: 3 },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(6, 6), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 2 } }, equipment: { weapons: [{ id: "stick", name: "Wooden Stick", group: "weapons", modifiers: { offense: 6 } }, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false },
      counters: { keys: 1, gold: 55 }, objective: "Find the exit", log: [],
    }));
  }, GENERATOR_VERSION);
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page);
  await expect(page.getByRole("heading", { name: "LEVEL UP", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Progression" })).toHaveCount(0);
});

test("@smoke keeps moving when Shift is added to a held direction", async ({ page }) => {
  await installCampaignFixture(page, (generatorVersion: string) => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1));
    for (let x = 50; x <= 60; x++) map[50][x] = 0;
    const resource = (current: number, currentMax: number) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 6, world: "One", realm: "Underground 1",
      floor: { generatorVersion, seed: 1, width: 100, height: 100, map, cells: map.map(row => row.map(tile => ({ walkable: tile === 0, role: "ground" }))), start: { x: 50, y: 50 }, time: 0, level: 1, entities: [] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, attributePoints: 0 },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(8, 8), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [{ id: "starter-stick", name: "Wooden Stick", group: "weapons", modifiers: { offense: 8 } }, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false },
      counters: { keys: 1, gold: 55 }, objective: "Find the exit", log: [],
    }));
  }, GENERATOR_VERSION);
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page);
  await expect(page.locator(".dev_settings output")).toHaveText(/FPS: [0-9]/);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(40);
  await page.keyboard.down("Shift");
  await page.waitForTimeout(170);
  await page.keyboard.up("Shift");
  await page.keyboard.up("ArrowRight");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time)).toBeGreaterThanOrEqual(3);
  const beforeSprintFirst = await page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time);
  await page.keyboard.down("Shift");
  await page.keyboard.down("ArrowRight");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time)).toBeGreaterThan(beforeSprintFirst);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("Shift");
});

test("@smoke opens a valid slot deep link and exposes map-fix controls only with its flag", async ({ page }) => {
  await installCampaignFixture(page, (generatorVersion: string) => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1)); map[50][50] = 0;
    const resource = (current: number, currentMax: number) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 6, world: "One", realm: "Underground 1",
      floor: { seed: 17, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, attributePoints: 0 },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(0, 0), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [null, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false },
      counters: { keys: 1, gold: 0 }, objective: "Find the exit", log: [],
    }));
  }, GENERATOR_VERSION);
  await page.goto("/blockchain-rogues-dungeon-game/?world=1&level=1&slot=1&seed=17&mute=1&debug-fix-map-autotiled=1");
  await expect(page.getByRole("heading", { name: "3 Saved Games" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Open Editable Copy" })).toBeVisible();
  await expect(page.getByText("Map Fix")).toBeVisible();
  await page.locator("input[type=file]").setInputFiles(path.resolve("rogues-dungeon/public/debug/fixtures/floor-17.tmj"));
  await expect(page.getByRole("alert")).toHaveCount(0);
});
