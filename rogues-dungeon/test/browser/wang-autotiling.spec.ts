import { expect, test } from "@playwright/test";
import { buildDungeonWangWalls } from "../../src/systems/rendering/tile-map-system.ts";
import { buildManualTileScenario } from "../../src/systems/procedural/manual-tile-scenarios.ts";
import { createRunCampaign } from "../../src/systems/procedural/world-procedural-system.ts";

for (const fixture of ["production-17", "production-914", "production-13579", "production-3266798470", "corridor-joins", "wang-topology-matrix", "wang-focus-widths", "wang-focus-bend", "wang-focus-t", "wang-focus-plus", "wang-focus-hole", "wang-focus-socket"]) {
  test(`@smoke production Wang artwork ${fixture}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    const scenario = !fixture.startsWith("production-");
    const seed = scenario ? 13579 : Number(fixture.split("-")[1]);
    const floor = scenario ? buildManualTileScenario(fixture, seed, 1)! : createRunCampaign(seed, 1, 1, 1, 1).floor;
    const expected = buildDungeonWangWalls({ cells: floor.cells }).walls;
    await page.goto(`/blockchain-rogues-dungeon-game/?mute=1&world=1&level=1&slot=1&run=1&seed=${seed}${scenario ? `&debug-fix-map-autotiled=1&scenario=${fixture}` : ""}`);
    await expect(page.locator(".game-screen")).toBeVisible();
    await expect(page.getByText(/requires WebGPU|WebGPU.*unavailable|WebGPU.*not supported/i)).toHaveCount(0);
    const world = page.locator(".world-view");
    await expect(world).toHaveAttribute("data-wang-diagnostics", "0", { timeout: 30000 });
    await expect(world).toHaveAttribute("data-wang-debug", "false");
    await expect(world.locator("canvas")).toHaveCount(1);
    const actual = JSON.parse((await world.getAttribute("data-wang-cells"))!) as typeof expected;
    if (fixture === "production-3266798470") {
      for (const [x, y, frame] of [[40, 47, 48], [54, 53, 48], [40, 54, 48], [45, 57, 48], [38, 47, 53], [46, 47, 53]]) {
        const cell = actual.find(entry => entry.x === x && entry.y === y);
        expect(cell?.frame, `reported corner ${x},${y}`).toBe(frame);
        expect(cell?.quarters).toBeUndefined();
      }
      await page.getByRole("combobox", { name: "Zoom", exact: true }).selectOption("1");
      await page.getByRole("button", { name: "Collapse primary information panel tab", exact: true }).click();
      await page.getByRole("button", { name: "Collapse secondary information panel tab", exact: true }).click();
      await expect.poll(async () => (await world.boundingBox())?.width ?? 0).toBeGreaterThan(1200);
      await world.screenshot({ path: info.outputPath("reported-corners-full-width.png"), animations: "disabled" });
    }
    if (fixture === "wang-topology-matrix") {
      for (const [x, y, frame] of [[7, 7, 0], [17, 7, 5], [17, 10, 17], [7, 17, 48], [17, 17, 53]]) expect(actual.find(cell => cell.x === x && cell.y === y)?.frame).toBe(frame);
    }
    for (const frame of [5, 17]) {
      const sample = expected.find(cell => cell.frame === frame && !cell.quarters);
      expect(sample, `fixture contains tile ${frame}`).toBeTruthy();
      expect(actual.find(cell => cell.x === sample!.x && cell.y === sample!.y)?.frame).toBe(frame);
    }
    expect(actual.map(({ x, y, frame, quarters }) => ({ x, y, frame, quarters }))).toEqual(expected.map(({ x, y, frame, quarters }) => ({ x, y, frame, quarters })));
    for (const zoom of fixture.startsWith("wang-focus-") ? ["1"] : ["0.25", "0.5", "1", "2", "4"]) {
      await page.getByRole("combobox", { name: "Zoom", exact: true }).selectOption(zoom);
      await expect(world).toHaveAttribute("data-wang-diagnostics", "0");
      await expect(page.getByText("Preparing the crypt...", { exact: true })).toHaveCount(0);
      await page.screenshot({ path: info.outputPath(`${fixture}-${zoom}.png`), animations: "disabled" });
    }
    expect(errors).toEqual([]);
  });
}
