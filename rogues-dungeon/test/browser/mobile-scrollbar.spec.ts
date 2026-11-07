import { expect, test } from "@playwright/test";

test("mobile scrollbar supports finger dragging in landscape and rotated portrait", async ({ page, context }) => {
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await page.evaluate(async () => {
    const fixtureUrl = "/blockchain-rogues-dungeon-game/test/browser/fixtures/scroll-area.tsx";
    const { createElement, createRoot, ScrollArea } = await import(/* @vite-ignore */ fixtureUrl) as typeof import("./fixtures/scroll-area.tsx");
    const surface = document.createElement("div");
    surface.id = "browser_surface"; surface.dataset.platform = "mobile";
    const viewport = document.createElement("div"); viewport.id = "viewport"; viewport.dataset.layout = "mobile";
    Object.assign(viewport.style, { width: "240px", height: "240px" });
    surface.append(viewport); document.body.replaceChildren(surface);
    createRoot(viewport).render(createElement(ScrollArea, { className: "slot_scroll" }, ...Array.from({ length: 40 }, (_, i) => createElement("p", { key: i }, `Item ${i}`))));
  });
  const area = page.locator(".scroll-area__viewport");
  const track = page.locator(".scroll-area__track");
  const client = await context.newCDPSession(page);
  for (const size of [{ width: 800, height: 400 }, { width: 400, height: 800 }]) {
    await page.setViewportSize(size);
    await area.evaluate(el => { el.scrollTop = 0; });
    const box = (await track.boundingBox())!;
    expect(size.width > size.height ? box.width : box.height).toBe(4);
    expect(await track.locator(".scroll-area__thumb").evaluate(el => getComputedStyle(el, "::after").width)).toBe("36px");
    const rotated = size.height > size.width;
    const start = rotated ? { x: box.x + box.width - 10, y: box.y + box.height / 2 - 12 } : { x: box.x - 12, y: box.y + 10 };
    const end = rotated ? { x: box.x + box.width / 2, y: start.y } : { x: start.x, y: box.y + box.height / 2 };
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [end] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => area.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  }
});

