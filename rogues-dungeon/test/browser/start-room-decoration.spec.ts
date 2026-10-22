import { expect, test } from "@playwright/test";
import { createCampaign } from "../../src/systems/procedural/world-procedural-system.ts";
import { installCampaignFixture, readSavedCampaign } from "./campaign-fixture.ts";
import { openSavedGame } from "./start-saved-game.ts";

test("renders a seeded start-room ring without minimap decoration", async ({ page }, info) => {
  const campaign = createCampaign(1);
  await installCampaignFixture(page, saved => localStorage.setItem("rogues-dungeon.slot.2", JSON.stringify(saved)), campaign);
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1&randomSeed=1");
  await openSavedGame(page, 2);
  const game = page.locator(".world-view");
  const minimap = page.locator(".minimap-view");
  await expect(game).toHaveAttribute("data-start-room-decorations", /[1-9][0-9]*/);
  await expect(minimap).not.toHaveAttribute("data-start-room-decorations", /.+/);
  const frames = JSON.parse((await game.getAttribute("data-start-room-decoration-frames"))!) as { x: number; y: number; frame: number }[];
  expect(frames.length).toBeGreaterThan(0);
  expect(frames.every(({ frame }) => [0, 1, 5, 12, 17, 48, 49, 53].includes(frame))).toBe(true);
  await expect(game.locator("canvas")).toBeVisible();
  const beforeReload = await readSavedCampaign(page, 2);
  await page.reload();
  await openSavedGame(page, 2);
  const resumedGame = page.locator(".world-view");
  await expect(resumedGame).toHaveAttribute("data-start-room-decoration-frames", JSON.stringify(frames));
  const resumed = await readSavedCampaign(page, 2);
  expect(resumed.player).toMatchObject({ x: beforeReload.player.x, y: beforeReload.player.y });
  const move = ([
    ["ArrowUp", 0, -1],
    ["ArrowDown", 0, 1],
    ["ArrowLeft", -1, 0],
    ["ArrowRight", 1, 0],
  ] as const).find(([, dx, dy]) => resumed.floor.cells[resumed.player.y + dy]?.[resumed.player.x + dx]?.walkable);
  if (!move) throw new Error("The start room must retain a walkable cardinal movement cell");
  const [key, dx, dy] = move;
  await page.keyboard.press(key);
  await expect.poll(async () => {
    const saved = await readSavedCampaign(page, 2);
    return { x: saved.player.x, y: saved.player.y };
  }).toEqual({ x: resumed.player.x + dx, y: resumed.player.y + dy });
  await game.screenshot({ path: info.outputPath("seed-1-start-room.png"), animations: "disabled" });
});
