import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

test("movement modes, Battle, detection, cursors and existing path preview", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  // Reuse the same assertions as the standalone Playwright CLI check.
  const source = await readFile(new URL("./movement-mode-check.js", import.meta.url), "utf8");
  const verify = runInNewContext(`(${source.replaceAll("http://127.0.0.1:6080/blockchain-rogues-dungeon-game/", baseURL!)})`) as (page: Page) => Promise<{ errors: string[] }>;
  const result = await verify(page);
  expect(result.errors).toEqual([]);
});

test("movement feedback: dropdown keyboard focus and centered Gridless mouse travel", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const source = await readFile(new URL("./movement-feedback-check.js", import.meta.url), "utf8");
  const verify = runInNewContext(`(${source.replaceAll("http://127.0.0.1:6080/blockchain-rogues-dungeon-game/", baseURL!)})`) as (page: Page) => Promise<{ errors: string[] }>;
  expect((await verify(page)).errors).toEqual([]);
});
