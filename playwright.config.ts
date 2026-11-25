import { defineConfig, devices } from "@playwright/test";

const url = "http://127.0.0.1:3132";
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results/e2e",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 12000 },
  use: { ...devices["Desktop Chrome"], baseURL: url, trace: "retain-on-failure" },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3132",
    url,
    env: { RECIPE_MODE: "demo", RECIPE_BUILD_DIR: ".next-test-demo" },
    timeout: 120000,
  },
});
