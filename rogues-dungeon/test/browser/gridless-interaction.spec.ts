import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

test("Gridless interactions tween before consequences and retain turn costs", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const source = await readFile(new URL("./gridless-interaction-check.js", import.meta.url), "utf8");
  const verify = runInNewContext(`(${source.replaceAll("http://127.0.0.1:6080/blockchain-rogues-dungeon-game/", baseURL!)})`) as (page: Page) => Promise<{ errors: string[] }>;
  expect((await verify(page)).errors).toEqual([]);
});
