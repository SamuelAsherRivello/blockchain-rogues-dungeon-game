import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

test("gamepad left stick and D-pad obey movement modes, Battle and focus", async ({ page, baseURL }) => {
  test.setTimeout(180_000);
  const source = await readFile(new URL("./gamepad-check.js", import.meta.url), "utf8");
  const verify = runInNewContext(`(${source.replaceAll("http://127.0.0.1:6080/blockchain-rogues-dungeon-game/", baseURL!)})`) as (page: Page) => Promise<{ errors: string[] }>;
  expect((await verify(page)).errors).toEqual([]);
});

test("gamepad reticle switches with mouse movement and triggers use click actions", async ({ page, baseURL }) => {
  test.setTimeout(180_000);
  const source = await readFile(new URL("./gamepad-reticle-check.js", import.meta.url), "utf8");
  const verify = runInNewContext(`(${source.replaceAll("http://127.0.0.1:6080/blockchain-rogues-dungeon-game/", baseURL!)})`) as (page: Page) => Promise<{ errors: string[] }>;
  expect((await verify(page)).errors).toEqual([]);
});

test("left stick and D-pad bump objects and enemies in every movement mode", async ({ page, baseURL }) => {
  test.setTimeout(180_000);
  const source = await readFile(new URL("./gamepad-bump-check.js", import.meta.url), "utf8");
  const verify = runInNewContext(`(${source.replaceAll("http://127.0.0.1:6080/blockchain-rogues-dungeon-game/", baseURL!)})`) as (page: Page) => Promise<{ errors: string[] }>;
  expect((await verify(page)).errors).toEqual([]);
});
