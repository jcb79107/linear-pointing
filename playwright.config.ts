import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.UI_TEST_BASE_URL ?? "http://localhost:3002",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "webkit", use: { browserName: "webkit", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "tablet", use: { viewport: { width: 677, height: 1324 } } },
    {
      name: "phone",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command: "node tests/ui-fixture.mjs",
      url: "http://127.0.0.1:3005",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    ...(process.env.UI_TEST_BASE_URL
      ? []
      : [
          {
            command: process.env.UI_TEST_PRODUCTION ? "npm run start -- --port 3002" : "npm run dev -- --webpack --port 3002",
            url: "http://localhost:3002/demo",
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
        ]),
  ],
});
