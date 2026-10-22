import { readSlot } from "../../src/systems/persistence/save-system.ts";
import { expect, test, type Page } from "@playwright/test";
import { cardinalAdjacentPosition, compactCampaignForSave, createRunCampaign } from "../../src/systems/procedural/world-procedural-system.ts";

async function savedState(page: Page) {
  const raw = await page.evaluate(() => localStorage.getItem("rogues-dungeon.slot.2")!);
  return readSlot({ getItem: (key) => key === "rogues-dungeon.slot.2" ? raw : null, setItem: () => {}, removeItem: () => {} }, "2")!;
}

for (const movementMode of ["grid-snap", "gridless"] as const) {
  test(`home teleport closes, installs and reveals both directions in ${movementMode}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const campaign = createRunCampaign(0x51a7cafe, 2, 1, 1, 1, { level1TestMode: true });
    const arrow = campaign.floor.entities.find((entity) => entity.kind === "teleport-arrow")!;
    const start = cardinalAdjacentPosition(campaign.floor, arrow);
    campaign.player.x = start.x; campaign.player.y = start.y;
    campaign.player.pixel = { x: start.x * 32 + 16, y: start.y * 32 + 16 };
    const keys = (from: { x: number; y: number }, to: { x: number; y: number }) => to.x > from.x ? "ArrowRight" : to.x < from.x ? "ArrowLeft" : to.y > from.y ? "ArrowDown" : "ArrowUp";
    await page.addInitScript(({ save, movementMode }) => {
      // Developer test switches replace saves with fresh campaigns at startup.
      for (const key of ["leveltest", "enemytest", "itemtest"]) localStorage.setItem(`rogues-dungeon.dev.${key}`, "0");
      localStorage.setItem("rogues-dungeon.preferences.v1", JSON.stringify({ movementMode, zoom: 1, camera: "center", fullscreenDesired: false, sfxVolume: 0, musicVolume: 0, muteAll: true, urlArgs: false }));
      localStorage.setItem("rogues-dungeon.slot.2", JSON.stringify(save));
    }, { save: compactCampaignForSave(campaign), movementMode });
    await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
    await page.getByRole("button", { name: /Saved Game 2/ }).click();
    const world = page.locator(".world-view");
    await expect(world).toHaveAttribute("data-world-alive", "true", { timeout: 30_000 });
    await expect(world.locator("canvas")).toBeVisible();
    await expect(world).toHaveAttribute("data-player-x", String(start.x));
    await expect(world).toHaveAttribute("data-player-y", String(start.y));
    await expect(page.getByText("WebGPU is unavailable", { exact: false })).toHaveCount(0);

    for (const destination of ["player-home", "dungeon"]) {
      const before = await savedState(page);
      const target = before.floor.entities.find((entity: { kind: string }) => entity.kind === "teleport-arrow");
      if (!target) throw new Error(`Missing departure teleport for ${destination}.`);
      const originContext = await world.getAttribute("data-map-context");
      const direction = keys(before.player, target);
      // Record phases in the page so save hydration cannot miss a short iris phase.
      await page.evaluate(() => {
        const host = document.querySelector<HTMLElement>(".world-view")!;
        const frames: Array<{ phase: string; context: string; alive: string; ready: string; x: number; y: number; prefab: string; cutscene: boolean }> = [];
        const sample = () => {
          const iris = host.querySelector(".ui_iris_transition");
          frames.push({ phase: iris?.className.split("--")[1] ?? "open", context: host.dataset.mapContext!, alive: host.dataset.worldAlive!, ready: host.dataset.rendererReady!, x: Number(host.dataset.playerPixelX), y: Number(host.dataset.playerPixelY), prefab: JSON.parse(localStorage.getItem("rogues-dungeon.slot.2")!).activePrefab?.id ?? "dungeon", cutscene: Boolean(host.querySelector(".ui_cutscene_transition")) });
        };
        const observer = new MutationObserver(sample);
        observer.observe(host, { attributes: true, childList: true, subtree: true });
        sample();
        Object.assign(window, { teleportFrames: frames, stopTeleportObserver: () => observer.disconnect() });
      });
      await page.keyboard.down(direction);
      await expect(world).toHaveAttribute("data-map-context", new RegExp(`:${destination}$`), { timeout: 30_000 });
      await expect(world).toHaveAttribute("data-world-alive", "true", { timeout: 30_000 });
      await page.keyboard.up(direction);
      await expect(world.locator(".ui_iris_transition")).toHaveCount(0);
      const frames = await page.evaluate(() => {
        const scope = window as unknown as { teleportFrames: Array<{ phase: string; context: string; alive: string; ready: string; x: number; y: number; prefab: string; cutscene: boolean }>; stopTeleportObserver(): void };
        scope.stopTeleportObserver();
        return scope.teleportFrames;
      });
      expect(frames.some((frame) => frame.cutscene)).toBe(false);
      const closing = frames.findIndex((frame) => frame.phase === "closing");
      const closed = frames.findIndex((frame) => frame.phase === "closed");
      const installed = frames.findIndex((frame) => frame.context !== originContext);
      const opening = frames.findIndex((frame) => frame.phase === "opening");
      expect(closing).toBeGreaterThanOrEqual(0);
      expect(closed).toBeGreaterThan(closing);
      expect(installed).toBeGreaterThanOrEqual(closed);
      expect(opening).toBeGreaterThan(installed);
      expect(frames[closing]).toMatchObject({ context: originContext, alive: "false", x: target.x * 32 + 16, y: target.y * 32 + 16, prefab: before.activePrefab?.id ?? "dungeon" });
      expect(frames[opening]).toMatchObject({ alive: "false", ready: "true", prefab: destination });
      expect(frames.slice(closing, opening + 1).every((frame) => frame.alive === "false")).toBe(true);
      const arrival = await savedState(page);
      const anchor = destination === "dungeon" ? arrow : arrival.floor.entities.find((entity) => entity.kind === "teleport-arrow")!;
      expect(Math.abs(arrival.player.x - anchor.x) + Math.abs(arrival.player.y - anchor.y)).toBe(1);
      expect(arrival.player.pixel).toEqual({ x: arrival.player.x * 32 + 16, y: arrival.player.y * 32 + 16 });
      expect(arrival.floor.cells[arrival.player.y][arrival.player.x].walkable).toBe(true);
      expect(frames[opening]).toMatchObject({ x: arrival.player.pixel!.x, y: arrival.player.pixel!.y });
      await page.waitForTimeout(400);
      expect((await savedState(page)).player.pixel).toEqual(arrival.player.pixel);
      await page.screenshot({ path: `output/playwright/teleport-${movementMode}-${destination}.png`, fullPage: true });
    }
    // A fresh input must work once reveal completes.
    const returned = await savedState(page);
    await page.keyboard.down(keys(returned.player, arrow));
    await expect(world.locator(".ui_iris_transition")).toHaveClass(/--closing/, { timeout: 5000 });
    await page.keyboard.up(keys(returned.player, arrow));
    expect(errors).toEqual([]);
  });
}
