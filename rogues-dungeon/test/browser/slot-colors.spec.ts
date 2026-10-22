import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { expect, test, type Page } from "@playwright/test";

test("slot category strips, drop feedback, and shortcut contrast", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const source = await readFile(new URL("./slot-colors-check.js", import.meta.url), "utf8");
  const verify = runInNewContext(`(${source.replaceAll("http://127.0.0.1:6080/blockchain-rogues-dungeon-game/", baseURL!)})`) as (page: Page) => Promise<{ errors: string[] }>;
  expect((await verify(page)).errors).toEqual([]);
});
