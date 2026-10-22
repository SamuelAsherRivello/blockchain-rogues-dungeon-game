import { expect, test } from "@playwright/test";
import { buildDungeonWangWalls } from "../../src/systems/rendering/tile-map-system.ts";
import { buildManualTileScenario } from "../../src/systems/procedural/manual-tile-scenarios.ts";
import { createRunCampaign } from "../../src/systems/procedural/world-procedural-system.ts";

for (const fixture of ["production-17", "production-914", "production-13579", "production-42-level-3", "production-404-level-8", "production-777-level-12", "production-3266798470", "corridor-joins", "wang-topology-matrix", "wang-focus-widths", "wang-focus-bend", "wang-focus-t", "wang-focus-plus", "wang-focus-hole", "wang-focus-socket"]) {
  test(`@smoke production Wang artwork ${fixture}`, async ({ page }, info) => {
    await page.addInitScript(() => localStorage.setItem("rogues-dungeon.dev.zoom-test", "true"));
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    const scenario = !fixture.startsWith("production-");
    const seed = scenario ? 13579 : Number(fixture.split("-")[1]);
    const level = Number(fixture.split("-level-")[1] ?? 1);
    if (level > 1) await page.setViewportSize(level === 3 ? { width: 960, height: 720 } : level === 8 ? { width: 1600, height: 900 } : { width: 1920, height: 1080 });
    const floor = scenario ? buildManualTileScenario(fixture, seed, 1)! : createRunCampaign(seed, 1, 1, 1, level).floor;
    const expected = buildDungeonWangWalls({ cells: floor.cells }).walls;
    await page.goto(`/blockchain-rogues-dungeon-game/?mute=1&world=1&level=${level}&slot=1&run=1&seed=${seed}${scenario ? `&debug-fix-map-autotiled=1&scenario=${fixture}` : ""}`);
    await expect(page.locator(".game-screen")).toBeVisible();
    await expect(page.getByText(/requires WebGPU|WebGPU.*unavailable|WebGPU.*not supported/i)).toHaveCount(0);
    const world = page.locator(".world-view");
    await expect(world).toHaveAttribute("data-wang-diagnostics", "0", { timeout: 30000 });
    await expect(world).toHaveAttribute("data-wang-debug", "false");
    await expect(world.locator("canvas")).toHaveCount(1);
    const actual = JSON.parse((await world.getAttribute("data-wang-cells"))!) as typeof expected;
    if (fixture === "production-3266798470") {
      for (const [x, y, frame] of [[40, 47, 30], [54, 53, 30], [40, 54, 30], [45, 57, 30], [38, 47, 32], [46, 47, 32]]) {
        const cell = actual.find(entry => entry.x === x && entry.y === y);
        expect(cell?.frame, `reported corner ${x},${y}`).toBe(frame);
        expect(cell?.quarters).toBeUndefined();
      }
      await page.getByRole("combobox", { name: "Zoom", exact: true }).selectOption("1");
      await page.getByRole("button", { name: "Collapse primary information panel tab", exact: true }).click();
      await page.getByRole("button", { name: "Collapse secondary information panel tab", exact: true }).click();
      await expect.poll(async () => (await world.boundingBox())?.width ?? 0).toBeGreaterThan(1200);
      await world.screenshot({ path: info.outputPath("reported-corners-full-width.png"), animations: "disabled" });
      const rect = (await world.boundingBox())!;
      const samples = [[40, 47, 30], [54, 53, 30], [40, 54, 30], [45, 57, 30], [38, 47, 32], [46, 47, 32], [46, 54, 48], [58, 52, 53]];
      for (const [x, y] of samples) {
        await page.screenshot({ path: info.outputPath(`corner-${x}-${y}.png`), clip: { x: rect.x + rect.width / 2 + (x - floor.start.x) * 32 - 64, y: rect.y + rect.height / 2 + (y - floor.start.y) * 32 - 64, width: 128, height: 128 } });
      }
      const capture = (await world.screenshot()).toString("base64");
      const pixels = await page.evaluate(async ({ capture, samples, width, height, player }) => {
        const read = async (url: string) => {
          const image = new Image(); image.src = url; await image.decode();
          const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
          const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
          return { data: context.getImageData(0, 0, image.width, image.height).data, width: image.width };
        };
        const actual = await read(`data:image/png;base64,${capture}`);
        const source = await read("/blockchain-rogues-dungeon-game/assets/art/game-view/tilesets/art/tileset-dungeon.png");
        return samples.map(([x, y, tile]) => {
          const left = Math.round(width / 2 + (x - player.x) * 32 - 16);
          const top = Math.round(height / 2 + (y - player.y) * 32 - 16);
          let best = { compared: 0, mismatchRatio: 1, dx: 0, dy: 0 };
          // Element screenshots round fractional CSS bounds to device pixels.
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          let compared = 0; let mismatched = 0;
          for (let sy = 0; sy < 32; sy++) for (let sx = 0; sx < 32; sx++) {
            const expectedIndex = ((Math.floor(tile / 12) * 32 + sy) * source.width + tile % 12 * 32 + sx) * 4;
            if (source.data[expectedIndex + 3] !== 255) continue;
            const actualIndex = ((top + dy + sy) * actual.width + left + dx + sx) * 4;
            compared++;
            if ([0, 1, 2].some(channel => Math.abs(actual.data[actualIndex + channel] - source.data[expectedIndex + channel]) > 4)) mismatched++;
          }
          if (mismatched / compared < best.mismatchRatio) best = { compared, mismatchRatio: mismatched / compared, dx, dy };
          }
          return { x, y, tile, ...best };
        });
      }, { capture, samples, width: rect.width, height: rect.height, player: floor.start });
      await info.attach("corner-pixel-comparisons", { body: JSON.stringify(pixels, null, 2), contentType: "application/json" });
      for (const result of pixels) {
        expect(result.compared).toBeGreaterThan(100);
        expect(result.mismatchRatio, `actual rendered corner ${result.x},${result.y} matches source tile ${result.tile}`).toBeLessThan(0.02);
      }
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
