import { defineConfig, devices } from "@playwright/test";

const url = "http://127.0.0.1:3133";
export default defineConfig({
  testDir: "./tests/integration",
  outputDir: "./test-results/integration",
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: { ...devices["Desktop Chrome"], baseURL: url, trace: "retain-on-failure" },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3133",
    url: url + "/login",
    env: { RECIPE_MODE: "private", RECIPE_BUILD_DIR: ".next-test-private", APP_ORIGIN: url },
    timeout: 120000,
  },
});
