import { defineConfig, devices } from "@playwright/test";

// Performance gates, run against the production build: npm run test:perf.
// Kept apart from playwright.config.ts so the normal suite stays fast.

const PORT = 3300;

// Ask headless Chromium for the real GPU. Without one it draws WebGL in software
// (SwiftShader), a pessimistic floor; every test logs which renderer it got.
const GPU_ARGS = ["--enable-gpu", "--ignore-gpu-blocklist"];

export default defineConfig({
  testDir: "tests/perf",
  timeout: 120_000,
  workers: 1, // frame timing must not compete with other tests for the CPU or GPU
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${PORT}`, colorScheme: "dark", launchOptions: { args: GPU_ARGS } },
  projects: [
    // An iPhone 13 profile in Chromium, the browser whose CPU can be throttled.
    { name: "perf-phone", use: { ...devices["iPhone 13"], browserName: "chromium" } },
    { name: "perf-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/chicago-marathon-map`,
    // Never measure a server this config did not build: a stale build would pass or fail on old code.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
