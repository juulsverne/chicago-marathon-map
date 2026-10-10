import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${PORT}`, colorScheme: "dark" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/chicago-marathon-map`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
