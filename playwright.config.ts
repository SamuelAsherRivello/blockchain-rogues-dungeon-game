import { defineConfig, devices } from "@playwright/test";

const host = "127.0.0.1";
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const basePath = "/blockchain-rogues-dungeon-game/";
const baseURL = `http://${host}:${port}${basePath}`;

export default defineConfig({
  testDir: "./rogues-dungeon/test/browser",
  outputDir: "output/playwright/",
  // Babylon Lite requires a real WebGPU device. Serial browser coverage avoids
  // competing device initialization across parallel Edge workers.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: process.env.PLAYWRIGHT_VIDEO === "1" ? "retain-on-failure" : "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], headless: process.env.PLAYWRIGHT_HEADED !== "1", launchOptions: { executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" } } },
    { name: "edge", use: { ...devices["Desktop Edge"], headless: process.env.PLAYWRIGHT_HEADED !== "1", launchOptions: { channel: "msedge" } } },
  ],
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER === "1" ? undefined : {
    command: `npm run dev -- --host ${host} --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
